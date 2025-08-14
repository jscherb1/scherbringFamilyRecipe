from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import logging
from contextlib import asynccontextmanager

from app.config import settings
from app.repositories.cosmos_client import cosmos_client
from app.api import recipes, tags, mealplans, profile

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Reduce Azure SDK logging verbosity
azure_loggers = [
    'azure',
    'azure.core.pipeline.policies.http_logging_policy',
    'azure.storage.blob',
    'azure.cosmos'
]
for azure_logger_name in azure_loggers:
    azure_logger = logging.getLogger(azure_logger_name)
    azure_logger.setLevel(logging.WARNING)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting up...")
    try:
        cosmos_client.connect()
        logger.info("Connected to Cosmos DB")
    except Exception as e:
        logger.error(f"Failed to connect to Cosmos DB: {e}")
        # For development, continue without Cosmos DB
        logger.warning("Continuing without Cosmos DB connection")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    cosmos_client.disconnect()

app = FastAPI(
    title="Recipe Planner API",
    description="Personal recipe management and meal planning application",
    version="1.0.0",
    lifespan=lifespan
)

# Configure response model to use aliases
app.openapi_version = "3.0.2"

# Dynamic CORS origins
def get_cors_origins():
    origins = [
        "http://localhost:3000",   # Local development (production frontend)
        "http://localhost:5173",   # Local development (Vite dev server)
        "http://frontend:3000",    # Docker compose service name
    ]
    
    # Add Codespaces URLs if in Codespaces environment
    codespace_name = os.getenv('CODESPACE_NAME')
    github_domain = os.getenv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')
    
    if codespace_name and github_domain:
        # Add both production and dev server ports for Codespaces
        codespace_3000 = f"https://{codespace_name}-3000.{github_domain}"
        codespace_5173 = f"https://{codespace_name}-5173.{github_domain}"
        origins.extend([codespace_3000, codespace_5173])
        logger.info(f"Added Codespaces URLs: {codespace_3000}, {codespace_5173}")
    
    # Add environment-specific origins
    frontend_url = os.getenv('FRONTEND_URL')
    if frontend_url:
        origins.append(frontend_url)
        logger.info(f"Added frontend URL from environment: {frontend_url}")
    
    # For Azure deployment - these will be set via environment variables
    azure_frontend_url = os.getenv('AZURE_FRONTEND_URL')
    if azure_frontend_url:
        origins.append(azure_frontend_url)
        logger.info(f"Added Azure frontend URL: {azure_frontend_url}")
    
    return origins

# Configure CORS
cors_origins = get_cors_origins()
logger.info(f"CORS origins: {cors_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(recipes.router)
app.include_router(tags.router)
app.include_router(mealplans.router)
app.include_router(profile.router)

@app.get("/")
def root():
    return {
        "message": "Recipe Planner API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "cosmos_connected": cosmos_client.client is not None
    }