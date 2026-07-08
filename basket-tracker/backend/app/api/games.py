from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.repositories import GameRepository, TeamRepository, TournamentRepository
from app.schemas.game import Game, GameInitRequest, GameCreate, GameWithDetails
from app.schemas.tournament import TournamentCreate
from app.schemas.event import EventEnvelopeCreate, Event
from app.engine import event_engine, zones_engine
from app.engine.event_engine import DomainValidationError
from uuid import UUID
from typing import List, Optional

router = APIRouter()

@router.post("/init", response_model=Game, status_code=status.HTTP_201_CREATED)
def initialize_game(request: GameInitRequest, db: Session = Depends(get_db)):
    # 1. Validate home_team and away_team exist
    home_team = TeamRepository.get(db, team_id=request.home_team_id)
    if not home_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Home team with ID {request.home_team_id} does not exist."
        )
        
    away_team = TeamRepository.get(db, team_id=request.away_team_id)
    if not away_team:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Away team with ID {request.away_team_id} does not exist."
        )
        
    if request.home_team_id == request.away_team_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Home team and Away team must be different."
        )

    # 2. Register / Find Tournament
    tournament_id = request.tournament_id
    if not tournament_id and request.tournament_name:
        # Check if tournament with this name already exists
        tournaments = TournamentRepository.get_multi(db, limit=1000)
        existing_t = next((t for t in tournaments if t.name.lower() == request.tournament_name.lower()), None)
        if existing_t:
            tournament_id = existing_t.id
        else:
            # Create a new tournament
            new_t = TournamentRepository.create(
                db, 
                tournament_in=TournamentCreate(name=request.tournament_name, description="Auto-registered during game init")
            )
            tournament_id = new_t.id
    elif tournament_id:
        tournament = TournamentRepository.get(db, tournament_id=tournament_id)
        if not tournament:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tournament with ID {tournament_id} does not exist."
            )

    # 3. Create the game in SCHEDULED status
    game_create = GameCreate(
        tournament_id=tournament_id,
        home_team_id=request.home_team_id,
        away_team_id=request.away_team_id,
        date=request.date,
        status="SCHEDULED",
        court_name=request.court_name,
        referees=request.referees
    )
    
    return GameRepository.create(db, game_in=game_create)

