import uuid
from sqlalchemy import Column, Float, String, Integer, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.database.session import Base

class ShotLocation(Base):
    __tablename__ = "shot_locations"

    id = Column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_id = Column(Uuid(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, unique=True)
    x_coordinate = Column(Float, nullable=False)
    y_coordinate = Column(Float, nullable=False)
    court_zone = Column(String, nullable=False) # e.g., "Left Corner 3", "Paint", "Restricted Area", etc.
    shot_value = Column(Integer, nullable=False) # 2 or 3

    # Relationships
    event = relationship("Event", back_populates="shot_location")
