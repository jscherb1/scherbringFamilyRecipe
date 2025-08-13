# Azure Storage Setup for Recipe Images

This document explains how to set up Azure Storage to enable image uploads for recipes.

## Prerequisites

- An Azure subscription
- An existing Azure Storage Account (or create a new one)

## Step 1: Create or Configure Azure Storage Account

### Option A: Create a New Storage Account

1. Go to the [Azure Portal](https://portal.azure.com)
2. Click "Create a resource" → "Storage" → "Storage account"
3. Fill in the details:
   - **Subscription**: Your Azure subscription
   - **Resource group**: Create new or use existing
   - **Storage account name**: Choose a unique name (e.g., `recipestorage123`)
   - **Region**: Choose a region close to your users
   - **Performance**: Standard (recommended for images)
   - **Redundancy**: LRS (Locally-redundant storage) is sufficient for most use cases
4. Click "Review + create" → "Create"

### Option B: Use Existing Storage Account

If you already have a storage account, you can use it for recipe images.

## Step 2: Get Storage Account Credentials

1. Navigate to your Storage Account in the Azure Portal
2. In the left menu, click "Access keys" under "Security + networking"
3. Copy the following values:
   - **Storage account name**: The name of your storage account
   - **Key**: Either key1 or key2 (both work the same)

## Step 3: Configure Environment Variables

1. Copy `.env.example` to `.env` in the backend directory:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your Azure Storage credentials:
   ```bash
   # Replace with your actual values
   STORAGE_ACCOUNT_NAME=your_storage_account_name
   STORAGE_ACCOUNT_KEY=your_storage_account_key
   STORAGE_CONTAINER_NAME=recipe-images
   ```

## Step 4: Container Configuration

The application will automatically create a blob container named `recipe-images` (or whatever you specify in `STORAGE_CONTAINER_NAME`) with public blob access so images can be viewed directly via URL.

## Step 5: Test the Configuration

Run the storage test script:
```bash
cd backend
python test_storage.py
```

You should see:
```
✅ Storage service configured successfully
✅ Container exists
```

## Image Storage Structure

Images are stored in the following structure:
```
recipe-images/
├── recipes/
│   ├── recipe-id-1/
│   │   ├── original.jpg      # Full-size image
│   │   └── thumbnail.jpg     # 300x300 thumbnail
│   ├── recipe-id-2/
│   │   ├── original.png
│   │   └── thumbnail.jpg
│   └── ...
```

## Supported Image Formats

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

## Image Processing

- **Original images**: Stored as-is (up to 10MB)
- **Thumbnails**: Automatically generated at 300x300 pixels
- **Format conversion**: Non-JPEG thumbnails are converted to JPEG for consistency

## API Endpoints

### Create Recipe with Image
```http
POST /api/recipes/with-image
Content-Type: multipart/form-data

# Form fields:
title: "Recipe Title"
ingredients: ["ingredient1", "ingredient2"]  # JSON string
steps: ["step1", "step2"]                   # JSON string
tags: ["tag1", "tag2"]                      # JSON string
image: <file>                               # Image file
```

### Upload Image to Existing Recipe
```http
POST /api/recipes/{recipe_id}/image
Content-Type: multipart/form-data

image: <file>
```

### Delete Recipe Image
```http
DELETE /api/recipes/{recipe_id}/image
```

## Cost Considerations

- Azure Blob Storage costs are very low for image storage
- Typical costs for recipe images:
  - Storage: ~$0.02 per GB per month
  - Requests: ~$0.0004 per 1,000 requests
- For a personal recipe app with hundreds of recipes, expect costs under $1/month

## Security

- Images are stored with public blob access for direct viewing
- Access keys should be kept secure and not committed to source control
- Consider using Azure Key Vault for production deployments

## Troubleshooting

### "Storage service not configured" error
- Check that all environment variables are set correctly
- Verify the storage account name and key are correct
- Ensure the `.env` file is in the backend directory

### "Container does not exist" error
- The application should automatically create the container
- Check that your storage account key has the necessary permissions
- Verify the storage account is in a region that supports blob storage

### Images not displaying
- Check that the container has public blob access
- Verify the image URLs are accessible in a browser
- Check browser developer tools for CORS issues
