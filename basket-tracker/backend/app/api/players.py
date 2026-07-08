from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database.session import get_db
from app.repositories import PlayerRepository, TeamRepository
from app.schemas.player import Player, PlayerCreate
from uuid import UUID
from typing import List, Optional

router = APIRouter()

@router.post("/", response_model=Player, status_code=status.HTTP_201_CREATED)
def create_player(player_in: PlayerCreate, db: Session = Depends(get_db)):
    if player_in.team_id:
        team = TeamRepository.get(db, team_id=player_in.team_id)
        if not team:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Team with ID {player_in.team_id} does not exist."
            )
    try:
        return PlayerRepository.create(db, player_in=player_in)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A player with this name, jersey number, or other constraint conflict already exists on this team."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create player: {str(e)}"
        )

@router.get("/", response_model=List[Player])
def list_players(
    position: Optional[str] = None,
    team_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return PlayerRepository.get_multi(
        db, skip=skip, limit=limit, position=position, team_id=team_id
    )

@router.put("/{id}", response_model=Player)
def update_player(id: UUID, player_in: PlayerCreate, db: Session = Depends(get_db)):
    db_player = PlayerRepository.get(db, player_id=id)
    if not db_player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with ID {id} not found."
        )
    if player_in.team_id:
        team = TeamRepository.get(db, team_id=player_in.team_id)
        if not team:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Team with ID {player_in.team_id} does not exist."
            )
    try:
        return PlayerRepository.update(db, db_player=db_player, player_in=player_in)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update player due to database constraint violation (e.g. unique constraint)."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update player: {str(e)}"
        )

@router.delete("/{id}", response_model=Player)
def delete_player(id: UUID, db: Session = Depends(get_db)):
    db_player = PlayerRepository.get(db, player_id=id)
    if not db_player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with ID {id} not found."
        )
    return PlayerRepository.delete(db, db_player=db_player)

@router.get("/{id}/analytics")
def get_player_analytics_endpoint(id: UUID, db: Session = Depends(get_db)):
    from app.services.analytics import get_player_percentiles
    db_player = PlayerRepository.get(db, player_id=id)
    if not db_player:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with ID {id} not found."
        )
    return get_player_percentiles(db, id)
