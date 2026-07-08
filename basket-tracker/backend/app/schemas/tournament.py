from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID

class TournamentBase(BaseModel):
    name: str
    description: Optional[str] = None

class TournamentCreate(TournamentBase):
    pass

class Tournament(TournamentBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)
