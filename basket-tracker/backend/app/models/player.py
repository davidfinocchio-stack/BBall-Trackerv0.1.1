import uuid
from sqlalchemy import Column, String, Integer, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.database.session import Base

class Player(Base):
    __tablename__ = "players"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    jersey_number = Column(Integer, nullable=True)
    position = Column(String, nullable=True)
    height = Column(String, nullable=True)
    weight = Column(Integer, nullable=True)
    team_id = Column(Uuid(as_uuid=True), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    team = relationship("Team", back_populates="players")
