#!/bin/bash

# Azure Storage Setup Script for Recipe App
# This script helps create and configure Azure Storage for recipe images

set -e

echo "🍳 Recipe App - Azure Storage Setup"
echo "======================================"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo "❌ Azure CLI is not installed. Please install it first:"
    echo "   https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi

# Check if user is logged in
if ! az account show &> /dev/null; then
    echo "🔐 Please log in to Azure CLI:"
    az login
fi

echo ""
echo "Current Azure subscription:"
az account show --query "{name:name, id:id}" -o table

echo ""
read -p "Continue with this subscription? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please run 'az account set --subscription <subscription-id>' to change subscription"
    exit 1
fi

# Get configuration from user
echo ""
echo "📝 Configuration"
echo "================"

read -p "Resource Group name (or create new): " RESOURCE_GROUP
read -p "Storage Account name (must be globally unique): " STORAGE_ACCOUNT
read -p "Location (e.g., eastus, westus2): " LOCATION
read -p "Container name [recipe-images]: " CONTAINER_NAME
CONTAINER_NAME=${CONTAINER_NAME:-recipe-images}

echo ""
echo "Summary:"
echo "- Resource Group: $RESOURCE_GROUP"
echo "- Storage Account: $STORAGE_ACCOUNT"
echo "- Location: $LOCATION"
echo "- Container: $CONTAINER_NAME"

echo ""
read -p "Create these resources? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled"
    exit 1
fi

echo ""
echo "🚀 Creating Azure Resources"
echo "==========================="

# Create resource group if it doesn't exist
if ! az group show --name $RESOURCE_GROUP &> /dev/null; then
    echo "Creating resource group: $RESOURCE_GROUP"
    az group create --name $RESOURCE_GROUP --location $LOCATION
else
    echo "Resource group already exists: $RESOURCE_GROUP"
fi

# Create storage account
echo "Creating storage account: $STORAGE_ACCOUNT"
if az storage account create \
    --name $STORAGE_ACCOUNT \
    --resource-group $RESOURCE_GROUP \
    --location $LOCATION \
    --sku Standard_LRS \
    --kind StorageV2 \
    --access-tier Hot; then
    echo "✅ Storage account created successfully"
else
    echo "❌ Failed to create storage account (may already exist)"
fi

# Get storage account key
echo "Getting storage account key..."
STORAGE_KEY=$(az storage account keys list \
    --resource-group $RESOURCE_GROUP \
    --account-name $STORAGE_ACCOUNT \
    --query '[0].value' -o tsv)

# Create container
echo "Creating blob container: $CONTAINER_NAME"
az storage container create \
    --name $CONTAINER_NAME \
    --account-name $STORAGE_ACCOUNT \
    --account-key $STORAGE_KEY \
    --public-access blob

echo ""
echo "✅ Setup Complete!"
echo "=================="

echo ""
echo "Add these environment variables to your .env file:"
echo ""
echo "STORAGE_ACCOUNT_NAME=$STORAGE_ACCOUNT"
echo "STORAGE_ACCOUNT_KEY=$STORAGE_KEY"
echo "STORAGE_CONTAINER_NAME=$CONTAINER_NAME"

echo ""
echo "Next steps:"
echo "1. Copy the environment variables above to backend/.env"
echo "2. Test the configuration: cd backend && python test_storage.py"
echo "3. Start your application and test image uploads!"

echo ""
echo "Storage account URL: https://$STORAGE_ACCOUNT.blob.core.windows.net"
echo "Container URL: https://$STORAGE_ACCOUNT.blob.core.windows.net/$CONTAINER_NAME"
