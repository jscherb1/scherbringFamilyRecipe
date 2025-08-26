"""
AI-powered image generation service using Azure AI Foundry DALL-E-3 model.
"""

import os
import logging
import uuid
from typing import Optional, Tuple
import httpx
import base64
from app.config import settings
from app.services.storage import storage_service

logger = logging.getLogger(__name__)

class AIImageGeneratorService:
    """Service for generating recipe images using Azure AI Foundry DALL-E-3."""
    
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the HTTP client for Azure AI Foundry DALL-E API."""
        if not settings.azure_ai_endpoint or not settings.azure_ai_api_key:
            logger.warning("Azure AI credentials not configured. Image generation will be disabled.")
            return
            
        if not settings.azure_ai_dalle_deployment_name:
            logger.warning("DALL-E deployment name not configured. Image generation will be disabled.")
            return
        
        self.base_url = settings.azure_ai_endpoint.rstrip('/')
        self.api_key = settings.azure_ai_api_key
        self.deployment_name = settings.azure_ai_dalle_deployment_name
        self.api_version = settings.azure_ai_api_version
        
        logger.info("AI Image Generator service initialized successfully")
    
    def is_available(self) -> bool:
        """Check if the AI image generation service is available."""
        return (
            self.base_url is not None and 
            self.api_key is not None and 
            self.deployment_name is not None and
            storage_service.blob_service_client is not None
        )
    
    async def generate_recipe_image(
        self, 
        title: str, 
        description: str, 
        ingredients: list[str], 
        steps: list[str]
    ) -> Tuple[str, str]:
        """
        Generate an image for a recipe using DALL-E-3.
        
        Args:
            title: Recipe title
            description: Recipe description
            ingredients: List of ingredients
            steps: List of recipe steps
            
        Returns:
            Tuple of (image_url, thumbnail_url) pointing to Azure Storage
            
        Raises:
            ValueError: If required fields are missing or service unavailable
            Exception: For API or storage errors
        """
        if not self.is_available():
            raise ValueError("AI image generation service is not available. Please check Azure AI and storage configuration.")
        
        # Validate required fields
        if not title.strip():
            raise ValueError("Recipe title is required for image generation")
        if not description.strip():
            raise ValueError("Recipe description is required for image generation")
        if not ingredients or len(ingredients) == 0:
            raise ValueError("Recipe ingredients are required for image generation")
        if not steps or len(steps) == 0:
            raise ValueError("Recipe steps are required for image generation")
        
        # Clean and filter ingredients and steps
        clean_ingredients = [ing.strip() for ing in ingredients if ing.strip()]
        clean_steps = [step.strip() for step in steps if step.strip()]
        
        if len(clean_ingredients) == 0:
            raise ValueError("At least one ingredient is required for image generation")
        if len(clean_steps) == 0:
            raise ValueError("At least one step is required for image generation")
        
        # Create a detailed prompt for the recipe image
        prompt = self._create_image_prompt(title, description, clean_ingredients, clean_steps)
        
        try:
            # Generate image using DALL-E-3
            logger.info(f"Generating image for recipe: {title}")
            image_data = await self._call_dalle_api(prompt)
            
            # Upload to Azure Storage
            logger.info(f"Uploading generated image to storage for recipe: {title}")
            image_url, thumbnail_url = await self._upload_generated_image(image_data, title)
            
            logger.info(f"Successfully generated and uploaded image for recipe: {title}")
            return image_url, thumbnail_url
            
        except Exception as e:
            logger.error(f"Error generating image for recipe '{title}': {e}")
            raise
    
    def _create_image_prompt(self, title: str, description: str, ingredients: list[str], steps: list[str]) -> str:
        """Create a detailed prompt for DALL-E-3 based on recipe data."""
        
        # Take first few ingredients to avoid token limits
        key_ingredients = ingredients[:8]  # Limit to first 8 ingredients
        
        # Analyze ingredients to determine cuisine style and presentation
        cuisine_hints = self._analyze_cuisine_style(key_ingredients)
        
        # Create a focused, descriptive prompt
        prompt = f"""A beautiful, professional food photography shot of {title}. 
{description}

