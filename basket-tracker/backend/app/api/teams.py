from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database.session import get_db
from app.repositories import TeamRepository
from app.schemas.team import Team, TeamCreate
from app.schemas.player import Player
from uuid import UUID
from typing import List

router = APIRouter()

@router.post("/", response_model=Team, status_code=status.HTTP_201_CREATED)
def create_team(team_in: TeamCreate, db: Session = Depends(get_db)):
    try:
        return TeamRepository.create(db, team_in=team_in)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A team with this name or abbreviation already exists. Please choose a unique name and abbreviation."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.get("/", response_model=List[Team])
def list_teams(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return TeamRepository.get_multi(db, skip=skip, limit=limit)

@router.get("/{id}/roster", response_model=List[Player])
def get_team_roster(id: UUID, db: Session = Depends(get_db)):
    db_team = TeamRepository.get(db, team_id=id)
    if not db_team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team with ID {id} not found."
        )
    return db_team.players
