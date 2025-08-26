from datetime import datetime
from typing import Optional, List, Union
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
import uuid

class Ingredient(BaseModel):
    """Ingredient model with optional shopping list inclusion"""
    text: str = Field(..., min_length=1, description="The ingredient text")
    includeInShoppingList: bool = Field(default=True, alias="include_in_shopping_list", description="Whether to include this ingredient in shopping lists")
    
    model_config = ConfigDict(populate_by_name=True)

class ProteinType(str, Enum):
    BEEF = "beef"
    CHICKEN = "chicken"
    PORK = "pork"
    FISH = "fish"
    SEAFOOD = "seafood"
    VEGETARIAN = "vegetarian"
    VEGAN = "vegan"
    OTHER = "other"

class MealType(str, Enum):
    DINNER = "dinner"
    LUNCH = "lunch"
    BREAKFAST = "breakfast"
    SNACK = "snack"
    MISC = "misc"

class RecipeBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    ingredients: List[Union[Ingredient, str]] = Field(default_factory=list)
    steps: List[str] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)
    protein_type: Optional[ProteinType] = Field(None, alias="proteinType")
    meal_type: MealType = Field(MealType.DINNER, alias="mealType")
    prep_time_min: Optional[int] = Field(None, ge=0, alias="prepTimeMin")
    cook_time_min: Optional[int] = Field(None, ge=0, alias="cookTimeMin")
    total_time_min: Optional[int] = Field(None, ge=0, alias="totalTimeMin")
    servings: Optional[int] = Field(None, ge=1)
    rating: Optional[int] = Field(None, ge=1, le=5)
    source_url: Optional[str] = Field(None, alias="sourceUrl")
    notes: Optional[str] = None
    last_cooked_at: Optional[datetime] = Field(None, alias="lastCookedAt")
    image_url: Optional[str] = Field(None, alias="imageUrl")  # URL to the full-size image in Azure Storage
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl")  # URL to the thumbnail image

