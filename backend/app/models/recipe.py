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
    protein_type: Optional[ProteinType] = None
    meal_type: MealType = MealType.DINNER
    prep_time_min: Optional[int] = Field(None, ge=0)
    cook_time_min: Optional[int] = Field(None, ge=0)
    total_time_min: Optional[int] = Field(None, ge=0)
    servings: Optional[int] = Field(None, ge=1)
    rating: Optional[int] = Field(None, ge=1, le=5)
    source_url: Optional[str] = None
    notes: Optional[str] = None
    last_cooked_at: Optional[datetime] = None

class RecipeCreate(RecipeBase):
    pass

class RecipeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    ingredients: Optional[List[str]] = None
    steps: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    protein_type: Optional[ProteinType] = None
    meal_type: Optional[MealType] = None
    prep_time_min: Optional[int] = Field(None, ge=0)
    cook_time_min: Optional[int] = Field(None, ge=0)
    total_time_min: Optional[int] = Field(None, ge=0)
    servings: Optional[int] = Field(None, ge=1)
    rating: Optional[int] = Field(None, ge=1, le=5)
    source_url: Optional[str] = None
    notes: Optional[str] = None
    last_cooked_at: Optional[datetime] = None

class Recipe(RecipeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    userId: str = "me"  # Changed from user_id to userId to match Cosmos DB queries
    type: str = "Recipe"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    model_config = ConfigDict(from_attributes=True)
    
    def calculate_total_time(self):
        """Calculate total time from prep and cook time if not provided"""
        if self.total_time_min is None and self.prep_time_min and self.cook_time_min:
            self.total_time_min = self.prep_time_min + self.cook_time_min
        return self

    def model_dump(self, **kwargs):
        """Override model_dump to handle datetime serialization"""
        data = super().model_dump(**kwargs)
        
        # Convert datetime objects to ISO format strings
        if isinstance(data.get('created_at'), datetime):
            data['created_at'] = data['created_at'].isoformat()
        if isinstance(data.get('updated_at'), datetime):
            data['updated_at'] = data['updated_at'].isoformat()
        if isinstance(data.get('last_cooked_at'), datetime):
            data['last_cooked_at'] = data['last_cooked_at'].isoformat()
            
        return data
    
    @classmethod
    def from_cosmos_data(cls, data: dict):
        """Create Recipe from Cosmos DB data, handling datetime parsing"""
        # Parse datetime strings back to datetime objects
        if 'created_at' in data and isinstance(data['created_at'], str):
            try:
                data['created_at'] = datetime.fromisoformat(data['created_at'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                data['created_at'] = datetime.utcnow()
                
        if 'updated_at' in data and isinstance(data['updated_at'], str):
            try:
                data['updated_at'] = datetime.fromisoformat(data['updated_at'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                data['updated_at'] = datetime.utcnow()
                
        if 'last_cooked_at' in data and isinstance(data['last_cooked_at'], str):
            try:
                data['last_cooked_at'] = datetime.fromisoformat(data['last_cooked_at'].replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                data['last_cooked_at'] = None
        
        return cls(**data)
