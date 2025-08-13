import os
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    cosmos_endpoint: str = os.getenv("COSMOS_ENDPOINT", "")
    cosmos_key: str = os.getenv("COSMOS_KEY", "")
    cosmos_db_name: str = os.getenv("COSMOS_DB_NAME", "RecipeApp")
    
    # Feature flags
    feature_ai: bool = os.getenv("FEATURE_AI", "false").lower() == "true"
    feature_import: bool = os.getenv("FEATURE_IMPORT", "false").lower() == "true"
    
    # CORS origins
    cors_origins: list[str] = [
        "http://localhost:3000",
        "https://*.app.github.dev",
        "https://*.preview.app.github.dev"
    ]
    
    class Config:
        env_file = ".env"

settings = Settings()
