from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from uuid import UUID
from app.schemas.player import Player

class TeamBase(BaseModel):
    name: str
    abbreviation: str
    division: Optional[str] = "División A"

class TeamCreate(TeamBase):
    pass

class Team(TeamBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)

class TeamWithPlayers(Team):
    players: List[Player] = []