class RecipeCreateBulk(BaseModel):
    """Recipe creation model with bulk text input for ingredients and steps"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    ingredients_text: Optional[str] = Field(None, alias="ingredientsText", description="Ingredients as bulk text, separated by line breaks")
    steps_text: Optional[str] = Field(None, alias="stepsText", description="Steps as bulk text, separated by line breaks")
    ingredients: Optional[List[Union[Ingredient, str]]] = Field(default_factory=list, description="Individual ingredients list (alternative to ingredientsText)")
    steps: Optional[List[str]] = Field(default_factory=list, description="Individual steps list (alternative to stepsText)")
    tags: List[str] = Field(default_factory=list)
    protein_type: Optional[ProteinType] = Field(None, alias="proteinType")
    meal_type: MealType = Field(MealType.DINNER, alias="mealType")
    prep_time_min: Optional[int] = Field(None, ge=0, alias="prepTimeMin")
    cook_time_min: Optional[int] = Field(None, ge=0, alias="cookTimeMin")
    total_time_min: Optional[int] = Field(None, ge=0, alias="totalTimeMin")
    servings: Optional[int] = Field(None, ge=1)
    rating: Optional[int] = Field(None, ge=1, le=5)
    source_url: Optional[str] = Field(None, alias="sourceUrl")
    notes: Optional[str] = None
    last_cooked_at: Optional[datetime] = Field(None, alias="lastCookedAt")
    image_url: Optional[str] = Field(None, alias="imageUrl")
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl")
    
    model_config = ConfigDict(populate_by_name=True)
    
    def to_recipe_create(self) -> 'RecipeCreate':
        """Convert bulk input to standard RecipeCreate format"""
        # Process ingredients
        final_ingredients = []
        if self.ingredients_text:
            # Split by line breaks and clean up
            bulk_ingredients = [
                self._clean_text(line.strip()) for line in self.ingredients_text.split('\n') 
                if line.strip()
            ]
            # Convert string ingredients to Ingredient objects with default includeInShoppingList=True
            final_ingredients.extend([
                Ingredient(text=ing, includeInShoppingList=True) for ing in bulk_ingredients if ing
            ])
        if self.ingredients:
            # Handle mixed list of strings and Ingredient objects
            for ingredient in self.ingredients:
                if isinstance(ingredient, str):
                    if ingredient.strip():
                        final_ingredients.append(Ingredient(text=ingredient.strip(), includeInShoppingList=True))
                else:
                    final_ingredients.append(ingredient)
            
        # Process steps
        final_steps = []
        if self.steps_text:
            # Split by line breaks and clean up
            bulk_steps = [
                self._clean_text(line.strip()) for line in self.steps_text.split('\n') 
                if line.strip()
            ]
            final_steps.extend([step for step in bulk_steps if step])  # Filter out empty strings after cleaning
        if self.steps:
            final_steps.extend(self.steps)
            
        return RecipeCreate(
            title=self.title,
            description=self.description,
            ingredients=final_ingredients,
            steps=final_steps,
            tags=self.tags,
            protein_type=self.protein_type,
            meal_type=self.meal_type,
            prep_time_min=self.prep_time_min,
            cook_time_min=self.cook_time_min,
            total_time_min=self.total_time_min,
            servings=self.servings,
            rating=self.rating,
            source_url=self.source_url,
            notes=self.notes,
            last_cooked_at=self.last_cooked_at,
            image_url=self.image_url,
            thumbnail_url=self.thumbnail_url
        )
    
    def _clean_text(self, text: str) -> str:
        """Clean text by removing unwanted characters commonly found in copy-pasted content"""
        if not text:
            return text
            
        # Characters to remove (common in recipe websites)
        unwanted_chars = [
            '▢',  # Checkbox character
            '☐',  # Empty checkbox
            '☑',  # Checked checkbox
            '✓',  # Checkmark
            '✔',  # Heavy checkmark
            '•',  # Bullet point (sometimes we want to keep these, but often they're unwanted)
            '◦',  # White bullet
            '▪',  # Black small square
            '▫',  # White small square
            '→',  # Right arrow
            '⭐',  # Star
            '★',  # Black star
            '☆',  # White star
        ]
        
        # Remove unwanted characters
        cleaned = text
        for char in unwanted_chars:
            cleaned = cleaned.replace(char, '')
        
        # Clean up extra whitespace
        cleaned = ' '.join(cleaned.split())
        
        # Remove leading/trailing dashes or asterisks that might be left over
        cleaned = cleaned.strip('- *')
        
        return cleaned.strip()

class RecipeCreate(RecipeBase):
    pass

class RecipeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    ingredients: Optional[List[Union[Ingredient, str]]] = None
    steps: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    protein_type: Optional[ProteinType] = Field(None, alias="proteinType")
    meal_type: Optional[MealType] = Field(None, alias="mealType")
    prep_time_min: Optional[int] = Field(None, ge=0, alias="prepTimeMin")
    cook_time_min: Optional[int] = Field(None, ge=0, alias="cookTimeMin")
    total_time_min: Optional[int] = Field(None, ge=0, alias="totalTimeMin")
    servings: Optional[int] = Field(None, ge=1)
    rating: Optional[int] = Field(None, ge=1, le=5)
    source_url: Optional[str] = Field(None, alias="sourceUrl")
    notes: Optional[str] = None
    last_cooked_at: Optional[datetime] = Field(None, alias="lastCookedAt")
    image_url: Optional[str] = Field(None, alias="imageUrl")
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl")
    
    model_config = ConfigDict(populate_by_name=True)

class RecipeUpdateBulk(BaseModel):
    """Recipe update model with bulk text input for ingredients and steps"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    ingredients_text: Optional[str] = Field(None, alias="ingredientsText", description="Ingredients as bulk text, separated by line breaks")
    steps_text: Optional[str] = Field(None, alias="stepsText", description="Steps as bulk text, separated by line breaks")
    ingredients: Optional[List[Union[Ingredient, str]]] = None
    steps: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    protein_type: Optional[ProteinType] = Field(None, alias="proteinType")
    meal_type: Optional[MealType] = Field(None, alias="mealType")
    prep_time_min: Optional[int] = Field(None, ge=0, alias="prepTimeMin")
    cook_time_min: Optional[int] = Field(None, ge=0, alias="cookTimeMin")
    total_time_min: Optional[int] = Field(None, ge=0, alias="totalTimeMin")
    servings: Optional[int] = Field(None, ge=1)
    rating: Optional[int] = Field(None, ge=1, le=5)
    source_url: Optional[str] = Field(None, alias="sourceUrl")
    notes: Optional[str] = None
    last_cooked_at: Optional[datetime] = Field(None, alias="lastCookedAt")
    image_url: Optional[str] = Field(None, alias="imageUrl")
    thumbnail_url: Optional[str] = Field(None, alias="thumbnailUrl")
    
    model_config = ConfigDict(populate_by_name=True)
    
    def to_recipe_update(self) -> RecipeUpdate:
        """Convert bulk input to standard RecipeUpdate format"""
        # Process ingredients
        final_ingredients = None
        if self.ingredients_text is not None:
            # Split by line breaks and clean up
            ingredient_texts = [
                self._clean_text(line.strip()) for line in self.ingredients_text.split('\n') 
                if line.strip()
            ]
            # Convert to Ingredient objects with default includeInShoppingList=True
            final_ingredients = [
                Ingredient(text=ing, includeInShoppingList=True) for ing in ingredient_texts if ing
            ]
        elif self.ingredients is not None:
            # Handle mixed list of strings and Ingredient objects
            final_ingredients = []
            for ingredient in self.ingredients:
                if isinstance(ingredient, str):
                    if ingredient.strip():
                        final_ingredients.append(Ingredient(text=ingredient.strip(), includeInShoppingList=True))
                else:
                    final_ingredients.append(ingredient)
            
        # Process steps
        final_steps = None
        if self.steps_text is not None:
            # Split by line breaks and clean up
            final_steps = [
                self._clean_text(line.strip()) for line in self.steps_text.split('\n') 
                if line.strip()
            ]
            final_steps = [step for step in final_steps if step]  # Filter out empty strings after cleaning
        elif self.steps is not None:
            final_steps = self.steps
            
        return RecipeUpdate(
            title=self.title,
            description=self.description,
            ingredients=final_ingredients,
            steps=final_steps,
            tags=self.tags,
            protein_type=self.protein_type,
            meal_type=self.meal_type,
            prep_time_min=self.prep_time_min,
            cook_time_min=self.cook_time_min,
            total_time_min=self.total_time_min,
            servings=self.servings,
            rating=self.rating,
            source_url=self.source_url,
            notes=self.notes,
            last_cooked_at=self.last_cooked_at,
            image_url=self.image_url,
            thumbnail_url=self.thumbnail_url
        )
    
    def _clean_text(self, text: str) -> str:
        """Clean text by removing unwanted characters commonly found in copy-pasted content"""
        if not text:
            return text
            
        # Characters to remove (common in recipe websites)
        unwanted_chars = [
            '▢',  # Checkbox character
            '☐',  # Empty checkbox
            '☑',  # Checked checkbox
            '✓',  # Checkmark
            '✔',  # Heavy checkmark
            '•',  # Bullet point (sometimes we want to keep these, but often they're unwanted)
            '◦',  # White bullet
            '▪',  # Black small square
            '▫',  # White small square
            '→',  # Right arrow
            '⭐',  # Star
            '★',  # Black star
            '☆',  # White star
        ]
        
        # Remove unwanted characters
        cleaned = text
        for char in unwanted_chars:
            cleaned = cleaned.replace(char, '')
        
        # Clean up extra whitespace
        cleaned = ' '.join(cleaned.split())
        
        # Remove leading/trailing dashes or asterisks that might be left over
        cleaned = cleaned.strip('- *')
        
        return cleaned.strip()

