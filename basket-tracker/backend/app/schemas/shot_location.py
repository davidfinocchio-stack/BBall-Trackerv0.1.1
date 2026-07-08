from pydantic import BaseModel, Field, ConfigDict
from uuid import UUID

class ShotLocationBase(BaseModel):
    x_coordinate: float
    y_coordinate: float
    court_zone: str
    shot_value: int = Field(..., ge=2, le=3)

class ShotLocationCreate(ShotLocationBase):
    pass

class ShotLocation(ShotLocationBase):
    id: UUID
    event_id: UUID

    model_config = ConfigDict(from_attributes=True)
