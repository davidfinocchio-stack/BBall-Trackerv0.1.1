import uuid
from sqlalchemy import Column, String, Uuid
from sqlalchemy.orm import relationship
from app.database.session import Base

class Team(Base):
    __tablename__ = "teams"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True, unique=True)
    abbreviation = Column(String, nullable=False, unique=True)
    division = Column(String, nullable=True, default="División A")

    # Relationships
    players = relationship("Player", back_populates="team", cascade="all, delete-orphan")