class Recipe(RecipeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str = "me"  # Changed from user_id to userId to match Cosmos DB queries
    type: str = "Recipe"
    created_at: datetime = Field(default_factory=datetime.utcnow, alias="createdAt")
    updated_at: datetime = Field(default_factory=datetime.utcnow, alias="updatedAt")
    
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
    
    def calculate_total_time(self):
        """Calculate total time from prep and cook time if not provided"""
        if self.total_time_min is None and self.prep_time_min and self.cook_time_min:
            self.total_time_min = self.prep_time_min + self.cook_time_min
        return self

    def get_ingredients_for_shopping_list(self) -> List[str]:
        """Get ingredients that should be included in shopping lists"""
        shopping_ingredients = []
        for ingredient in self.ingredients:
            if isinstance(ingredient, str):
                # Legacy string ingredient - include by default for backward compatibility
                shopping_ingredients.append(ingredient)
            elif isinstance(ingredient, Ingredient):
                # New ingredient object - check the flag
                if ingredient.includeInShoppingList:
                    shopping_ingredients.append(ingredient.text)
        return shopping_ingredients

    def get_all_ingredients_text(self) -> List[str]:
        """Get all ingredient texts regardless of shopping list flag"""
        ingredient_texts = []
        for ingredient in self.ingredients:
            if isinstance(ingredient, str):
                ingredient_texts.append(ingredient)
            elif isinstance(ingredient, Ingredient):
                ingredient_texts.append(ingredient.text)
        return ingredient_texts

    def normalize_ingredients(self):
        """Convert any string ingredients to Ingredient objects for consistency"""
        normalized_ingredients = []
        for ingredient in self.ingredients:
            if isinstance(ingredient, str):
                # Convert legacy string to Ingredient object with default includeInShoppingList=True
                normalized_ingredients.append(Ingredient(text=ingredient, includeInShoppingList=True))
            else:
                normalized_ingredients.append(ingredient)
        self.ingredients = normalized_ingredients
        return self

    def model_dump(self, **kwargs):
        """Override model_dump to handle datetime serialization and use aliases"""
        # Use aliases by default unless explicitly disabled
        if 'by_alias' not in kwargs:
            kwargs['by_alias'] = True
            
        data = super().model_dump(**kwargs)
        
        # Convert datetime objects to ISO format strings for both original and aliased field names
        datetime_fields = [
            ('created_at', 'createdAt'),
            ('updated_at', 'updatedAt'), 
            ('last_cooked_at', 'lastCookedAt')
        ]
        
        for original_field, alias_field in datetime_fields:
            # Handle original field names
            if isinstance(data.get(original_field), datetime):
                data[original_field] = data[original_field].isoformat()
            # Handle aliased field names
            if isinstance(data.get(alias_field), datetime):
                data[alias_field] = data[alias_field].isoformat()
            
        return data
    
    @classmethod
    def from_cosmos_data(cls, data: dict):
        """Create Recipe from Cosmos DB data, handling datetime parsing and field name mapping"""
        # Create a copy to avoid modifying the original data
        processed_data = data.copy()
        
        # Parse datetime strings back to datetime objects
        datetime_field_mappings = [
            ('created_at', 'createdAt'),
            ('updated_at', 'updatedAt'),
            ('last_cooked_at', 'lastCookedAt')
        ]
        
        for snake_case, camel_case in datetime_field_mappings:
            # Check both snake_case and camelCase field names
            for field_name in [snake_case, camel_case]:
                if field_name in processed_data and isinstance(processed_data[field_name], str):
                    try:
                        processed_data[snake_case] = datetime.fromisoformat(processed_data[field_name].replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        if field_name in ['created_at', 'createdAt', 'updated_at', 'updatedAt']:
                            processed_data[snake_case] = datetime.utcnow()
                        else:  # last_cooked_at / lastCookedAt
                            processed_data[snake_case] = None
                    break
        
        # Map camelCase field names to snake_case for model instantiation
        field_mappings = {
            'proteinType': 'protein_type',
            'mealType': 'meal_type', 
            'prepTimeMin': 'prep_time_min',
            'cookTimeMin': 'cook_time_min',
            'totalTimeMin': 'total_time_min',
            'sourceUrl': 'source_url',
            'lastCookedAt': 'last_cooked_at',
            'imageUrl': 'image_url',
            'thumbnailUrl': 'thumbnail_url',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at'
        }
        
        for camel_case, snake_case in field_mappings.items():
            if camel_case in processed_data and snake_case not in processed_data:
                processed_data[snake_case] = processed_data[camel_case]
        
        return cls(**processed_data)


class RecipeUrlParseRequest(BaseModel):
    """Request model for parsing recipe from URL"""
    url: str = Field(..., description="URL of the recipe to parse")


class RecipeUrlParseResponse(BaseModel):
    """Response model for parsed recipe from URL"""
    success: bool = Field(..., description="Whether parsing was successful")
    recipe_data: Optional[RecipeCreateBulk] = Field(None, alias="recipeData", description="Parsed recipe data if successful")
    error: Optional[str] = Field(None, description="Error message if parsing failed")
    
    model_config = ConfigDict(populate_by_name=True)


class RecipeAIGenerateRequest(BaseModel):
    """Request model for AI recipe generation"""
    prompt: str = Field(..., min_length=1, max_length=500, description="User prompt describing the desired recipe")


class RecipeAIGenerateResponse(BaseModel):
    """Response model for AI-generated recipe"""
    success: bool = Field(..., description="Whether generation was successful")
    recipe_data: Optional[RecipeCreateBulk] = Field(None, alias="recipeData", description="Generated recipe data if successful")
    error: Optional[str] = Field(None, description="Error message if generation failed")
    
    model_config = ConfigDict(populate_by_name=True)
