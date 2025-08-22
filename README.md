# 🚀 FastAPI + React Template

> 🎯 **Purpose**: A complete fullstack web development template featuring a **React** frontend and **FastAPI** backend, ready for rapid development and deployment.

---

## 📥 Getting Started

### Clone the Repository
```bash
git clone https://github.com/jscherb1/fastApi-React.git
```

---

## 🛠️ Development Environment

### 💻 Recommended Coding Environment

**GitHub Codespaces** (Recommended) - Comes pre-configured with:
- 🐳 Docker
- 📝 Git
- 🔧 Development tools

> ⚠️ **Note**: This setup has not been tested for local environments! Local installation requirements may vary.

### 🔌 Recommended VS Code Extensions

- 🤖 **GitHub Copilot** - AI pair programming
- 🐍 **Python** - Python language support

---

## 🏃‍♂️ Local Development

### 🔐 Environment Configuration
Create your environment file using the provided template:
```bash
# Use .env.example files as reference to create your .env file
cp .env.example .env
# Set the appropriate variables for your environment
```

### 🐳 Running with Docker
Launch both frontend and backend containers:
```bash
docker-compose up
```
This command will:
- 🔨 Build the Docker images
- ▶️ Start both frontend and backend containers
- 🔗 Set up container networking

### ⚠️ Important: Port Configuration
After starting the containers:

> **🚨 Critical Step**: Change the backend port (default: `8000`) to **Public visibility** in your development environment. Without this change, the frontend container cannot communicate with the backend container.

---

## ☁️ Azure Deployment

> 📋 **Deployment Target**: Azure Container Services with App Services

### 🔧 Prerequisites

Install Azure CLI:
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```
This enables Azure operations from the command line.

### 🏗️ Required Azure Resources

| Resource Type | Purpose |
|---------------|---------|
| 📦 **Azure Container Registry** | Store container images |
| 🌐 **Web App (Frontend)** | Host React application |
| ⚙️ **Web App (Backend)** | Host FastAPI application |

### 📋 Deployment Steps

#### 1️⃣ Create Resource Group
```bash
# Create a new resource group for your application
az group create --name <YOUR_RESOURCE_GROUP> --location <YOUR_LOCATION>
```

#### 2️⃣ Deploy Azure Container Registry
```bash
# Create container registry to store your images
az acr create --resource-group <YOUR_RESOURCE_GROUP> --name <YOUR_ACR_NAME> --sku Basic
```

#### 3️⃣ Deploy Web Apps
Create both frontend and backend web apps:

**Frontend Web App:**
```bash
# Create web app with container deployment and Linux OS
az webapp create --resource-group <YOUR_RESOURCE_GROUP> --plan <YOUR_APP_SERVICE_PLAN> --name <FRONTEND_APP_NAME> --deployment-container-image-name nginx
```

**Backend Web App:**
```bash
# Create web app with container deployment and Linux OS  
az webapp create --resource-group <YOUR_RESOURCE_GROUP> --plan <YOUR_APP_SERVICE_PLAN> --name <BACKEND_APP_NAME> --deployment-container-image-name nginx
```

#### 4️⃣ Configure Resources

**📱 Web App Configuration (Both Apps):**
- ✅ Enable SCM Basic Auth Publishing
- 🔐 Enable System Assigned Identity
- 🔧 Set environment variables for your application

**📦 Container Registry Configuration:**
- 👤 **IAM Access Control**: Assign `AcrPull` role to web app managed identities
- 🎯 **Target**: App Service managed identities created in previous step

#### 5️⃣ Push Containers to Registry
Build and push your container images (see [Build Scripts](#-build-and-push-containers) section below)

#### 6️⃣ Connect Web Apps to Containers

**🖱️ Portal Method:**
1. Navigate to **Deployment Center** in each web app
2. Select **Azure Container Registry** as source
3. Choose **Managed Identity** authentication
4. Select **System Assigned** identity
5. Enter image name and tag (e.g., `latest`)

**💻 Command Line Method:**

**Backend Configuration:**
> ⚠️ Set the appropriate variables before running!

```bash
echo "🔄 Updating backend container settings..."
az webapp config container set \
  --name $BACKEND_WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name $ACR_LOGIN_SERVER/backend:latest \
  --docker-registry-server-url https://$ACR_LOGIN_SERVER
