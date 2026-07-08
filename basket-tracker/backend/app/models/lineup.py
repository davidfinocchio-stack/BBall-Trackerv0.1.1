import uuid
from sqlalchemy import Column, ForeignKey, Uuid, Table
from sqlalchemy.orm import relationship
from app.database.session import Base

# Association table between Lineup and Player (Many-to-Many)
lineup_player_association = Table(
    "lineup_players",
    Base.metadata,
    Column("lineup_id", Uuid(as_uuid=True), ForeignKey("lineups.id", ondelete="CASCADE"), primary_key=True),
    Column("player_id", Uuid(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), primary_key=True),
)

class Lineup(Base):
    __tablename__ = "lineups"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    game_id = Column(Uuid(as_uuid=True), ForeignKey("games.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(Uuid(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False)

    # Relationships
    game = relationship("Game", back_populates="lineups")
    team = relationship("Team")
    players = relationship("Player", secondary=lineup_player_association)
