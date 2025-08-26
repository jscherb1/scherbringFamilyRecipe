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
    
    # Azure AI Foundry settings
    azure_ai_endpoint: str = ""
    azure_ai_api_key: str = ""
    azure_ai_api_version: str = "2024-02-01"
    azure_ai_deployment_name: str = ""
    azure_ai_dalle_deployment_name: str = ""
    
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
        
        # Azure AI Foundry settings
        self.azure_ai_endpoint = os.getenv("AZURE_AI_ENDPOINT", "")
        self.azure_ai_api_key = os.getenv("AZURE_AI_API_KEY", "")
        self.azure_ai_api_version = os.getenv("AZURE_AI_API_VERSION", "2024-02-01")
        self.azure_ai_deployment_name = os.getenv("AZURE_AI_DEPLOYMENT_NAME", "")
        self.azure_ai_dalle_deployment_name = os.getenv("AZURE_AI_DALLE_DEPLOYMENT_NAME", "")
        
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
