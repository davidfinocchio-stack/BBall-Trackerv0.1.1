import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
from app.core.config import settings
from app.engine import DomainValidationError
from app.database.session import Base, engine, SessionLocal

# Ensure database tables are created on startup (SQLite)
Base.metadata.create_all(bind=engine)

def seed_database():
    db = SessionLocal()
    try:
        from app.models.team import Team
        from app.models.player import Player
        from app.models.game import Game
        from app.models.tournament import Tournament
        from datetime import datetime
        import uuid

        # Check if database is already seeded
        if db.query(Team).first() is not None:
            return

        print("Seeding database with default teams, players, and games...")

        # 1. Create Tournament
        tournament = Tournament(
            id=uuid.uuid4(),
            name="NBA Summer Showcase",
            description="Pre-season summer exhibition and tracking test fixture"
        )
        db.add(tournament)
        db.flush()

        # 2. Create Boston Celtics (BOS)
        boston = Team(
            id=uuid.uuid4(),
            name="Boston Celtics",
            abbreviation="BOS"
        )
        db.add(boston)
        db.flush()

        bos_players = [
            {"name": "Jayson Tatum", "jersey": 0, "pos": "SF", "ht": "6'8\"", "wt": 210},
            {"name": "Jaylen Brown", "jersey": 7, "pos": "SG", "ht": "6'6\"", "wt": 223},
            {"name": "Kristaps Porzingis", "jersey": 8, "pos": "C", "ht": "7'2\"", "wt": 240},
            {"name": "Derrick White", "jersey": 9, "pos": "PG", "ht": "6'4\"", "wt": 190},
            {"name": "Jrue Holiday", "jersey": 4, "pos": "PG", "ht": "6'4\"", "wt": 205}
        ]
        for p in bos_players:
            db.add(Player(
                id=uuid.uuid4(),
                name=p["name"],
                jersey_number=p["jersey"],
                position=p["pos"],
                height=p["ht"],
                weight=p["wt"],
                team_id=boston.id
            ))

        # 3. Create Golden State Warriors (GSW)
        gsw = Team(
            id=uuid.uuid4(),
            name="Golden State Warriors",
            abbreviation="GSW"
        )
        db.add(gsw)
        db.flush()

        gsw_players = [
            {"name": "Stephen Curry", "jersey": 30, "pos": "PG", "ht": "6'2\"", "wt": 185},
            {"name": "Klay Thompson", "jersey": 11, "pos": "SG", "ht": "6'6\"", "wt": 220},
            {"name": "Andrew Wiggins", "jersey": 22, "pos": "SF", "ht": "6'7\"", "wt": 197},
            {"name": "Draymond Green", "jersey": 23, "pos": "PF", "ht": "6'6\"", "wt": 230},
            {"name": "Kevon Looney", "jersey": 5, "pos": "C", "ht": "6'9\"", "wt": 222}
        ]
        for p in gsw_players:
            db.add(Player(
                id=uuid.uuid4(),
                name=p["name"],
                jersey_number=p["jersey"],
                position=p["pos"],
                height=p["ht"],
                weight=p["wt"],
                team_id=gsw.id
            ))

        # 4. Create an active/completed test Game
        game = Game(
            id=uuid.uuid4(),
            tournament_id=tournament.id,
            home_team_id=boston.id,
            away_team_id=gsw.id,
            date=datetime.now(),
            status="LIVE",
            court_name="TD Garden, Boston",
            referees="Scott Foster, Tony Brothers, Marc Davis"
        )
        db.add(game)
        db.commit()
        print("Database seeding completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if settings.ENABLE_DEMO_DATA:
    seed_database()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Professional basketball tracking and analytics platform backend",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

@app.exception_handler(DomainValidationError)
def domain_validation_exception_handler(request: Request, exc: DomainValidationError):
    return JSONResponse(
        status_code=400,
        content={"detail": exc.message},
    )

# Configure CORS for frontend interaction
if settings.BACKEND_CORS_ORIGINS:
    allow_origins = [str(origin) for origin in settings.BACKEND_CORS_ORIGINS]
    allow_credentials = True
    if "*" in allow_origins:
        allow_credentials = False
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include API Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Health check route
@app.get("/health", tags=["Health"])
def health_check():
    """
    Health check endpoint returning the status of the API server.
    """
    return {"status": "ok"}

if __name__ == "__main__":
    import os
    is_prod = os.getenv("NODE_ENV") == "production"
    port = int(os.getenv("PORT", os.getenv("BACKEND_PORT", 8000)))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=not is_prod)