Key ingredients visible: {', '.join(key_ingredients[:5])}

Style: {cuisine_hints} High-quality restaurant presentation, natural lighting, appetizing colors, 
shot from a slight angle showing texture and detail. The dish should look freshly prepared and delicious, 
with garnishes and plating that highlights the main ingredients. Clean, modern food photography style 
with shallow depth of field and warm, inviting lighting."""

        # Ensure prompt isn't too long (DALL-E has limits)
        if len(prompt) > 1000:
            prompt = prompt[:997] + "..."
        
        return prompt
    
    def _analyze_cuisine_style(self, ingredients: list[str]) -> str:
        """Analyze ingredients to suggest cuisine style for better image generation."""
        ingredients_text = ' '.join(ingredients).lower()
        
        # Common cuisine indicators
        if any(word in ingredients_text for word in ['soy sauce', 'ginger', 'sesame', 'rice vinegar', 'miso']):
            return "Asian-inspired cuisine."
        elif any(word in ingredients_text for word in ['basil', 'oregano', 'parmesan', 'mozzarella', 'olive oil']):
            return "Italian cuisine."
        elif any(word in ingredients_text for word in ['cumin', 'chili', 'cilantro', 'lime', 'jalapeño']):
            return "Mexican/Latin cuisine."
        elif any(word in ingredients_text for word in ['curry', 'garam masala', 'turmeric', 'cardamom']):
            return "Indian cuisine."
        elif any(word in ingredients_text for word in ['thyme', 'rosemary', 'wine', 'butter', 'cream']):
            return "French cuisine."
        else:
            return "Modern international cuisine."
    
    async def _call_dalle_api(self, prompt: str) -> bytes:
        """Call Azure AI Foundry DALL-E-3 API to generate image."""
        
        url = f"{self.base_url}/openai/deployments/{self.deployment_name}/images/generations"
        
        headers = {
            "api-key": self.api_key,
            "Content-Type": "application/json"
        }
        
        payload = {
            "prompt": prompt,
            "size": "1024x1024",  # DALL-E-3 default size
            "quality": "standard",  # or "hd" for higher quality but more expensive
            "style": "natural",  # or "vivid" for more dramatic images
            "response_format": "b64_json"  # Get base64 encoded image
        }
        
        params = {
            "api-version": self.api_version
        }
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(url, json=payload, headers=headers, params=params)
                response.raise_for_status()
                
                result = response.json()
                
                if "data" not in result or len(result["data"]) == 0:
                    raise Exception("No image data returned from DALL-E API")
                
                # Get the base64 image data
                image_b64 = result["data"][0]["b64_json"]
                image_data = base64.b64decode(image_b64)
                
                return image_data
                
            except httpx.HTTPStatusError as e:
                logger.error(f"DALL-E API HTTP error: {e.response.status_code} - {e.response.text}")
                raise Exception(f"Failed to generate image: HTTP {e.response.status_code}")
            except httpx.TimeoutException:
                logger.error("DALL-E API request timed out")
                raise Exception("Image generation timed out. Please try again.")
            except Exception as e:
                logger.error(f"DALL-E API error: {e}")
                raise Exception(f"Failed to generate image: {str(e)}")
    
    async def _upload_generated_image(self, image_data: bytes, recipe_title: str) -> Tuple[str, str]:
        """Upload generated image to Azure Storage and return URLs."""
        
        # Generate a unique filename
        filename = f"ai_generated_{uuid.uuid4().hex}.png"
        
        # Generate a temporary recipe ID for the storage method
        # In a real implementation, you might want to pass the actual recipe ID
        temp_recipe_id = f"ai_temp_{uuid.uuid4().hex}"
        
        # Upload to storage using the existing storage service
        image_url, thumbnail_url = await storage_service.upload_recipe_image(
            recipe_id=temp_recipe_id,
            filename=filename,
            file_content=image_data
        )
        
        if not image_url or not thumbnail_url:
            raise Exception("Failed to upload image to storage")
        
        return image_url, thumbnail_url

# Global service instance
ai_image_service = AIImageGeneratorService()
