import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Uuid, Enum, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.models.enums import EventType

class Event(Base):
    __tablename__ = "events"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id = Column(Uuid(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(Enum(EventType), nullable=False)
    period = Column(Integer, nullable=False) # e.g. 1, 2, 3, 4, 5 (OT1)
    game_clock = Column(String, nullable=False) # e.g. "11:58", "00:04"
    team_id = Column(Uuid(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)
    primary_player_id = Column(Uuid(as_uuid=True), ForeignKey("players.id", ondelete="SET NULL"), nullable=True)
    secondary_player_id = Column(Uuid(as_uuid=True), ForeignKey("players.id", ondelete="SET NULL"), nullable=True)
    metadata_json = Column(JSON, nullable=True) # Extra unstructured metadata

    # Relationships
    game = relationship("Game", back_populates="events")
    team = relationship("Team")
    primary_player = relationship("Player", foreign_keys=[primary_player_id])
    secondary_player = relationship("Player", foreign_keys=[secondary_player_id])
    shot_location = relationship("ShotLocation", back_populates="event", uselist=False, cascade="all, delete-orphan")
