from pydantic import BaseModel, ConfigDict
from typing import Optional, Any
from uuid import UUID
from app.models.enums import EventType
from app.schemas.shot_location import ShotLocation, ShotLocationCreate

class EventBase(BaseModel):
    event_type: EventType
    period: int
    game_clock: str
    metadata_json: Optional[Any] = None

class EventCreate(EventBase):
    game_id: UUID
    team_id: Optional[UUID] = None
    primary_player_id: Optional[UUID] = None
    secondary_player_id: Optional[UUID] = None
    shot_location: Optional[ShotLocationCreate] = None

class EventEnvelopeCreate(BaseModel):
    timestamp: str
    period: int
    team_context: Optional[str] = None
    event_type: str
    payload: dict

class Event(EventBase):
    id: UUID
    game_id: UUID
    team_id: Optional[UUID] = None
    primary_player_id: Optional[UUID] = None
    secondary_player_id: Optional[UUID] = None
    shot_location: Optional[ShotLocation] = None

    model_config = ConfigDict(from_attributes=True)
