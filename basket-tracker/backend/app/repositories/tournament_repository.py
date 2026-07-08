from sqlalchemy.orm import Session
from app.models.tournament import Tournament
from app.schemas.tournament import TournamentCreate
from uuid import UUID
from typing import List, Optional

class TournamentRepository:
    @staticmethod
    def create(db: Session, tournament_in: TournamentCreate) -> Tournament:
        db_tournament = Tournament(
            name=tournament_in.name,
            description=tournament_in.description
        )
        db.add(db_tournament)
        db.commit()
        db.refresh(db_tournament)
        return db_tournament

    @staticmethod
    def get(db: Session, tournament_id: UUID) -> Optional[Tournament]:
        return db.query(Tournament).filter(Tournament.id == tournament_id).first()

    @staticmethod
    def get_multi(
        db: Session, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Tournament]:
        return db.query(Tournament).offset(skip).limit(limit).all()
