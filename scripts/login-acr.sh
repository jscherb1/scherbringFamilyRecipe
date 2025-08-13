#!/bin/bash

# Replace with your actual ACR name
ACR_NAME="scherbringfastapi"

echo "Logging in to ACR: $ACR_NAME.azurecr.io"
az acr login --name $ACR_NAME
