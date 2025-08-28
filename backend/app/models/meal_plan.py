from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
import uuid

def to_camel(string: str) -> str:
    components = string.split('_')
    return components[0] + ''.join(x.capitalize() for x in components[1:])

class WeekStartDay(str, Enum):
    MONDAY = "monday"
    SUNDAY = "sunday"

class MealPlanEntry(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    date: date
    recipe_id: Optional[str] = None
    notes: Optional[str] = None
    locked: bool = False

    def model_dump(self, **kwargs):
        """Override model_dump to handle date serialization"""
        # Use aliases by default unless explicitly disabled
        if 'by_alias' not in kwargs:
            kwargs['by_alias'] = True
            
        data = super().model_dump(**kwargs)
        
        # Convert date to ISO format string
        if isinstance(data.get('date'), date):
            data['date'] = data['date'].isoformat()
            
        return data

class PlannerConstraints(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    exclude_ingredients: List[str] = Field(default_factory=list)
    include_tags: List[str] = Field(default_factory=list)
    exclude_tags: List[str] = Field(default_factory=list)
    avoid_repeat_weeks: int = 4
    balance_protein_types: bool = True
    max_cook_time_min: Optional[int] = None
    required_recipes: List[str] = Field(default_factory=list)
    start_week_on: WeekStartDay = WeekStartDay.MONDAY

class MealPlanBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    week_start_date: date
    dinners_per_week: int = Field(5, ge=4, le=5)
    constraints: PlannerConstraints = Field(default_factory=PlannerConstraints)
    entries: List[MealPlanEntry] = Field(default_factory=list)
    name: Optional[str] = None
    description: Optional[str] = None

class MealPlanCreate(MealPlanBase):
    pass

class MealPlanUpdate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    dinners_per_week: Optional[int] = Field(None, ge=4, le=5)
    constraints: Optional[PlannerConstraints] = None
    entries: Optional[List[MealPlanEntry]] = None
    name: Optional[str] = None
    description: Optional[str] = None

class MealPlan(MealPlanBase):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "me"
    type: str = "MealPlan"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    def __init__(self, **data):
        """Initialize with default name and description if not provided"""
        super().__init__(**data)
        
        if not self.name:
            # Generate default name based on week start date
            week_start = self.week_start_date
            week_end = week_start + timedelta(days=6)
            
            # Format the dates
            if week_start.month == week_end.month:
                self.name = f"Week of {week_start.strftime('%B %d')}-{week_end.day}, {week_start.year}"
            else:
                self.name = f"Week of {week_start.strftime('%B %d')} - {week_end.strftime('%B %d')}, {week_start.year}"
        
        if not self.description:
            # Generate default description
            meal_count = len([entry for entry in self.entries if entry.recipe_id])
            self.description = f"Meal plan with {meal_count} planned meals for the week starting {self.week_start_date.strftime('%B %d, %Y')}"

    def model_dump(self, **kwargs):
        """Override model_dump to handle date/datetime serialization"""
        # Use aliases by default unless explicitly disabled
        if 'by_alias' not in kwargs:
            kwargs['by_alias'] = True
            
        data = super().model_dump(**kwargs)
        
        # Convert date objects to ISO format strings
        if isinstance(data.get('weekStartDate'), date):
            data['weekStartDate'] = data['weekStartDate'].isoformat()
        if isinstance(data.get('week_start_date'), date):
            data['week_start_date'] = data['week_start_date'].isoformat()
            
        # Convert datetime objects to ISO format strings
        datetime_fields = [
            ('created_at', 'createdAt'),
            ('updated_at', 'updatedAt')
        ]
        
        for snake_case, camel_case in datetime_fields:
            if isinstance(data.get(snake_case), datetime):
                data[snake_case] = data[snake_case].isoformat()
            if isinstance(data.get(camel_case), datetime):
                data[camel_case] = data[camel_case].isoformat()
        
        # Handle entries - convert dates in each entry
        if 'entries' in data and data['entries']:
            for entry in data['entries']:
                if isinstance(entry.get('date'), date):
                    entry['date'] = entry['date'].isoformat()
        
        return data

class MealPlanGenerate(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    week_start_date: date
    dinners_per_week: int = Field(5, ge=4, le=5)
    constraints: PlannerConstraints = Field(default_factory=PlannerConstraints)
    seed: Optional[str] = None

class MealPlanLockRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    
    entry_dates: List[date]
    locked: bool
