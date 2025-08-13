# Recipe App Image Upload Setup

This guide explains how to enable image uploads for recipes using Azure Blob Storage.

## Quick Setup with Environment Variables

### Option 1: Using .env file (Recommended for Development)

1. Copy the example environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `.env` and add your Azure Storage credentials:
   ```bash
   # Replace with your actual Azure Storage Account details
   AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
   AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key
   AZURE_STORAGE_CONTAINER_NAME=recipe-images
   ```

### Option 2: Using System Environment Variables (Recommended for Production)

Set these environment variables in your system or deployment environment:

```bash
export AZURE_STORAGE_ACCOUNT_NAME="your_storage_account_name"
export AZURE_STORAGE_ACCOUNT_KEY="your_storage_account_key"
export AZURE_STORAGE_CONTAINER_NAME="recipe-images"
```

### Option 3: Using GitHub Codespaces Secrets

If you're using GitHub Codespaces:

1. Go to your GitHub repository
2. Click Settings → Secrets and variables → Codespaces
3. Add repository secrets:
   - `AZURE_STORAGE_ACCOUNT_NAME`
   - `AZURE_STORAGE_ACCOUNT_KEY`
   - `AZURE_STORAGE_CONTAINER_NAME`

## Getting Azure Storage Credentials

### If you have an existing Azure Storage Account:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your Storage Account
3. Click "Access keys" in the left menu
4. Copy the storage account name and either key1 or key2

### If you need to create a new Azure Storage Account:

1. Go to [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" → Search for "Storage account"
3. Fill in the basic details:
   - Choose a unique storage account name
   - Select your subscription and resource group
   - Choose a region close to your users
   - Use Standard performance and LRS redundancy for cost efficiency
4. Create the account and get the credentials as described above

## Testing the Setup

Run the test script to verify your configuration:

```bash
cd backend
python test_storage.py
```

Expected output when properly configured:
```
✅ Storage service configured successfully
Container name: recipe-images
✅ Container exists
```

## How Image Storage Works

- **Without Storage Configured**: The app works normally but image upload is disabled
- **With Storage Configured**: Users can upload images when creating/editing recipes
- **Image Processing**: 
  - Original images stored as uploaded
  - Thumbnails automatically generated (300x300px)
  - Both stored in Azure Blob Storage with public access

## Storage Structure

```
your-storage-account/
└── recipe-images/
    └── recipes/
        ├── recipe-uuid-1/
        │   ├── original.jpg
        │   └── thumbnail.jpg
        └── recipe-uuid-2/
            ├── original.png
            └── thumbnail.jpg
```

## Cost Estimation

For a personal recipe app with ~1000 recipes and images:
- Storage: ~$0.50/month (assuming 2MB average per recipe)
- Requests: ~$0.10/month
- **Total: Less than $1/month**

## Security Notes

- Keep your storage account key secure
- Never commit credentials to source control
- The container is configured with public blob access so images can be displayed
- Consider using Azure Key Vault for production environments

## Troubleshooting

### Images not uploading
- Check that environment variables are set correctly
- Verify storage account key has the right permissions
- Check browser developer tools for API errors

### Images not displaying  
- Ensure the container has public blob access
- Check that image URLs are accessible directly in browser
- Verify CORS settings if accessing from a different domain