@router.get("/", response_model=List[GameWithDetails])
def list_games(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return GameRepository.get_multi(db, skip=skip, limit=limit)

@router.post("/{game_id}/events", response_model=Event, status_code=status.HTTP_201_CREATED)
def create_game_event(
    game_id: UUID,
    envelope: EventEnvelopeCreate,
    db: Session = Depends(get_db)
):
    # 1. Validate game exists
    game = GameRepository.get(db, game_id=game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game with ID {game_id} does not exist."
        )

    # 2. Invoke business engine function to validate event telemetry
    # This raises DomainValidationError if invalid, which our exception handler returns as HTTP 400.
    event_engine.validate_event_telemetry(envelope.event_type, envelope.payload)

    # 3. Handle court zone resolution for shot events
    shot_location_data = None
    if envelope.event_type in ("SHOT_MADE", "SHOT_MISSED"):
        # Resolve x and y from payload (supporting "x", "y", "x_coordinate", "y_coordinate", "xCoord", "yCoord")
        x = envelope.payload.get("x")
        if x is None:
            x = envelope.payload.get("x_coordinate")
        if x is None:
            x = envelope.payload.get("xCoord")

        y = envelope.payload.get("y")
        if y is None:
            y = envelope.payload.get("y_coordinate")
        if y is None:
            y = envelope.payload.get("yCoord")

        try:
            x_val = float(x) if x is not None else None
            y_val = float(y) if y is not None else None
        except (TypeError, ValueError):
            raise DomainValidationError("Coordinates 'x' and 'y' must be valid floating-point numbers.")

        if x_val is None or y_val is None:
            raise DomainValidationError("Shot events require both 'x' and 'y' coordinates in the telemetry payload.")

        # Resolve court zone and shot value
        try:
            zone_info = zones_engine.get_court_zone(x_val, y_val)
        except ValueError as e:
            raise DomainValidationError(str(e))

        shot_location_data = {
            "x_coordinate": x_val,
            "y_coordinate": y_val,
            "court_zone": zone_info["zone"],
            "shot_value": zone_info["shot_value"]
        }

    # Helper function to parse UUID safely
    def safe_uuid(val) -> Optional[UUID]:
        if not val:
            return None
        try:
            return UUID(str(val))
        except ValueError:
            return None

    # Resolve IDs
    team_id = safe_uuid(envelope.team_context)
    if not team_id:
        team_id = safe_uuid(envelope.payload.get("team_id"))
    if not team_id:
        team_id = safe_uuid(envelope.payload.get("teamId"))

    primary_player_id = safe_uuid(envelope.payload.get("shooter_id"))
    if not primary_player_id:
        primary_player_id = safe_uuid(envelope.payload.get("player_id"))
    if not primary_player_id:
        primary_player_id = safe_uuid(envelope.payload.get("player_in_id"))
    if not primary_player_id:
        primary_player_id = safe_uuid(envelope.payload.get("playerInId"))
    if not primary_player_id:
        primary_player_id = safe_uuid(envelope.payload.get("primary_player_id"))

    secondary_player_id = safe_uuid(envelope.payload.get("player_out_id"))
    if not secondary_player_id:
        secondary_player_id = safe_uuid(envelope.payload.get("playerOutId"))
    if not secondary_player_id:
        secondary_player_id = safe_uuid(envelope.payload.get("secondary_player_id"))

    # Validate and cast the event type to the DB EventType enum
    from app.models.enums import EventType
    try:
        db_event_type = EventType(envelope.event_type)
    except ValueError:
        raise DomainValidationError(f"Invalid event_type: '{envelope.event_type}'")

    # Persist the GameEvent into the database via the GameRepository
    db_event = GameRepository.create_event(
        db=db,
        game_id=game_id,
        event_type=db_event_type,
        period=envelope.period,
        game_clock=envelope.timestamp,
        team_id=team_id,
        primary_player_id=primary_player_id,
        secondary_player_id=secondary_player_id,
        metadata_json=envelope.payload,
        shot_location_data=shot_location_data
    )

    return db_event


@router.get("/{game_id}/boxscore")
def get_game_boxscore(game_id: UUID, db: Session = Depends(get_db)):
    """
    Fetch raw events for a game, sort chronologically, and aggregate into a
    dynamic advanced Boxscore and Shot Chart visualization dataset.
    """
    # 1. Fetch game to validate existence
    game = GameRepository.get(db, game_id=game_id)
    if not game:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Game with ID {game_id} does not exist."
        )

    # 2. Query all events for the game
    from app.models.event import Event
    events = db.query(Event).filter(Event.game_id == game_id).all()

    # 3. Sort events chronologically (period ASC, clock descending MM:SS)
    def parse_clock(clock_str: str) -> int:
        if not clock_str:
            return 0
        try:
            parts = clock_str.split(":")
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
        except Exception:
            pass
        return 0

    events_sorted = sorted(events, key=lambda e: (e.period, -parse_clock(e.game_clock)))

    # 4. Run calculations through stats engine
    from app.engine.stats_engine import compute_game_boxscore
    boxscore = compute_game_boxscore(
        events=events_sorted,
        home_team=game.home_team,
        away_team=game.away_team
    )

    # 5. Extract shot locations for Shot Chart projection
    shots = []
    for e in events_sorted:
        ev_type = e.event_type
        if hasattr(ev_type, "value"):
            ev_type = ev_type.value

        if ev_type in ("SHOT_MADE", "SHOT_MISSED"):
            shot_loc = e.shot_location
            if shot_loc:
                shots.append({
                    "id": str(shot_loc.id),
                    "event_id": str(e.id),
                    "x": shot_loc.x_coordinate,
                    "y": shot_loc.y_coordinate,
                    "court_zone": shot_loc.court_zone,
                    "shot_value": shot_loc.shot_value,
                    "made": ev_type == "SHOT_MADE",
                    "player_name": e.primary_player.name if e.primary_player else "Unknown Player",
                    "player_id": str(e.primary_player_id) if e.primary_player_id else None
                })

    boxscore["shots"] = shots
    return boxscore


@router.put("/{game_id}/status/{status}", response_model=Game)
def update_game_status(game_id: UUID, status: str, db: Session = Depends(get_db)):
    updated_game = GameRepository.update_status(db, game_id=game_id, status=status)
    if not updated_game:
        raise HTTPException(
            status_code=404,
            detail=f"Game with ID {game_id} not found."
        )
    return updated_game


@router.delete("/{game_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_game(game_id: UUID, db: Session = Depends(get_db)):
    success = GameRepository.delete(db, game_id=game_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail=f"Game with ID {game_id} not found."
        )
    return



