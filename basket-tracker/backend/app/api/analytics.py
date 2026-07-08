from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.services.analytics import get_league_leaders
from typing import Dict, List, Any

router = APIRouter()

@router.get("/leaders", response_model=Dict[str, List[Dict[str, Any]]])
def fetch_league_leaders(db: Session = Depends(get_db)):
    """
    Get the Top 5 league leaders across PPG, APG, RPG, and SPG.
    """
    return get_league_leaders(db)
