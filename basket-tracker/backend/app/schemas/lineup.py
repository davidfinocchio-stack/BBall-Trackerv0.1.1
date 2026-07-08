from pydantic import BaseModel, ConfigDict
from typing import List
from uuid import UUID
from app.schemas.player import Player

class LineupBase(BaseModel):
    game_id: UUID
    team_id: UUID

class LineupCreate(LineupBase):
    player_ids: List[UUID]

class Lineup(LineupBase):
    id: UUID
    players: List[Player] = []

    model_config = ConfigDict(from_attributes=True)
