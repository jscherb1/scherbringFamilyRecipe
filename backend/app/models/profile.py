from datetime import datetime
from typing import List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel, Field, ConfigDict

def to_camel(string: str) -> str:
    components = string.split('_')
    return components[0] + ''.join(word.capitalize() for word in components[1:])

class WeekStartDay(str, Enum):
    MONDAY = "monday"
    SUNDAY = "sunday"

class UserProfileBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    likes: List[str] = Field(default_factory=list)
    dislikes: List[str] = Field(default_factory=list)
    default_dinners_per_week: int = Field(5, ge=4, le=5)
    start_week_on: WeekStartDay = WeekStartDay.MONDAY
    timezone: str = "America/Chicago"
    tag_catalog: List[str] = Field(default_factory=lambda: [
        "quick", "healthy", "kid-friendly", "vegetarian", "comfort-food", "spicy"
    ])
    staple_groceries: List[str] = Field(default_factory=list)
    export_prefs: Dict[str, Any] = Field(default_factory=dict)
    todoist_project_id: Optional[str] = None
    todoist_project_name: Optional[str] = None

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    
    likes: List[str] = None
    dislikes: List[str] = None
    default_dinners_per_week: int = Field(None, ge=4, le=5)
    start_week_on: WeekStartDay = None
    timezone: str = None
    tag_catalog: List[str] = None
    staple_groceries: List[str] = None
    export_prefs: Dict[str, Any] = None
    todoist_project_id: Optional[str] = None
    todoist_project_name: Optional[str] = None

class UserProfile(UserProfileBase):
    id: str = "profile-me"
    user_id: str = "me"
    type: str = "UserProfile"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    def model_dump(self, **kwargs):
        """Override model_dump to handle datetime serialization and use aliases"""
        # Use aliases by default unless explicitly disabled
        if 'by_alias' not in kwargs:
            kwargs['by_alias'] = True
            
        data = super().model_dump(**kwargs)
        
        # Convert datetime objects to ISO format strings for both original and aliased field names
        datetime_fields = [
            ('created_at', 'createdAt'),
            ('updated_at', 'updatedAt')
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
        """Create UserProfile from Cosmos DB data, handling datetime parsing and field name mapping"""
        # Create a copy to avoid modifying the original data
        processed_data = data.copy()
        
        # Parse datetime strings back to datetime objects
        datetime_field_mappings = [
            ('created_at', 'createdAt'),
            ('updated_at', 'updatedAt')
        ]
        
        for snake_case, camel_case in datetime_field_mappings:
            # Check both snake_case and camelCase field names
            for field_name in [snake_case, camel_case]:
                if field_name in processed_data and isinstance(processed_data[field_name], str):
                    try:
                        processed_data[snake_case] = datetime.fromisoformat(processed_data[field_name].replace('Z', '+00:00'))
                    except (ValueError, AttributeError):
                        processed_data[snake_case] = datetime.utcnow()
                    break
        
        # Map camelCase field names to snake_case for model instantiation
        field_mappings = {
            'defaultDinnersPerWeek': 'default_dinners_per_week',
            'startWeekOn': 'start_week_on',
            'tagCatalog': 'tag_catalog',
            'stapleGroceries': 'staple_groceries',
            'exportPrefs': 'export_prefs',
            'todoistProjectId': 'todoist_project_id',
            'todoistProjectName': 'todoist_project_name',
            'createdAt': 'created_at',
            'updatedAt': 'updated_at'
        }
        
        for camel_case, snake_case in field_mappings.items():
            if camel_case in processed_data and snake_case not in processed_data:
                processed_data[snake_case] = processed_data[camel_case]
        
        return cls(**processed_data)
