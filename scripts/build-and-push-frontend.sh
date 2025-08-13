#!/bin/bash

# Replace with your actual ACR name
ACR_NAME="scherbringfastapi"

IMAGE_NAME="$ACR_NAME.azurecr.io/frontend:latest"

echo "Building frontend image..."
docker build -t $IMAGE_NAME ./frontend

echo "Pushing frontend image to ACR..."
docker push $IMAGE_NAME
