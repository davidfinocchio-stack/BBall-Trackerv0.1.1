from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.schemas.team import Team
from app.schemas.tournament import Tournament
from app.schemas.lineup import Lineup
from app.schemas.event import Event

class GameBase(BaseModel):
    tournament_id: Optional[UUID] = None
    home_team_id: UUID
    away_team_id: UUID
    date: Optional[datetime] = None
    status: str = "SCHEDULED" # e.g. SCHEDULED, LIVE, COMPLETED
    court_name: Optional[str] = None
    referees: Optional[str] = None

class GameCreate(GameBase):
    pass

class GameInitRequest(BaseModel):
    home_team_id: UUID
    away_team_id: UUID
    tournament_id: Optional[UUID] = None
    tournament_name: Optional[str] = None
    court_name: Optional[str] = None
    referees: Optional[str] = None
    date: Optional[datetime] = None

class Game(GameBase):
    id: UUID

    model_config = ConfigDict(from_attributes=True)

class GameWithDetails(Game):
    home_team: Team
    away_team: Team
    tournament: Optional[Tournament] = None
    lineups: List[Lineup] = []
    events: List[Event] = []
