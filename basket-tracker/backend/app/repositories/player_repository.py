from sqlalchemy.orm import Session
from app.models.player import Player
from app.schemas.player import PlayerCreate
from uuid import UUID
from typing import List, Optional

class PlayerRepository:
    @staticmethod
    def create(db: Session, player_in: PlayerCreate) -> Player:
        db_player = Player(
            name=player_in.name,
            jersey_number=player_in.jersey_number,
            position=player_in.position,
            height=player_in.height,
            weight=player_in.weight,
            team_id=player_in.team_id
        )
        db.add(db_player)
        db.commit()
        db.refresh(db_player)
        return db_player

    @staticmethod
    def get(db: Session, player_id: UUID) -> Optional[Player]:
        return db.query(Player).filter(Player.id == player_id).first()

    @staticmethod
    def get_multi(
        db: Session, 
        skip: int = 0, 
        limit: int = 100,
        position: Optional[str] = None,
        team_id: Optional[UUID] = None
    ) -> List[Player]:
        query = db.query(Player)
        if position:
            query = query.filter(Player.position == position)
        if team_id:
            query = query.filter(Player.team_id == team_id)
        return query.offset(skip).limit(limit).all()

    @staticmethod
    def update(db: Session, db_player: Player, player_in: PlayerCreate) -> Player:
        db_player.name = player_in.name
        db_player.jersey_number = player_in.jersey_number
        db_player.position = player_in.position
        db_player.height = player_in.height
        db_player.weight = player_in.weight
        db_player.team_id = player_in.team_id
        db.add(db_player)
        db.commit()
        db.refresh(db_player)
        return db_player

    @staticmethod
    def delete(db: Session, db_player: Player) -> Player:
        db.delete(db_player)
        db.commit()
        return db_player
