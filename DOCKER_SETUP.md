# Docker Setup for Recipe Planner

This project can be run using Docker Compose for easy setup and deployment.

## Quick Start

1. **Start the application:**
   ```bash
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

## Configuration

### Environment Variables

- **Backend**: Configure in `backend/.env`
- **Frontend**: Configure in `frontend/.env` or use `docker-compose.override.yml`

### CORS Configuration

The backend is configured to allow requests from:
- `http://localhost:3000` (local development)
- `http://frontend:3000` (Docker internal network)
- Codespaces URLs (automatic detection)

### Network Setup

The containers communicate using a Docker bridge network:
- Service name: `backend` (accessible at `http://backend:8000` from frontend container)
- Service name: `frontend` (accessible at `http://frontend:3000` from backend container)

## Troubleshooting

### CORS Issues

If you see CORS errors:

1. Check that both containers are running:
   ```bash
   docker-compose ps
   ```

2. Check backend logs:
   ```bash
   docker-compose logs backend
   ```

3. Verify CORS origins in backend logs - you should see:
   ```
   INFO:main:CORS origins: ['http://localhost:3000', 'http://frontend:3000', ...]
   ```

### Frontend not connecting to backend

1. Check the environment configuration:
   ```bash
   docker-compose exec frontend cat /app/dist/env-config.js
   ```

2. Test network connectivity:
   ```bash
   docker-compose exec frontend wget -q -O - http://backend:8000/health
   ```

### For External Access (Codespaces)

If accessing from Codespaces or external URLs, the `docker-compose.override.yml` file automatically configures the frontend to use `http://localhost:8000` instead of the internal Docker network address.

## Development

For development with live reloading:

1. **Backend**: Volumes are mounted, so code changes trigger auto-reload
2. **Frontend**: Rebuild the frontend container when making changes:
   ```bash
   docker-compose build frontend
   docker-compose up -d frontend
   ```

## Build and Deploy

To build for production:

```bash
# Build all images
docker-compose build

# Push to registry (update registry URL in scripts)
./scripts/build-and-push-all.sh
```
