from typing import List, Union
import os
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Basket Tracker Analytics"
    
    # SQLite Database Configuration
    SQLALCHEMY_DATABASE_URL: str = "sqlite:///./basket_tracker.db"

    # Demo Data Configuration
    ENABLE_DEMO_DATA: bool = False

    @field_validator("ENABLE_DEMO_DATA", mode="before")
    @classmethod
    def validate_enable_demo_data(cls, v: Union[bool, str, None]) -> bool:
        if v is None:
            return False
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            val = v.strip().lower()
            if val in ("true", "1", "yes", "on"):
                return True
        return False

    # CORS Origins configuration
    BACKEND_CORS_ORIGINS: List[str] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        origins_env = os.getenv("ALLOWED_ORIGINS") or os.getenv("BACKEND_CORS_ORIGINS")
        
        if origins_env:
            if isinstance(origins_env, str):
                if origins_env.startswith("["):
                    import json
                    try:
                        parsed = json.loads(origins_env)
                        if isinstance(parsed, list):
                            return [str(o).strip() for o in parsed if o]
                    except Exception:
                        pass
                return [i.strip() for i in origins_env.split(",") if i.strip()]
            elif isinstance(origins_env, list):
                return [str(o).strip() for o in origins_env if o]
        
        # Default fallback for local development
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
