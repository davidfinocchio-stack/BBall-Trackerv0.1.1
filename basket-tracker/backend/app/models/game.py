import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.database.session import Base

class Game(Base):
    __tablename__ = "games"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tournament_id = Column(Uuid(as_uuid=True), ForeignKey("tournaments.id", ondelete="SET NULL"), nullable=True)
    home_team_id = Column(Uuid(as_uuid=True), ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False)
    away_team_id = Column(Uuid(as_uuid=True), ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False)
    date = Column(DateTime, nullable=True)
    status = Column(String, nullable=False, default="SCHEDULED") # e.g. SCHEDULED, LIVE, COMPLETED
    court_name = Column(String, nullable=True)
    referees = Column(String, nullable=True) # e.g. names of referees separated by commas or JSON

    # Relationships
    tournament = relationship("Tournament", back_populates="games")
    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])
    
    events = relationship("Event", back_populates="game", cascade="all, delete-orphan")
    lineups = relationship("Lineup", back_populates="game", cascade="all, delete-orphan")
