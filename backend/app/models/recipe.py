from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
import uuid

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
    ingredients: List[str] = Field(default_factory=list)
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

class RecipeCreate(RecipeBase):
    pass

class RecipeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    ingredients: Optional[List[str]] = None
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
