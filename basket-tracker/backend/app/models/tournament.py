import uuid
from sqlalchemy import Column, String, Uuid
from sqlalchemy.orm import relationship
from app.database.session import Base

class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=True)

    # Relationships
    games = relationship("Game", back_populates="tournament", cascade="all, delete-orphan")
