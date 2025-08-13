#!/bin/bash

# Replace with your actual ACR name
ACR_NAME="scherbringfastapi"

IMAGE_NAME="$ACR_NAME.azurecr.io/backend:latest"

echo "Building backend image..."
docker build -t $IMAGE_NAME ./backend

echo "Pushing backend image to ACR..."
docker push $IMAGE_NAME
