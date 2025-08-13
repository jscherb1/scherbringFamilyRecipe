#!/bin/bash

set -e  # Exit immediately on error

echo "🔑 Logging into ACR..."
./scripts/login-acr.sh

echo "🐍 Building and pushing backend (FastAPI)..."
./scripts/build-and-push-backend.sh

echo "⚛️  Building and pushing frontend (React)..."
./scripts/build-and-push-frontend.sh

echo "✅ All images built and pushed successfully."
