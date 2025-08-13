from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os

app = FastAPI()

# Debug middleware to log requests
@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"Request: {request.method} {request.url}")
    print(f"Headers: {dict(request.headers)}")
    print(f"Origin: {request.headers.get('origin', 'No origin header')}")
    response = await call_next(request)
    print(f"Response status: {response.status_code}")
    return response

# Dynamic CORS origins
def get_cors_origins():
    origins = ["http://localhost:3000","https://bookish-bassoon-v64r7pv56v7fp7wq-3000.app.github.dev"]  # Local development
    
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
cors_origins = [
    "http://localhost:3000",
    "https://bookish-bassoon-v64r7pv56v7fp7wq-3000.app.github.dev"
]

# Add dynamic Codespaces URL if available
codespace_name = os.getenv('CODESPACE_NAME')
github_domain = os.getenv('GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN')
if codespace_name and github_domain:
    codespace_url = f"https://{codespace_name}-3000.{github_domain}"
    if codespace_url not in cors_origins:
        cors_origins.append(codespace_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Specific origins when using credentials
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

@app.get("/")
def root(name: str = "Guest"):
    response = JSONResponse(
        content={"message": f"Hello World! Welcome {name}"}
    )
    # Add headers to prevent caching
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response