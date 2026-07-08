from sqlalchemy.orm import Session
from app.models.team import Team
from app.schemas.team import TeamCreate
from uuid import UUID
from typing import List, Optional

class TeamRepository:
    @staticmethod
    def create(db: Session, team_in: TeamCreate) -> Team:
        db_team = Team(
            name=team_in.name,
            abbreviation=team_in.abbreviation,
            division=team_in.division
        )
        db.add(db_team)
        db.commit()
        db.refresh(db_team)
        return db_team

    @staticmethod
    def get(db: Session, team_id: UUID) -> Optional[Team]:
        return db.query(Team).filter(Team.id == team_id).first()

    @staticmethod
    def get_multi(
        db: Session, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Team]:
        return db.query(Team).offset(skip).limit(limit).all()
