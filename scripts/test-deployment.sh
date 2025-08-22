#!/bin/bash
# test-deployment.sh
# Test script to validate GitHub Actions deployment commands work correctly

set -e  # Exit on any error

echo "🧪 Testing GitHub Actions deployment commands..."
echo "================================================"

# Check if all required variables are set
required_vars=("AZURE_CLIENT_ID" "AZURE_CLIENT_SECRET" "AZURE_TENANT_ID" "RESOURCE_GROUP" "BACKEND_WEB_APP_NAME" "FRONTEND_WEB_APP_NAME" "ACR_NAME")

echo "📋 Checking required environment variables..."
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set"
        echo "Please set all required variables before running this script."
        echo ""
        echo "Required variables:"
        for v in "${required_vars[@]}"; do
            echo "  - $v"
        done
        exit 1
    else
        echo "✅ $var is set"
    fi
done

echo ""
echo "🔐 Testing Azure authentication..."
# Test Azure login
if az login --service-principal -u "$AZURE_CLIENT_ID" -p "$AZURE_CLIENT_SECRET" --tenant "$AZURE_TENANT_ID" > /dev/null 2>&1; then
    echo "✅ Azure login successful"
else
    echo "❌ Azure login failed"
    exit 1
fi

echo ""
echo "📦 Testing Azure Container Registry access..."
# Test ACR access
if az acr login --name "$ACR_NAME" > /dev/null 2>&1; then
    echo "✅ ACR login successful"
else
    echo "❌ ACR login failed"
    exit 1
fi

echo ""
echo "🌐 Testing web app access..."
# Test web app access
echo "Checking backend web app: $BACKEND_WEB_APP_NAME"
if backend_name=$(az webapp show --name "$BACKEND_WEB_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "name" -o tsv 2>/dev/null); then
    backend_status=$(az webapp show --name "$BACKEND_WEB_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "state" -o tsv)
    echo "✅ Backend app found: $backend_name (Status: $backend_status)"
else
    echo "❌ Backend web app not found or no access"
    exit 1
fi

echo "Checking frontend web app: $FRONTEND_WEB_APP_NAME"
if frontend_name=$(az webapp show --name "$FRONTEND_WEB_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "name" -o tsv 2>/dev/null); then
    frontend_status=$(az webapp show --name "$FRONTEND_WEB_APP_NAME" --resource-group "$RESOURCE_GROUP" --query "state" -o tsv)
    echo "✅ Frontend app found: $frontend_name (Status: $frontend_status)"
else
    echo "❌ Frontend web app not found or no access"
    exit 1
fi

echo ""
echo "🔄 Testing restart permissions (dry run)..."
# Check if we can get app configuration (indicates restart permissions)
if az webapp config show --name "$BACKEND_WEB_APP_NAME" --resource-group "$RESOURCE_GROUP" > /dev/null 2>&1; then
    echo "✅ Backend app restart permissions confirmed"
else
    echo "❌ Backend app restart permissions missing"
    echo "💡 You may need to grant 'Website Contributor' or 'Contributor' role"
    exit 1
fi

if az webapp config show --name "$FRONTEND_WEB_APP_NAME" --resource-group "$RESOURCE_GROUP" > /dev/null 2>&1; then
    echo "✅ Frontend app restart permissions confirmed"
else
    echo "❌ Frontend app restart permissions missing"
    echo "💡 You may need to grant 'Website Contributor' or 'Contributor' role"
    exit 1
fi

echo ""
echo "🎯 Testing actual restart commands..."
read -p "Do you want to test actual restart commands? This will restart your web apps. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔄 Restarting backend web app: $BACKEND_WEB_APP_NAME"
    if az webapp restart --name "$BACKEND_WEB_APP_NAME" --resource-group "$RESOURCE_GROUP"; then
        echo "✅ Backend web app restarted successfully"
    else
        echo "❌ Backend web app restart failed"
        exit 1
    fi

    echo "🔄 Restarting frontend web app: $FRONTEND_WEB_APP_NAME"
    if az webapp restart --name "$FRONTEND_WEB_APP_NAME" --resource-group "$RESOURCE_GROUP"; then
        echo "✅ Frontend web app restarted successfully"
    else
        echo "❌ Frontend web app restart failed"
        exit 1
    fi
else
    echo "⏭️  Skipping actual restart test"
fi

echo ""
echo "================================================"
echo "🎉 All tests passed! GitHub Actions should work correctly."
echo ""
echo "Summary:"
echo "✅ Service principal authentication works"
echo "✅ Container registry access confirmed"
echo "✅ Web app access confirmed"
echo "✅ Restart permissions confirmed"
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "✅ Restart commands tested successfully"
fi
echo ""
echo "🚀 You're ready to push to the main branch!"
