# AI Image Generation Setup

This guide covers how to set up AI image generation for recipes using Azure AI Foundry with DALL-E-3.

## Prerequisites

Before setting up AI image generation, you need:

1. ✅ Azure AI Foundry (formerly Azure OpenAI) resource
2. ✅ DALL-E-3 model deployed in your Azure AI Foundry resource  
3. ✅ Azure Storage Account configured (for storing generated images)
4. ✅ Recipe data (title, description, ingredients, and steps)

## Step 1: Deploy DALL-E-3 in Azure AI Foundry

1. **Navigate to Azure AI Foundry Studio**
   - Go to [Azure AI Foundry Studio](https://ai.azure.com/)
   - Select your AI Foundry hub/project

2. **Deploy DALL-E-3 Model**
   - Go to "Deployments" section
   - Click "Create new deployment"
   - Select "DALL-E-3" from the model catalog
   - Choose your deployment settings:
     - **Model**: `dall-e-3`
     - **Deployment name**: Choose a name (e.g., `dalle3-deployment`)
     - **Version**: Latest available
   - Click "Deploy"

3. **Note Your Deployment Details**
   - Deployment name (you'll need this for configuration)
   - Endpoint URL
   - API key

## Step 2: Configure Environment Variables

Add these environment variables to your backend configuration:

### Option 1: Using .env file (Development)

Create or update `/backend/.env`:

```bash
# Existing Azure AI settings
AZURE_AI_ENDPOINT=your_ai_foundry_endpoint
AZURE_AI_API_KEY=your_api_key
AZURE_AI_API_VERSION=2024-02-01
AZURE_AI_DEPLOYMENT_NAME=your_chat_model_deployment

# New: DALL-E-3 deployment for image generation
AZURE_AI_DALLE_DEPLOYMENT_NAME=your_dalle3_deployment_name

# Feature flags
FEATURE_AI=true
```

### Option 2: System Environment Variables (Production)

Set these environment variables in your deployment environment:

```bash
export AZURE_AI_ENDPOINT="your_ai_foundry_endpoint"
export AZURE_AI_API_KEY="your_api_key"
export AZURE_AI_API_VERSION="2024-02-01"
export AZURE_AI_DEPLOYMENT_NAME="your_chat_model_deployment"
export AZURE_AI_DALLE_DEPLOYMENT_NAME="your_dalle3_deployment_name"
export FEATURE_AI="true"
```

## Step 3: Environment Variable Details

| Variable | Description | Example |
|----------|-------------|---------|
| `AZURE_AI_ENDPOINT` | Your Azure AI Foundry endpoint URL | `https://your-resource.openai.azure.com/` |
| `AZURE_AI_API_KEY` | API key for your Azure AI Foundry resource | `abc123...` |
| `AZURE_AI_API_VERSION` | API version for Azure AI Foundry | `2024-02-01` |
| `AZURE_AI_DEPLOYMENT_NAME` | Chat model deployment (GPT-4, etc.) | `gpt-4-deployment` |
| `AZURE_AI_DALLE_DEPLOYMENT_NAME` | DALL-E-3 deployment name | `dalle3-deployment` |
| `FEATURE_AI` | Enable AI features | `true` |

## Step 4: Required Azure Storage Setup

AI image generation requires Azure Storage to be configured for storing the generated images. 

**If you haven't set up storage yet**, follow the [Azure Storage Setup Guide](./AZURE_STORAGE_SETUP.md).

Required storage environment variables:
```bash
AZURE_STORAGE_ACCOUNT_NAME=your_storage_account_name
AZURE_STORAGE_ACCOUNT_KEY=your_storage_account_key
AZURE_STORAGE_CONTAINER_NAME=recipe-images  # Optional, defaults to 'recipe-images'
```

## Step 5: Test the Setup

1. **Start your application**:
   ```bash
   docker-compose up
   ```

2. **Create or edit a recipe**:
   - Navigate to the recipe creation/edit page
   - Fill in all required fields:
     - ✅ Recipe title
     - ✅ Recipe description  
     - ✅ At least one ingredient
     - ✅ At least one step
   
3. **Generate AI image**:
   - Look for the "AI Generate Image" button near the image upload section
   - The button will be enabled only when all required fields are populated
   - Click the button to generate an AI image
   - Wait for the image to be generated and uploaded

## How It Works

### AI Image Generation Process

1. **Validation**: Ensures all required recipe data is present
2. **Prompt Creation**: Creates a detailed DALL-E-3 prompt based on:
   - Recipe title and description
   - Key ingredients (first 5-8 ingredients)
   - Cuisine style analysis
   - Professional food photography guidance
3. **Image Generation**: Calls Azure AI Foundry DALL-E-3 API
4. **Storage**: Uploads generated image to Azure Storage
5. **Integration**: Sets the image as the recipe's image

### Prompt Engineering

The system automatically creates optimized prompts that include:
- Recipe title and description
- Key visible ingredients
- Cuisine style detection (Asian, Italian, Mexican, etc.)
- Professional food photography instructions
- Lighting and presentation guidance

### Requirements for Generation

The AI image generation button is only enabled when:
- ✅ Recipe title is provided
- ✅ Recipe description is provided
- ✅ At least one ingredient is provided
- ✅ At least one recipe step is provided

A helpful message explains which requirements are missing if the button is disabled.

## Troubleshooting

### Button is Disabled
- **Check required fields**: Ensure title, description, ingredients, and steps are all filled
- **Check console**: Look for error messages in the browser developer console

### Image Generation Fails
- **Verify environment variables**: Ensure all Azure AI settings are correct
- **Check deployment**: Verify DALL-E-3 deployment is active in Azure AI Foundry
- **Check API quotas**: Ensure you have remaining quota for DALL-E-3 API calls
- **Check storage**: Verify Azure Storage is configured and accessible

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "AI image generation service is not available" | Missing environment variables or storage config | Check all environment variables |
| "Recipe title is required for image generation" | Missing or empty title field | Fill in the recipe title |
| "Recipe description is required for image generation" | Missing or empty description | Fill in the recipe description |
| "At least one ingredient is required" | No ingredients provided | Add at least one ingredient |
| "At least one step is required" | No recipe steps provided | Add at least one recipe step |
| "Failed to generate image: HTTP 401" | Invalid API key | Check `AZURE_AI_API_KEY` |
| "Failed to generate image: HTTP 404" | Deployment not found | Check `AZURE_AI_DALLE_DEPLOYMENT_NAME` |

## API Usage and Costs

### DALL-E-3 Pricing
- **Standard quality**: ~$0.040 per image (1024x1024)
- **HD quality**: ~$0.080 per image (1024x1024)

The current implementation uses **standard quality** for cost efficiency.

### Rate Limits
- DALL-E-3 has rate limits based on your Azure subscription
- Check your Azure AI Foundry quotas and limits

## Security Best Practices

1. **API Key Security**:
   - Never commit API keys to version control
   - Use Azure Key Vault for production environments
   - Rotate API keys regularly

2. **Access Control**:
   - Implement proper authentication before allowing image generation
   - Consider rate limiting for image generation requests

3. **Content Moderation**:
   - DALL-E-3 has built-in content moderation
   - Consider additional content filtering if needed

## Feature Flags

The AI image generation feature respects the `FEATURE_AI` environment variable:
- `FEATURE_AI=true`: AI features enabled (including image generation)
- `FEATURE_AI=false`: AI features disabled

## Integration with Recipe Management

Generated images are treated exactly like user-uploaded images:
- ✅ Stored in Azure Storage with thumbnails
- ✅ Associated with the recipe
- ✅ Displayed in recipe views
- ✅ Included in recipe exports
- ✅ Can be replaced or removed by users

The generated images follow the same naming convention: `ai_generated_{uuid}.png`
