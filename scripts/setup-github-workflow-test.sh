#!/bin/bash
# setup-github-workflow-test.sh
# Set up environment variables that EXACTLY match GitHub workflow secrets

echo "🔧 GitHub Workflow Test Environment Setup"
echo "=========================================="
echo ""
echo "Set these environment variables to match your GitHub secrets:"
echo ""

# Based on your actual Azure resources (from our earlier discoveries)
cat << 'EOF'
# COPY AND PASTE THESE COMMANDS, REPLACING THE VALUES:

# Azure Authentication (from your service principal creation)
export AZURE_CLIENT_ID="your-service-principal-app-id-here"
export AZURE_CLIENT_SECRET="your-service-principal-password-here"
export AZURE_TENANT_ID="your-azure-tenant-id-here"
export AZURE_SUBSCRIPTION_ID="6c8e23df-4aec-4ed5-bec5-79853ea6c6c6"  # Your subscription

# Azure Container Registry (choose the right one for your project)
export ACR_NAME="scherbringrecipeappacr"  # Most likely this one
export ACR_LOGIN_SERVER="scherbringrecipeappacr.azurecr.io"

# Azure Resources (confirmed from your environment)
export RESOURCE_GROUP="rg-scherbring-recipe-app"
export BACKEND_WEB_APP_NAME="rg-recipe-app-backend"
export FRONTEND_WEB_APP_NAME="scherbring-recipe-app-frontend"

# After setting all variables, run:
./scripts/test-github-workflow.sh
EOF

echo ""
echo "💡 To find your service principal information:"
echo "   az ad sp list --display-name \"github-acr-push\" --query \"[].{DisplayName:displayName, AppId:appId}\" -o table"
echo ""
echo "💡 To get your tenant ID:"
echo "   az account show --query tenantId -o tsv"
echo ""
echo "💡 Your subscription ID is already shown above from our earlier discovery"
