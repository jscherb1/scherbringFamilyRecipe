#!/bin/bash
# setup-test-vars.sh
# Helper script to set environment variables for testing

echo "🔧 Setting up environment variables for deployment testing..."

# Replace these with your actual values from Azure and GitHub secrets
# You can get these from your service principal creation output or Azure portal

echo "📝 Please edit this file and replace the placeholder values with your actual values:"
echo ""

# AZURE AUTHENTICATION (from service principal creation)
export AZURE_CLIENT_ID="your-service-principal-app-id-here"
export AZURE_CLIENT_SECRET="your-service-principal-password-here" 
export AZURE_TENANT_ID="your-azure-tenant-id-here"

# AZURE RESOURCES (based on your terminal output, adjust as needed)
export RESOURCE_GROUP="rg-scherbring-recipe-app"
export BACKEND_WEB_APP_NAME="rg-recipe-app-backend"
export FRONTEND_WEB_APP_NAME="your-frontend-app-name-here"  # Replace with actual frontend app name

# CONTAINER REGISTRY
export ACR_NAME="your-acr-name-here"  # Just the name, no .azurecr.io

echo "Environment variables set! Here's what you have:"
echo "================================================"
echo "AZURE_CLIENT_ID: $AZURE_CLIENT_ID"
echo "AZURE_CLIENT_SECRET: [HIDDEN]"
echo "AZURE_TENANT_ID: $AZURE_TENANT_ID"
echo "RESOURCE_GROUP: $RESOURCE_GROUP"
echo "BACKEND_WEB_APP_NAME: $BACKEND_WEB_APP_NAME"
echo "FRONTEND_WEB_APP_NAME: $FRONTEND_WEB_APP_NAME"
echo "ACR_NAME: $ACR_NAME"
echo "================================================"
echo ""
echo "Now you can run: ./scripts/test-deployment.sh"
