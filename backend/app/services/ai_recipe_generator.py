"""
AI-powered recipe generation service using Azure AI Foundry with structured responses.
"""

import os
import logging
import json
from typing import Optional, List
import openai
import httpx
import instructor
from pydantic import BaseModel, Field, ValidationError
from app.config import settings
from app.models.recipe import RecipeCreateBulk, ProteinType, MealType, Ingredient

logger = logging.getLogger(__name__)

class RecipeDescription(BaseModel):
    """Structured model for recipe description generation."""
    description: str = Field(..., description="A brief, appetizing description of the recipe")

class RecipeIngredients(BaseModel):
    """Structured model for recipe ingredients generation."""
    ingredients: List[str] = Field(..., description="List of ingredients with precise measurements and quantities")

class RecipeInstructions(BaseModel):
    """Structured model for recipe instructions generation."""
    instructions: List[str] = Field(..., description="Step-by-step cooking instructions, each step as a separate item")

class GeneratedRecipe(BaseModel):
    """Structured recipe response model for AI generation."""
    title: str = Field(..., description="A creative and descriptive recipe title")
    description: str = Field(..., description="A brief, appetizing description of the recipe")
    ingredients: List[str] = Field(..., description="List of ingredients with quantities")
    steps: List[str] = Field(..., description="Step-by-step cooking instructions")
    tags: List[str] = Field(default_factory=list, description="Relevant cooking tags (e.g., 'easy', 'vegetarian', 'spicy')")
    protein_type: Optional[ProteinType] = Field(None, description="Primary protein type if applicable")
    meal_type: MealType = Field(default=MealType.DINNER, description="Type of meal")
    prep_time_min: Optional[int] = Field(None, description="Preparation time in minutes")
    cook_time_min: Optional[int] = Field(None, description="Cooking time in minutes")
    servings: Optional[int] = Field(None, description="Number of servings")
    notes: Optional[str] = Field(None, description="Additional cooking tips or notes")

