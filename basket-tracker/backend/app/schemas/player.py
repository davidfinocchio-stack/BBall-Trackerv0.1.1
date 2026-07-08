from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

class PlayerBase(BaseModel):
    name: str
    jersey_number: Optional[int] = None
    position: Optional[str] = None
    height: Optional[str] = None
    weight: Optional[int] = None

class PlayerCreate(PlayerBase):
    team_id: Optional[UUID] = None

class Player(PlayerBase):
    id: UUID
    team_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)
