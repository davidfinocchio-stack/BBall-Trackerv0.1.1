from fastapi import APIRouter
from app.api.players import router as players_router
from app.api.teams import router as teams_router
from app.api.games import router as games_router
from app.api.analytics import router as analytics_router

router = APIRouter()

@router.get("/health", tags=["System"])
def check_health():
    """
    Sub-router health check endpoint (v1).
    """
    return {"status": "ok", "api_version": "v1"}

router.include_router(players_router, prefix="/players", tags=["Players"])
router.include_router(teams_router, prefix="/teams", tags=["Teams"])
router.include_router(games_router, prefix="/games", tags=["Games"])
router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