class AIRecipeGeneratorService:
    """Service for generating recipes using Azure AI Foundry."""
    
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
                logger.warning("Azure AI configuration incomplete. AI features will be disabled.")
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
            
            logger.info("AI recipe generator service initialized successfully with instructor")
            
        except Exception as e:
            logger.error(f"Failed to initialize AI client: {e}")
            self.client = None
    
    def is_available(self) -> bool:
        """Check if AI service is available."""
        return self.client is not None and settings.feature_ai
    
    def _parse_ai_response(self, response_text: str) -> GeneratedRecipe:
        """Parse AI response text into structured recipe data."""
        try:
            # Try to parse as JSON first
            response_json = json.loads(response_text)
            return GeneratedRecipe(**response_json)
        except (json.JSONDecodeError, ValidationError) as e:
            logger.warning(f"Failed to parse JSON response, attempting text parsing: {e}")
            # Fall back to text parsing
            return self._parse_text_response(response_text)
    
    def _parse_text_response(self, response_text: str) -> GeneratedRecipe:
        """Parse text response into structured recipe data."""
        lines = response_text.strip().split('\n')
        
        # Initialize default values
        title = "AI Generated Recipe"
        description = "A delicious recipe created by AI"
        ingredients = []
        steps = []
        tags = ["ai-generated"]
        prep_time = None
        cook_time = None
        servings = None
        notes = None
        
        current_section = None
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            # Detect sections
            lower_line = line.lower()
            if 'title:' in lower_line or line.startswith('# '):
                title = line.replace('Title:', '').replace('#', '').strip()
            elif 'description:' in lower_line:
                description = line.replace('Description:', '').strip()
            elif 'ingredients:' in lower_line or 'ingredient list:' in lower_line:
                current_section = 'ingredients'
            elif 'instructions:' in lower_line or 'steps:' in lower_line or 'directions:' in lower_line:
                current_section = 'steps'
            elif 'prep time:' in lower_line:
                try:
                    prep_time = int(''.join(filter(str.isdigit, line)))
                except:
                    pass
            elif 'cook time:' in lower_line:
                try:
                    cook_time = int(''.join(filter(str.isdigit, line)))
                except:
                    pass
            elif 'servings:' in lower_line:
                try:
                    servings = int(''.join(filter(str.isdigit, line)))
                except:
                    pass
            elif current_section == 'ingredients' and (line.startswith('-') or line.startswith('*') or line.startswith('•')):
                ingredients.append(line[1:].strip())
            elif current_section == 'steps' and (line.startswith('-') or line.startswith('*') or line.startswith('•') or line[0].isdigit()):
                steps.append(line.lstrip('-*•0123456789. ').strip())
        
        return GeneratedRecipe(
            title=title,
            description=description,
            ingredients=ingredients or ["1 cup of main ingredient", "Seasonings to taste"],
            steps=steps or ["Prepare ingredients", "Cook according to preference", "Serve hot"],
            tags=tags,
            prep_time_min=prep_time,
            cook_time_min=cook_time,
            servings=servings,
            notes=notes
        )

    async def generate_recipe(self, prompt: str) -> RecipeCreateBulk:
        """
        Generate a recipe based on a user prompt.
        
        Args:
            prompt: User's description of the desired recipe
            
        Returns:
            RecipeCreateBulk: Generated recipe data
            
        Raises:
            ValueError: If AI service is not available
            Exception: If generation fails
        """
        if not self.is_available():
            raise ValueError("AI recipe generation service is not available")
        
        try:
            # Prepare the system message for recipe generation
            system_message = """You are a professional chef and recipe developer. Create detailed, practical recipes based on user requests.

Guidelines:
- Use clear, specific ingredient measurements
- Provide step-by-step instructions that are easy to follow
- Include appropriate cooking times and temperatures
- Suggest realistic serving sizes
- Add helpful cooking tips in the notes section
- Choose appropriate tags and categorizations
- Ensure recipes are safe and use proper cooking techniques

Please format your response as JSON with the following structure:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "steps": ["step 1", "step 2"],
  "tags": ["tag1", "tag2"],
  "prep_time_min": 15,
  "cook_time_min": 30,
  "servings": 4,
  "notes": "Additional tips"
}

If you cannot provide JSON, format as clear text with sections for Title, Description, Ingredients, Instructions, etc."""

            user_message = f"Create a recipe for: {prompt}"
            
            # Generate recipe using OpenAI
            response = self.client.chat.completions.create(
                model=settings.azure_ai_deployment_name,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            response_text = response.choices[0].message.content
            logger.info(f"AI response received: {response_text[:100]}...")
            
            # Parse the response
            generated_recipe = self._parse_ai_response(response_text)
            
            # Convert to RecipeCreateBulk format
            recipe_data = RecipeCreateBulk(
                title=generated_recipe.title,
                description=generated_recipe.description,
                ingredients_text="\n".join(generated_recipe.ingredients),
                steps_text="\n".join(generated_recipe.steps),
                tags=generated_recipe.tags,
                protein_type=generated_recipe.protein_type,
                meal_type=generated_recipe.meal_type,
                prep_time_min=generated_recipe.prep_time_min,
                cook_time_min=generated_recipe.cook_time_min,
                servings=generated_recipe.servings,
                notes=generated_recipe.notes
            )
            
            logger.info(f"Successfully generated recipe: {generated_recipe.title}")
            return recipe_data
            
        except Exception as e:
            logger.error(f"Failed to generate recipe: {e}")
            raise Exception(f"Recipe generation failed: {str(e)}")
    
    async def generate_recipe_description(self, title: str, existing_ingredients: str = "", existing_instructions: str = "") -> str:
        """
        Generate a description for a recipe based on its title and optionally existing ingredients/instructions.
        
        Args:
            title: Recipe title
            existing_ingredients: Optional existing ingredients text
            existing_instructions: Optional existing instructions text
            
        Returns:
            str: Generated description
        """
        if not self.is_available():
            raise ValueError("AI recipe generation service is not available")
        
        try:
            # Build context based on what information is available
            context_parts = [f"Recipe title: {title}"]
            if existing_ingredients.strip():
                context_parts.append(f"Ingredients: {existing_ingredients}")
            if existing_instructions.strip():
                context_parts.append(f"Instructions: {existing_instructions}")
            
            context = "\n".join(context_parts)
            
            system_message = "You are a professional chef and food writer. Generate a brief, appetizing description for a recipe based on the provided information. The description should be 1-3 sentences that would make someone want to cook and eat this dish. Focus on flavors, textures, and what makes this recipe special or appealing."
            
            user_message = f"Create a brief, appetizing description for this recipe:\n\n{context}"
            
            response = self.client.chat.completions.create(
                model=settings.azure_ai_deployment_name,
                response_model=RecipeDescription,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=200
            )
            
            logger.info(f"Generated description for recipe: {title}")
            return response.description
            
        except Exception as e:
            logger.error(f"Failed to generate recipe description: {e}")
            raise Exception(f"Description generation failed: {str(e)}")
    
    async def generate_recipe_ingredients(self, title: str, existing_description: str = "", existing_instructions: str = "") -> str:
        """
        Generate ingredients for a recipe based on its title and optionally existing description/instructions.
        
        Args:
            title: Recipe title
            existing_description: Optional existing description
            existing_instructions: Optional existing instructions
            
        Returns:
            str: Generated ingredients text (one per line, clean format)
        """
        if not self.is_available():
            raise ValueError("AI recipe generation service is not available")
        
        try:
            # Build context based on what information is available
            context_parts = [f"Recipe title: {title}"]
            if existing_description.strip():
                context_parts.append(f"Description: {existing_description}")
            if existing_instructions.strip():
                context_parts.append(f"Instructions: {existing_instructions}")
            
            context = "\n".join(context_parts)
            
            system_message = """You are a professional chef. Generate a complete ingredient list for a recipe based on the provided information. Include specific quantities and measurements. 

IMPORTANT: Return ONLY the ingredient lines, one per line. Do NOT include:
- Headers like "Ingredients:" or "Ingredient List:"
- Bullet points, dashes, or numbers
- Any formatting characters
- Empty lines

Example format:
1 cup all-purpose flour
2 large eggs
1 tsp vanilla extract
1/2 cup butter, softened

Be practical and realistic with portions for a typical serving size."""
            
            user_message = f"Create a complete ingredient list for this recipe:\n\n{context}"
            
            response = self.client.chat.completions.create(
                model=settings.azure_ai_deployment_name,
                response_model=RecipeIngredients,
                messages=[
                    {"role": "system", "content": "You are a professional chef. Generate a complete ingredient list for a recipe based on the provided information. Include specific quantities and measurements. Be practical and realistic with portions for a typical serving size. Each ingredient should be a complete item with quantity, unit, and ingredient name (e.g., '1/4 cup olive oil', '2 large eggs', '1 tsp vanilla extract')."},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=800
            )
            
            # Join ingredients with newlines for the expected format
            ingredients = '\n'.join(response.ingredients)
            logger.info(f"Generated {len(response.ingredients)} ingredients for recipe: {title}")
            return ingredients
            
        except Exception as e:
            logger.error(f"Failed to generate recipe ingredients: {e}")
            raise Exception(f"Ingredients generation failed: {str(e)}")
    
    async def generate_recipe_instructions(self, title: str, existing_description: str = "", existing_ingredients: str = "") -> str:
        """
        Generate instructions for a recipe based on its title and optionally existing description/ingredients.
        
        Args:
            title: Recipe title
            existing_description: Optional existing description
            existing_ingredients: Optional existing ingredients
            
        Returns:
            str: Generated instructions text (one step per line, clean format)
        """
        if not self.is_available():
            raise ValueError("AI recipe generation service is not available")
        
        try:
            # Build context based on what information is available
            context_parts = [f"Recipe title: {title}"]
            if existing_description.strip():
                context_parts.append(f"Description: {existing_description}")
            if existing_ingredients.strip():
                context_parts.append(f"Ingredients: {existing_ingredients}")
            
            context = "\n".join(context_parts)
            
            system_message = """You are a professional chef. Generate clear, step-by-step cooking instructions for a recipe based on the provided information. Each step should be on its own line and be specific about techniques, temperatures, and timing. Make the instructions easy to follow for home cooks. Include proper cooking temperatures and safety guidelines where appropriate.

IMPORTANT: Return ONLY the instruction steps, one per line. Do NOT include:
- Headers like "Instructions:", "Steps:", or "Directions:"
- Step numbers (1., 2., 3., etc.)
- Bullet points, dashes, or other formatting
- Any formatting characters
- Empty lines

Example format:
Preheat oven to 350°F and grease a 9x13 inch baking dish
In a large bowl, whisk together flour, sugar, and baking powder
Add eggs one at a time, mixing well after each addition
Pour batter into prepared dish and bake for 25-30 minutes

Each line should be a complete cooking step."""
            
            user_message = f"Create detailed step-by-step cooking instructions for this recipe:\n\n{context}"
            
            response = self.client.chat.completions.create(
                model=settings.azure_ai_deployment_name,
                response_model=RecipeInstructions,
                messages=[
                    {"role": "system", "content": "You are a professional chef. Generate clear, step-by-step cooking instructions for a recipe based on the provided information. Each step should be specific about techniques, temperatures, and timing. Make the instructions easy to follow for home cooks. Include proper cooking temperatures and safety guidelines where appropriate."},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.7,
                max_tokens=1200
            )
            
            # Join instructions with newlines for the expected format
            instructions = '\n'.join(response.instructions)
            logger.info(f"Generated {len(response.instructions)} instruction steps for recipe: {title}")
            return instructions
            
        except Exception as e:
            logger.error(f"Failed to generate recipe instructions: {e}")
            raise Exception(f"Instructions generation failed: {str(e)}")

    async def generate_random_recipe(self) -> RecipeCreateBulk:
        """
        Generate a random recipe without user input.
        
        Returns:
            RecipeCreateBulk: Generated random recipe data
        """
        random_prompts = [
            "a comforting home-style dinner",
            "a quick and healthy lunch",
            "a delicious pasta dish",
            "a flavorful chicken recipe",
            "a vegetarian meal with seasonal vegetables",
            "a hearty soup perfect for any season",
            "a simple but elegant fish dish",
            "a satisfying breakfast or brunch recipe",
            "a classic comfort food with a modern twist",
            "a one-pot meal that's easy to make",
            "a fresh salad with interesting flavors",
            "a slow-cooked dish perfect for busy days",
            "a grilled recipe perfect for outdoor cooking",
            "a healthy bowl meal with protein and vegetables",
            "a traditional recipe with international flavors"
        ]
        
        import random
        random_prompt = random.choice(random_prompts)
        logger.info(f"Generating random recipe with prompt: {random_prompt}")
        
        return await self.generate_recipe(random_prompt)

# Global service instance
ai_recipe_service = AIRecipeGeneratorService()
