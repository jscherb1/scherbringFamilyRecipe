# Deployment Guide

This guide covers how to deploy the Recipe Planner application in different environments.

## Local Development

### Option 1: Development Servers (Recommended for Development)

1. **Start Backend:**
   ```bash
   cd backend
   python -m uvicorn main:app --reload --port 8000 --host 0.0.0.0
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Access:**
   - Frontend: http://localhost:5173 (or your Codespace URL)
   - Backend: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Option 2: Docker Compose

1. **For internal Docker networking:**
   ```bash
   docker-compose up -d
   ```

2. **For external access (Codespaces):**
   ```bash
   # Comment out the override in docker-compose.override.yml or use:
   docker-compose -f docker-compose.yml -f docker-compose.external.yml up -d
   ```

## Azure Deployment

### Prerequisites
- Two Azure Web Apps (one for frontend, one for backend)
- Container registries (Azure Container Registry recommended)

### Backend Deployment

1. **Build and push backend container:**
   ```bash
   cd backend
   docker build -t your-registry.azurecr.io/recipe-backend:latest .
   docker push your-registry.azurecr.io/recipe-backend:latest
   ```

2. **Set environment variables in Azure Web App:**
   ```
   AZURE_FRONTEND_URL=https://your-frontend-app.azurewebsites.net
   # Add your Cosmos DB and other secrets here
   ```

### Frontend Deployment

1. **Build with Azure backend URL:**
   ```bash
   cd frontend
   # Copy and modify the Azure environment file
   cp .env.azure .env.production
   # Edit .env.production with your actual backend URL
   # VITE_API_BASE_URL=https://your-backend-app.azurewebsites.net
   ```

2. **Build and push frontend container:**
   ```bash
   # Build the production version
   npm run build
   docker build -t your-registry.azurecr.io/recipe-frontend:latest .
   docker push your-registry.azurecr.io/recipe-frontend:latest
   ```

3. **Set environment variables in Azure Web App:**
   ```
   VITE_API_BASE_URL=https://your-backend-app.azurewebsites.net
   ```

## Environment Variables Reference

### Backend
- `FRONTEND_URL`: Custom frontend URL for CORS
- `AZURE_FRONTEND_URL`: Azure frontend web app URL for CORS
- `CODESPACE_NAME`: Auto-detected in Codespaces
- `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`: Auto-detected in Codespaces

### Frontend
- `VITE_API_BASE_URL`: Backend API URL (build-time)
- `REACT_APP_API_BASE_URL`: Backend API URL (runtime, for Docker)
- `VITE_AZURE_API_BASE_URL`: Azure backend URL (runtime)

## CORS Configuration

The backend automatically configures CORS for:
- `http://localhost:3000` (production frontend)
- `http://localhost:5173` (Vite dev server)
- `http://frontend:3000` (Docker internal)
- Codespaces URLs (auto-detected)
- Custom URLs via environment variables

## Troubleshooting

### CORS Errors
1. Check backend logs for CORS origins
2. Verify frontend is using correct API URL
3. Ensure environment variables are set correctly

### Frontend Can't Reach Backend
1. Check API URL in browser developer tools
2. Verify backend is accessible at that URL
3. Check firewall/security group settings in Azure

### Docker Issues
1. Use `docker-compose logs` to check container logs
2. Verify network connectivity with `docker-compose exec frontend wget -q -O - http://backend:8000/health`
3. Check port mappings with `docker-compose ps`