```

**Frontend Configuration:**
> ⚠️ Set the appropriate variables before running!

```bash
echo "🔄 Updating frontend container settings..."
az webapp config container set \
  --name $FRONTEND_WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --docker-custom-image-name $ACR_LOGIN_SERVER/frontend:latest \
  --docker-registry-server-url https://$ACR_LOGIN_SERVER
```

#### 7️⃣ Restart Web Applications

**🖱️ Portal Method:**
Manually restart each web app in the Azure Portal (takes a few minutes to pull new images)

**💻 Command Line Method:**

**Restart Backend:**
> ⚠️ Set the appropriate variables before running!

```bash
echo "🔄 Restarting backend web app..."
az webapp restart --name $BACKEND_WEB_APP_NAME --resource-group $RESOURCE_GROUP
```

**Restart Frontend:**
> ⚠️ Set the appropriate variables before running!

```bash
echo "🔄 Restarting frontend web app..."
az webapp restart --name $FRONTEND_WEB_APP_NAME --resource-group $RESOURCE_GROUP
```

---

## 🔐 GitHub Configuration

> 📋 **Quick Setup**: See [GITHUB_SETUP.md](./GITHUB_SETUP.md) for a detailed step-by-step configuration guide.

### 👤 Create Service Principal

Create a service principal for automated deployments:
```bash
az ad sp create-for-rbac --name "github-acr-push" --role acrpush --scopes $(az acr show --name <ACR_NAME> --query id --output tsv)
```
> 📝 Replace `<ACR_NAME>` with your Azure Container Registry name

**Example Output:**
```json
{
  "appId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "displayName": "github-acr-push", 
  "password": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenant": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```
> 🔒 **Important**: Save this output securely - you'll need these values for GitHub secrets!

### 🔑 Grant Additional Permissions for Web App Restart

The service principal needs permission to restart web apps. Add the **Contributor** role on your resource group:

```bash
# Get your resource group ID
RESOURCE_GROUP_ID=$(az group show --name <YOUR_RESOURCE_GROUP> --query id --output tsv)

# Grant Contributor role to the service principal
az role assignment create \
  --assignee <SERVICE_PRINCIPAL_APP_ID> \
  --role "Contributor" \
  --scope $RESOURCE_GROUP_ID
```

> 📝 Replace `<YOUR_RESOURCE_GROUP>` with your resource group name and `<SERVICE_PRINCIPAL_APP_ID>` with the `appId` from the service principal creation output.

**Alternative (More Restrictive - Recommended):**
For better security, you can grant permissions only on specific web apps:

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


### 🔑 GitHub Secrets Configuration

#### 📋 Required Values Collection

| Secret Name | Source | Command | Format Example |
|------------|--------|---------|----------------|
| `AZURE_CLIENT_ID` | Service Principal `appId` | From output above | `12345678-1234-1234-1234-123456789012` (GUID) |
| `AZURE_CLIENT_SECRET` | Service Principal `password` | From output above | `abcdef123456...` (Random string) |
| `AZURE_TENANT_ID` | Service Principal `tenant` | From output above | `87654321-4321-4321-4321-210987654321` (GUID) |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription | `az account show --query id -o tsv` | `11111111-2222-3333-4444-555555555555` (GUID) |
| `ACR_NAME` | Container Registry | Your ACR name | `mycompanyregistry` (Name only, no .azurecr.io) |
| `ACR_LOGIN_SERVER` | Container Registry | Your ACR login server | `mycompanyregistry.azurecr.io` (Full URL) |
| `RESOURCE_GROUP` | Azure Resource Group | Your resource group name | `recipe-app-prod-rg` (Resource group name) |
| `BACKEND_WEB_APP_NAME` | Backend Web App | Your backend app name | `recipe-backend-prod` (Web app name only) |
| `FRONTEND_WEB_APP_NAME` | Frontend Web App | Your frontend app name | `recipe-frontend-prod` (Web app name only) |

#### ➕ Adding Secrets to GitHub

1. 🔗 Navigate to your GitHub repository
2. ⚙️ Go to **Settings** → **Secrets and variables** → **Actions**
3. 🆕 Click **"New repository secret"** for each value:

| Secret Name | Value Source | Format |
|------------|--------------|--------|
| `AZURE_CLIENT_ID` | Service principal `appId` | GUID format |
| `AZURE_CLIENT_SECRET` | Service principal `password` | Random string |
| `AZURE_TENANT_ID` | Service principal `tenant` | GUID format |
| `AZURE_SUBSCRIPTION_ID` | Output from `az account show` | GUID format |
| `ACR_NAME` | Your Container Registry name | Name only (no domain) |
| `ACR_LOGIN_SERVER` | Your ACR login server | Full domain with `.azurecr.io` |
| `RESOURCE_GROUP` | Your Azure resource group name | Resource group name |
| `BACKEND_WEB_APP_NAME` | Your backend web app name | Web app name only |
| `FRONTEND_WEB_APP_NAME` | Your frontend web app name | Web app name only |

> � **Note**: All configuration is now stored as secrets for centralized management, even though some values are not sensitive.

#### 🧪 Validate Access (Optional)

Test your service principal configuration:
```bash
# Login with service principal
az login --service-principal -u <appId> -p <password> --tenant <tenant>

# Test ACR access
az acr login --name <ACR_NAME>

# Test web app restart permissions
az webapp show --name <BACKEND_WEB_APP_NAME> --resource-group <RESOURCE_GROUP>
az webapp show --name <FRONTEND_WEB_APP_NAME> --resource-group <RESOURCE_GROUP>
```

**Comprehensive Testing:**
Use the provided test script to validate your entire setup:
```bash
# Set your environment variables and run the test
./scripts/test-deployment.sh
```
This script tests authentication, permissions, and restart capabilities before you push to GitHub.

---

## 🚢 Build and Push Containers

### 🔨 Manual Build Scripts

The repository includes pre-built scripts for manual deployment:

#### 🔧 Make Scripts Executable
```bash
chmod +x scripts/*.sh
```

#### 🚀 Build and Push All Containers
```bash
# Run from the root directory
./scripts/build-and-push-all.sh v1.0.0
```

> 📝 **Note**: Modify scripts with correct arguments (e.g., `ACR_NAME`) before running

### 🤖 Automated CI/CD Pipeline

The GitHub Actions workflow automatically handles the complete deployment process:

**Trigger Deployment:**
1. ✏️ Make changes to your code
2. 📤 Push to the `main` branch (directly or via Pull Request)
3. ⚡ GitHub Actions automatically:
   - 🔨 Builds both frontend and backend Docker images
   - 📦 Pushes images to your Azure Container Registry
   - 🔄 Restarts both web apps to pull the latest images

**Pipeline Steps:**
1. **Build & Push**: Creates and uploads Docker images to ACR
2. **Backend Restart**: Automatically restarts the backend web app with new image
3. **Frontend Restart**: Automatically restarts the frontend web app with new image

> 📝 **Note**: Ensure you have configured all GitHub secrets as described above for the automated pipeline to work correctly. All configuration (including resource names) is stored as secrets for centralized management.

---

## 📚 Additional Resources

- 📖 [FastAPI Documentation](https://fastapi.tiangolo.com/)
- ⚛️ [React Documentation](https://react.dev/)
- ☁️ [Azure Container Apps](https://docs.microsoft.com/en-us/azure/container-apps/)
- 🐳 [Docker Documentation](https://docs.docker.com/)

---
