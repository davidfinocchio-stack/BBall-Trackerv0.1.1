from sqlalchemy.orm import Session
from app.models.game import Game
from app.schemas.game import GameCreate
from uuid import UUID
from typing import List, Optional

class GameRepository:
    @staticmethod
    def create(db: Session, game_in: GameCreate) -> Game:
        db_game = Game(
            tournament_id=game_in.tournament_id,
            home_team_id=game_in.home_team_id,
            away_team_id=game_in.away_team_id,
            date=game_in.date,
            status=game_in.status,
            court_name=game_in.court_name,
            referees=game_in.referees
        )
        db.add(db_game)
        db.commit()
        db.refresh(db_game)
        return db_game

    @staticmethod
    def get(db: Session, game_id: UUID) -> Optional[Game]:
        return db.query(Game).filter(Game.id == game_id).first()

    @staticmethod
    def delete(db: Session, game_id: UUID) -> bool:
        db_game = db.query(Game).filter(Game.id == game_id).first()
        if db_game:
            db.delete(db_game)
            db.commit()
            return True
        return False

    @staticmethod
    def update_status(db: Session, game_id: UUID, status: str) -> Optional[Game]:
        db_game = db.query(Game).filter(Game.id == game_id).first()
        if db_game:
            db_game.status = status
            db.add(db_game)
            db.commit()
            db.refresh(db_game)
        return db_game

    @staticmethod
    def get_multi(
        db: Session, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Game]:
        return db.query(Game).offset(skip).limit(limit).all()

    @staticmethod
    def create_event(
        db: Session,
        game_id: UUID,
        event_type: str,
        period: int,
        game_clock: str,
        team_id: Optional[UUID] = None,
        primary_player_id: Optional[UUID] = None,
        secondary_player_id: Optional[UUID] = None,
        metadata_json: Optional[dict] = None,
        shot_location_data: Optional[dict] = None
    ):
        from app.models.event import Event
        from app.models.shot_location import ShotLocation
        import uuid

        db_event = Event(
            id=uuid.uuid4(),
            game_id=game_id,
            event_type=event_type,
            period=period,
            game_clock=game_clock,
            team_id=team_id,
            primary_player_id=primary_player_id,
            secondary_player_id=secondary_player_id,
            metadata_json=metadata_json
        )
        db.add(db_event)
        db.flush()  # Generate ID and associate relationships safely
        
        if shot_location_data:
            db_shot = ShotLocation(
                id=uuid.uuid4(),
                event_id=db_event.id,
                x_coordinate=shot_location_data["x_coordinate"],
                y_coordinate=shot_location_data["y_coordinate"],
                court_zone=shot_location_data["court_zone"],
                shot_value=shot_location_data["shot_value"]
            )
            db.add(db_shot)
            
        db.commit()
        db.refresh(db_event)
        return db_event
