# GitHub Repository Setup Guide

This guide explains how to configure your GitHub repository for automated CI/CD deployment to Azure.

## Overview

The GitHub Actions workflow automatically:
1. 🔨 Builds Docker images for frontend and backend
2. 📦 Pushes images to Azure Container Registry
3. 🔄 Restarts both Azure Web Apps with the latest images

## Prerequisites

- Azure Web Apps for frontend and backend deployed
- Azure Container Registry configured
- Service Principal created for GitHub Actions

## Configuration Steps

### Configure GitHub Secrets

Navigate to your repository → **Settings** → **Secrets and variables** → **Actions** → **Secrets**

Add the following secrets (all configuration in one place):

| Secret Name | Description | Format Example | How to Get |
|------------|-------------|----------------|------------|
| `AZURE_CLIENT_ID` | Service Principal App ID | `12345678-1234-1234-1234-123456789012` | From `az ad sp create-for-rbac` output |
| `AZURE_CLIENT_SECRET` | Service Principal Password | `abcdef123456789...` | From `az ad sp create-for-rbac` output |
| `AZURE_TENANT_ID` | Azure Tenant ID | `87654321-4321-4321-4321-210987654321` | From `az ad sp create-for-rbac` output |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription ID | `11111111-2222-3333-4444-555555555555` | Run `az account show --query id -o tsv` |
| `ACR_NAME` | Container Registry Name | `mycompanyregistry` | Your ACR name (no .azurecr.io suffix) |
| `ACR_LOGIN_SERVER` | Container Registry Server | `mycompanyregistry.azurecr.io` | Your ACR login server (full domain) |
| `RESOURCE_GROUP` | Azure Resource Group | `recipe-app-prod-rg` | Your resource group name |
| `BACKEND_WEB_APP_NAME` | Backend Web App Name | `recipe-backend-prod` | Your backend app name (name only) |
| `FRONTEND_WEB_APP_NAME` | Frontend Web App Name | `recipe-frontend-prod` | Your frontend app name (name only) |

### Format Details

**GUID Format Examples:**
- All Azure IDs (Client, Tenant, Subscription) use GUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

**Resource Names:**
- `ACR_NAME`: Just the registry name, no domain (e.g., `myregistry` not `myregistry.azurecr.io`)
- `ACR_LOGIN_SERVER`: Full domain with `.azurecr.io` suffix
- `RESOURCE_GROUP`: The exact resource group name as it appears in Azure
- Web app names: Just the app name, not the full URL (e.g., `my-app` not `my-app.azurewebsites.net`)

### 2. Getting Your Resource Information

If you need to find your Azure resource information:

**Get your subscription ID:**
```bash
az account show --query id -o tsv
```

**Get your resource group name:**
```bash
az group list --query "[].name" -o table
```

**Get your web app names:**
```bash
# List all web apps in your resource group
az webapp list --resource-group <YOUR_RESOURCE_GROUP> --query "[].name" -o table

# Or list all web apps with their resource groups
az webapp list --query "[].{Name:name, ResourceGroup:resourceGroup}" -o table
```

**Get your container registry information:**
```bash
# List all container registries
az acr list --query "[].{Name:name, LoginServer:loginServer, ResourceGroup:resourceGroup}" -o table
```

### 3. Verify Configuration

After setting up the secrets and variables:

1. **Check the workflow file**: `.github/workflows/docker-build-push.yml`
2. **Test the setup**: Push a change to the `main` branch
3. **Monitor the workflow**: Go to **Actions** tab in your repository
4. **Check deployment**: Verify both web apps restart successfully

## Troubleshooting

### Common Issues

**Authentication Failed:**
- Verify service principal secrets are correct
- Check that the service principal has `acrpush` role on the container registry
- Ensure the service principal has `Contributor` role on the resource group

**Web App Restart Failed:**
- Verify web app names in repository variables
- Check that the service principal has access to restart web apps
- Ensure the resource group name is correct

**Variables Not Found:**
- Double-check variable names match exactly (case-sensitive)
- Ensure variables are set as repository variables, not secrets
- Verify the variables are accessible to the workflow

### Testing Commands

Test your service principal access:

```bash
# Login with service principal
az login --service-principal \
  -u $AZURE_CLIENT_ID \
  -p $AZURE_CLIENT_SECRET \
  --tenant $AZURE_TENANT_ID

# Test ACR access
az acr login --name $ACR_NAME

# Test web app access
az webapp list --resource-group $RESOURCE_GROUP
```

## 🔐 Service Principal Permissions Setup

### Required Permissions

Your service principal needs these permissions:

1. **ACR Push**: Already configured during service principal creation
2. **Web App Restart**: Additional permission needed

### Grant Web App Restart Permissions

**Option 1: Resource Group Level (Easier)**
```bash
# Get your resource group ID
RESOURCE_GROUP_ID=$(az group show --name <YOUR_RESOURCE_GROUP> --query id --output tsv)

# Grant Contributor role to the service principal
az role assignment create \
  --assignee <SERVICE_PRINCIPAL_APP_ID> \
  --role "Contributor" \
  --scope $RESOURCE_GROUP_ID
```

