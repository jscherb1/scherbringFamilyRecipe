import os
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    cosmos_endpoint: str = ""
    cosmos_key: str = ""
    cosmos_db_name: str = "RecipeApp"
    
    # Feature flags
    feature_ai: bool = False
    feature_import: bool = False
    
    # CORS origins
    cors_origins: list[str] = [
        "http://localhost:3000",
        "https://*.app.github.dev",
        "https://*.preview.app.github.dev"
    ]
    
    class Config:
        env_file = ".env"
        extra = "ignore"  # Ignore extra fields in .env file

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Load from environment variables with fallbacks
        self.cosmos_endpoint = os.getenv("COSMOS_ENDPOINT", "")
        self.cosmos_key = os.getenv("COSMOS_KEY", "")
        self.cosmos_db_name = os.getenv("COSMOS_DB_NAME", "RecipeApp")
        
        # Feature flags
        self.feature_ai = os.getenv("FEATURE_AI", "false").lower() == "true"
        self.feature_import = os.getenv("FEATURE_IMPORT", "false").lower() == "true"

# Storage settings - using direct env vars to avoid pydantic validation issues
def get_storage_account_name():
    return os.getenv("AZURE_STORAGE_ACCOUNT_NAME") or os.getenv("STORAGE_ACCOUNT_NAME", "")

def get_storage_account_key():
    return os.getenv("AZURE_STORAGE_ACCOUNT_KEY") or os.getenv("STORAGE_ACCOUNT_KEY", "")

def get_storage_container_name():
    return os.getenv("AZURE_STORAGE_CONTAINER_NAME") or os.getenv("STORAGE_CONTAINER_NAME", "recipe-images")

settings = Settings()
