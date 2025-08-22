# Quick Setup Commands

This file contains all the commands you need to gather information for GitHub secrets configuration.

## 1. Create Service Principal

```bash
# Replace <ACR_NAME> with your container registry name
az ad sp create-for-rbac --name "github-acr-push" --role acrpush --scopes $(az acr show --name <ACR_NAME> --query id --output tsv)
```

Save the output! You'll need:
- `appId` → `AZURE_CLIENT_ID`
- `password` → `AZURE_CLIENT_SECRET`
- `tenant` → `AZURE_TENANT_ID`

## 2. Get Additional Information

```bash
# Get subscription ID
az account show --query id -o tsv
# This becomes: AZURE_SUBSCRIPTION_ID

# Get resource group name (if you forgot)
az group list --query "[].name" -o table

# Get web app names
az webapp list --resource-group <YOUR_RESOURCE_GROUP> --query "[].name" -o table

# Get container registry information
az acr list --query "[].{Name:name, LoginServer:loginServer}" -o table
```

## 3. Grant Web App Restart Permissions

**Option A: Resource Group Level (Easier)**
```bash
# Replace placeholders with your actual values
RESOURCE_GROUP_ID=$(az group show --name <YOUR_RESOURCE_GROUP> --query id --output tsv)
az role assignment create \
  --assignee <SERVICE_PRINCIPAL_APP_ID> \
  --role "Contributor" \
  --scope $RESOURCE_GROUP_ID
```

**Option B: Individual Apps (More Secure)**
```bash
# Backend app permission
az role assignment create \
  --assignee <SERVICE_PRINCIPAL_APP_ID> \
  --role "Website Contributor" \
  --scope $(az webapp show --name <BACKEND_WEB_APP_NAME> --resource-group <RESOURCE_GROUP> --query id --output tsv)

# Frontend app permission
az role assignment create \
  --assignee <SERVICE_PRINCIPAL_APP_ID> \
  --role "Website Contributor" \
  --scope $(az webapp show --name <FRONTEND_WEB_APP_NAME> --resource-group <RESOURCE_GROUP> --query id --output tsv)
```

## 4. Test Configuration

```bash
# Set all your environment variables
export AZURE_CLIENT_ID="your-client-id"
export AZURE_CLIENT_SECRET="your-client-secret"
export AZURE_TENANT_ID="your-tenant-id"
export RESOURCE_GROUP="your-resource-group"
export BACKEND_WEB_APP_NAME="your-backend-app"
export FRONTEND_WEB_APP_NAME="your-frontend-app"
export ACR_NAME="your-acr-name"

# Run the test script
./scripts/test-deployment.sh
```

## 5. GitHub Secrets to Configure

In GitHub repository → Settings → Secrets and variables → Actions → Secrets:

| Secret Name | Value Source | Format Example |
|------------|--------------|----------------|
| `AZURE_CLIENT_ID` | Service Principal `appId` | `12345678-1234-1234-1234-123456789012` |
| `AZURE_CLIENT_SECRET` | Service Principal `password` | `abcdef123456789...` |
| `AZURE_TENANT_ID` | Service Principal `tenant` | `87654321-4321-4321-4321-210987654321` |
| `AZURE_SUBSCRIPTION_ID` | From `az account show` | `11111111-2222-3333-4444-555555555555` |
| `ACR_NAME` | Your registry name | `mycompanyregistry` |
| `ACR_LOGIN_SERVER` | Your registry server | `mycompanyregistry.azurecr.io` |
| `RESOURCE_GROUP` | Your resource group | `recipe-app-prod-rg` |
| `BACKEND_WEB_APP_NAME` | Your backend app name | `recipe-backend-prod` |
| `FRONTEND_WEB_APP_NAME` | Your frontend app name | `recipe-frontend-prod` |

## Ready to Deploy!

Once all secrets are configured and tests pass, push to the `main` branch to trigger automated deployment! 🚀