**Option 2: Individual Web Apps (More Secure)**
```bash
# Grant permission on backend web app
az role assignment create \
  --assignee <SERVICE_PRINCIPAL_APP_ID> \
  --role "Website Contributor" \
  --scope $(az webapp show --name <BACKEND_WEB_APP_NAME> --resource-group <RESOURCE_GROUP> --query id --output tsv)

# Grant permission on frontend web app  
az role assignment create \
  --assignee <SERVICE_PRINCIPAL_APP_ID> \
  --role "Website Contributor" \
  --scope $(az webapp show --name <FRONTEND_WEB_APP_NAME> --resource-group <RESOURCE_GROUP> --query id --output tsv)
```

## 🧪 Testing Before Deployment

### Manual Testing Commands

Test the exact commands that will run in GitHub Actions:

```bash
# Set your variables (replace with your actual values)
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"  
export AZURE_TENANT_ID="your-tenant-id"
export RESOURCE_GROUP="your-resource-group"
export BACKEND_WEB_APP_NAME="your-backend-app"
export FRONTEND_WEB_APP_NAME="your-frontend-app"
export ACR_NAME="your-acr-name"

# Login with service principal
az login --service-principal \
  -u $AZURE_CLIENT_ID \
  -p $AZURE_CLIENT_SECRET \
  --tenant $AZURE_TENANT_ID

# Test ACR login
az acr login --name $ACR_NAME

# Test web app restart commands
echo "🔄 Testing backend restart..."
az webapp restart --name $BACKEND_WEB_APP_NAME --resource-group $RESOURCE_GROUP

echo "🔄 Testing frontend restart..."
az webapp restart --name $FRONTEND_WEB_APP_NAME --resource-group $RESOURCE_GROUP

echo "✅ All tests completed successfully!"
```

### Verify Permissions

Check if your service principal has the right permissions:

```bash
# Check role assignments for the service principal
az role assignment list --assignee <SERVICE_PRINCIPAL_APP_ID> --output table

# Check specific web app permissions
az role assignment list --scope $(az webapp show --name <BACKEND_WEB_APP_NAME> --resource-group <RESOURCE_GROUP> --query id --output tsv) --output table
```

### Test Script

For convenience, use the provided test script:

```bash
# Set your environment variables first
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"  
export AZURE_TENANT_ID="your-tenant-id"
export RESOURCE_GROUP="your-resource-group"
export BACKEND_WEB_APP_NAME="your-backend-app"
export FRONTEND_WEB_APP_NAME="your-frontend-app"
export ACR_NAME="your-acr-name"

# Run the comprehensive test
./scripts/test-deployment.sh
```

This script will:
- ✅ Validate all environment variables are set
- 🔐 Test service principal authentication
- 📦 Test container registry access
- 🌐 Test web app access and permissions
- 🔄 Optionally test actual restart commands

### Test Script

Create a test script to validate everything works:

```bash
#!/bin/bash
# test-deployment.sh

set -e  # Exit on any error

echo "🧪 Testing GitHub Actions deployment commands..."

# Check if all variables are set
required_vars=("AZURE_CLIENT_ID" "AZURE_CLIENT_SECRET" "AZURE_TENANT_ID" "RESOURCE_GROUP" "BACKEND_WEB_APP_NAME" "FRONTEND_WEB_APP_NAME" "ACR_NAME")

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        exit 1
    fi
done

echo "✅ All required variables are set"

# Test Azure login
echo "🔐 Testing Azure login..."
az login --service-principal -u $AZURE_CLIENT_ID -p $AZURE_CLIENT_SECRET --tenant $AZURE_TENANT_ID

# Test ACR access
echo "📦 Testing ACR access..."
az acr login --name $ACR_NAME

# Test web app access
echo "🌐 Testing web app access..."
az webapp show --name $BACKEND_WEB_APP_NAME --resource-group $RESOURCE_GROUP --query "name" -o tsv
az webapp show --name $FRONTEND_WEB_APP_NAME --resource-group $RESOURCE_GROUP --query "name" -o tsv

# Test restart commands (dry run - just check if they would work)
echo "🔄 Testing restart commands..."
echo "Backend app status: $(az webapp show --name $BACKEND_WEB_APP_NAME --resource-group $RESOURCE_GROUP --query "state" -o tsv)"
echo "Frontend app status: $(az webapp show --name $FRONTEND_WEB_APP_NAME --resource-group $RESOURCE_GROUP --query "state" -o tsv)"

echo "✅ All tests passed! GitHub Actions should work correctly."
```

## Security Notes

- **Secrets**: Never commit secrets to your repository
- **Variables**: Variables are visible in logs, only use for non-sensitive data
- **Service Principal**: Use least privilege principle - only grant necessary permissions
- **Regular Rotation**: Rotate service principal credentials periodically

## Next Steps

After completing this setup:
1. Make a test change to your code
2. Push to the `main` branch  
3. Monitor the GitHub Actions workflow
4. Verify both web apps are updated with your changes

For more details on the deployment process, see [DEPLOYMENT.md](./DEPLOYMENT.md).
