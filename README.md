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


### 🔑 GitHub Secrets Configuration

#### 📋 Required Values Collection

| Secret Name | Source | Command |
|------------|--------|---------|
| `AZURE_CLIENT_ID` | Service Principal `appId` | From output above |
| `AZURE_CLIENT_SECRET` | Service Principal `password` | From output above |
| `AZURE_TENANT_ID` | Service Principal `tenant` | From output above |
| `AZURE_SUBSCRIPTION_ID` | Azure Subscription | `az account show --query id -o tsv` |
| `ACR_NAME` | Container Registry | Your ACR name (e.g., `myregistry`) |
| `ACR_LOGIN_SERVER` | Container Registry | Your ACR login server (e.g., `myregistry.azurecr.io`) |

#### ➕ Adding Secrets to GitHub

1. 🔗 Navigate to your GitHub repository
2. ⚙️ Go to **Settings** → **Secrets and variables** → **Actions**
3. 🆕 Click **"New repository secret"** for each value:

| Secret Name | Value Source |
|------------|--------------|
| `AZURE_CLIENT_ID` | Service principal `appId` |
| `AZURE_CLIENT_SECRET` | Service principal `password` |
| `AZURE_TENANT_ID` | Service principal `tenant` |
| `AZURE_SUBSCRIPTION_ID` | Output from `az account show` |
| `ACR_NAME` | Your Container Registry name |
| `ACR_LOGIN_SERVER` | Your ACR login server (with `.azurecr.io`) |

#### 🧪 Validate Access (Optional)

Test your service principal configuration:
```bash
# Login with service principal
az login --service-principal -u <appId> -p <password> --tenant <tenant>

# Test ACR access
az acr login --name <ACR_NAME>
```

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

**Trigger Deployment:**
1. ✏️ Make changes to your code
2. 📤 Push to the `main` branch (directly or via Pull Request)
3. ⚡ GitHub Actions automatically builds and pushes images to your container registry

---

## 📚 Additional Resources

- 📖 [FastAPI Documentation](https://fastapi.tiangolo.com/)
- ⚛️ [React Documentation](https://react.dev/)
- ☁️ [Azure Container Apps](https://docs.microsoft.com/en-us/azure/container-apps/)
- 🐳 [Docker Documentation](https://docs.docker.com/)

---
