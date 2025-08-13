from datetime import datetime
from typing import List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class WeekStartDay(str, Enum):
    MONDAY = "monday"
    SUNDAY = "sunday"

class UserProfileBase(BaseModel):
    likes: List[str] = Field(default_factory=list)
    dislikes: List[str] = Field(default_factory=list)
    default_dinners_per_week: int = Field(5, ge=4, le=5)
    start_week_on: WeekStartDay = WeekStartDay.MONDAY
    timezone: str = "America/Chicago"
    tag_catalog: List[str] = Field(default_factory=lambda: [
        "quick", "healthy", "kid-friendly", "vegetarian", "comfort-food", "spicy"
    ])
    export_prefs: Dict[str, Any] = Field(default_factory=dict)

class UserProfileCreate(UserProfileBase):
    pass

class UserProfileUpdate(BaseModel):
    likes: List[str] = None
    dislikes: List[str] = None
    default_dinners_per_week: int = Field(None, ge=4, le=5)
    start_week_on: WeekStartDay = None
    timezone: str = None
    tag_catalog: List[str] = None
    export_prefs: Dict[str, Any] = None

class UserProfile(UserProfileBase):
    id: str = "profile-me"
    user_id: str = "me"
    type: str = "UserProfile"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True
