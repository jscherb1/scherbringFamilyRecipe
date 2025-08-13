from fastapi import FastAPI, Request
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

# Debug middleware to log requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response

# Dynamic CORS origins
def get_cors_origins():
    origins = ["http://localhost:3000"]  # Local development
    
    # Add Codespaces URL if in Codespaces environment
    codespace_name = os.getenv('CODESPACE_NAME')
    github_domain = os.getenv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')
    
    if codespace_name and github_domain:
        codespace_url = f"https://{codespace_name}-3000.{github_domain}"
        origins.append(codespace_url)
    
    # Allow any *.app.github.dev domain (common Codespaces pattern)
    origins.extend([
        "https://*.app.github.dev",
        "https://*.preview.app.github.dev"
    ])
    
    return origins

# Configure CORS
cors_origins = get_cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
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