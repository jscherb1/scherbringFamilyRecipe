"""
AI-powered ingredient consolidation service using Azure AI Foundry with structured responses.
"""

import logging
from typing import List, Dict, Optional
import openai
import httpx
import instructor
from pydantic import BaseModel, Field
from app.config import settings

logger = logging.getLogger(__name__)


class ConsolidatedIngredient(BaseModel):
    """Structured model for a consolidated ingredient."""
    ingredient: str = Field(..., description="The consolidated ingredient name as it would appear on a shopping list")
    quantity: str = Field(..., description="The total quantity needed, combining all occurrences across recipes")


class IngredientConsolidationResult(BaseModel):
    """Structured model for ingredient consolidation response."""
    consolidated_ingredients: List[ConsolidatedIngredient] = Field(
        ..., 
        description="List of consolidated ingredients with combined quantities"
    )


class AIIngredientConsolidatorService:
    """Service for consolidating ingredients using AI with grocery shopping intelligence."""
    
    def __init__(self):
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize the OpenAI client with Azure AI Foundry settings and instructor."""
        try:
            if not all([
                settings.azure_ai_endpoint,
                settings.azure_ai_api_key,
                settings.azure_ai_deployment_name
            ]):
                logger.warning("Azure AI configuration incomplete. AI ingredient consolidation will be disabled.")
                return
            
            # Create a custom HTTP client to avoid proxy-related issues
            http_client = httpx.Client()
            
            # Create OpenAI client configured for Azure
            base_client = openai.AzureOpenAI(
                azure_endpoint=settings.azure_ai_endpoint,
                api_key=settings.azure_ai_api_key,
                api_version=settings.azure_ai_api_version,
                azure_deployment=settings.azure_ai_deployment_name,
                http_client=http_client
            )
            
            # Wrap with instructor for structured responses
            self.client = instructor.from_openai(base_client)
            
            logger.info("AI ingredient consolidator service initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize AI client for ingredient consolidation: {e}")
            self.client = None
    
    def is_available(self) -> bool:
        """Check if AI service is available."""
        return self.client is not None and settings.feature_ai
    
    async def consolidate_ingredients(self, ingredient_list: List[str]) -> List[Dict[str, str]]:
        """
        Consolidate ingredients using AI to group similar items and combine quantities.
        
        Args:
            ingredient_list: List of ingredient strings from recipes
            
        Returns:
            List of dictionaries with 'ingredient' and 'quantity' keys
        """
        if not self.is_available():
            logger.warning("AI service not available, falling back to basic consolidation")
            return self._fallback_consolidation(ingredient_list)
        
        if not ingredient_list:
            return []
        
        try:
            # Prepare the system message for ingredient consolidation
            system_message = """You are an expert grocery shopper and cooking assistant. Your task is to consolidate a list of ingredients from multiple recipes into a smart shopping list.

CONSOLIDATION RULES:
1. Group similar ingredients that would be purchased as the same item at a grocery store
2. Combine quantities when possible (e.g., "1 cup flour" + "2 cups flour" = "3 cups flour")
3. Use practical grocery shopping logic:
   - "minced garlic" and "garlic cloves" should be consolidated as "garlic"
   - "yellow onion" and "white onion" can be consolidated as "onions"
   - Different forms of the same ingredient should be consolidated (fresh herbs vs dried herbs should be separate)
   - "olive oil" and "extra virgin olive oil" should be consolidated as "olive oil"
   - "kosher salt" and "table salt" should be consolidated as "salt"
   - "black pepper" and "ground black pepper" should be consolidated as "black pepper"

QUANTITY HANDLING:
1. When quantities can be mathematically combined, do so (e.g., cups, tablespoons, teaspoons)
2. When quantities are in different units, list both or convert to the most practical unit
3. When quantities are vague ("some", "a pinch"), use descriptive language like "multiple recipes"
4. For items used in multiple recipes but with unclear quantities, note "needed for X recipes"

GROCERY SHOPPING PERSPECTIVE:
Think like someone making a grocery list - what would they actually buy at the store?
Use common grocery store terminology and practical quantities.

OUTPUT FORMAT:
Return a structured list where each consolidated ingredient has an "ingredient" name and a "quantity" that reflects the total needed."""

            # Create user message with the ingredient list
            ingredients_text = "\n".join([f"- {ingredient}" for ingredient in ingredient_list])
            user_message = f"""Please consolidate these ingredients into a smart shopping list:

{ingredients_text}

Consolidate similar ingredients that would be the same grocery store purchase, combine quantities where possible, and present the results in a practical shopping list format."""

            # Generate consolidated ingredients using OpenAI with instructor
            response = self.client.chat.completions.create(
                model=settings.azure_ai_deployment_name,
                response_model=IngredientConsolidationResult,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.3,  # Lower temperature for more consistent consolidation
                max_tokens=2000
            )
            
            # Convert to the expected format
            result = []
            for consolidated in response.consolidated_ingredients:
                result.append({
                    "ingredient": consolidated.ingredient,
                    "quantity": consolidated.quantity
                })
            
            logger.info(f"Successfully consolidated {len(ingredient_list)} ingredients into {len(result)} shopping list items")
            return result
            
        except Exception as e:
            logger.error(f"Failed to consolidate ingredients with AI: {e}")
            # Fall back to basic consolidation
            return self._fallback_consolidation(ingredient_list)
    
    def _fallback_consolidation(self, ingredient_list: List[str]) -> List[Dict[str, str]]:
        """
        Fallback consolidation method using basic heuristics when AI is not available.
        This maintains the existing functionality as a backup.
        """
        logger.info("Using fallback ingredient consolidation")
        
        # Simple deduplication and basic grouping
        ingredient_counts = {}
        
        for ingredient in ingredient_list:
            # Basic normalization
            normalized = ingredient.lower().strip()
            
            # Simple base extraction (this is much simpler than the AI version)
            base_name = self._extract_base_ingredient_simple(normalized)
            
            if base_name in ingredient_counts:
                ingredient_counts[base_name] += 1
            else:
                ingredient_counts[base_name] = 1
        
        # Convert to expected format
        result = []
        for base_name, count in sorted(ingredient_counts.items()):
            if count > 1:
                quantity = f"needed for {count} recipes"
            else:
                quantity = "1 recipe"
            
            result.append({
                "ingredient": base_name,
                "quantity": quantity
            })
        
        return result
    
    def _extract_base_ingredient_simple(self, ingredient: str) -> str:
        """Simple base ingredient extraction for fallback mode."""
        # Remove common measurements and quantities
        import re
        
        # Remove leading quantities and measurements
        ingredient = re.sub(r'^\d+\s*(\d+/)?\d*\s*(cups?|tbsp|tsp|teaspoons?|tablespoons?|lbs?|pounds?|oz|ounces?|cloves?|cans?|packages?)\s+', '', ingredient)
        ingredient = re.sub(r'^(¼|½|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s*(cups?|tbsp|tsp|teaspoons?|tablespoons?|lbs?|pounds?|oz|ounces?|cloves?|cans?|packages?)\s+', '', ingredient)
        
        # Remove common descriptors
        ingredient = re.sub(r'\s*(large|small|medium|chopped|diced|sliced|minced|peeled)\s*', ' ', ingredient)
        
        # Clean up whitespace
        ingredient = re.sub(r'\s+', ' ', ingredient).strip()
        
        # Take first 1-2 words as base ingredient
        words = ingredient.split()
        if len(words) <= 2:
            return ingredient
        else:
            return ' '.join(words[:2])


# Global service instance
ai_ingredient_consolidator = AIIngredientConsolidatorService()
