from datetime import datetime, date
from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field
import uuid

class WeekStartDay(str, Enum):
    MONDAY = "monday"
    SUNDAY = "sunday"

class MealPlanEntry(BaseModel):
    date: date
    recipe_id: Optional[str] = None
    notes: Optional[str] = None
    locked: bool = False

class PlannerConstraints(BaseModel):
    exclude_ingredients: List[str] = Field(default_factory=list)
    include_tags: List[str] = Field(default_factory=list)
    exclude_tags: List[str] = Field(default_factory=list)
    avoid_repeat_weeks: int = 4
    balance_protein_types: bool = True
    max_cook_time_min: Optional[int] = None
    required_recipes: List[str] = Field(default_factory=list)
    start_week_on: WeekStartDay = WeekStartDay.MONDAY

class MealPlanBase(BaseModel):
    week_start_date: date
    dinners_per_week: int = Field(5, ge=4, le=5)
    constraints: PlannerConstraints = Field(default_factory=PlannerConstraints)
    entries: List[MealPlanEntry] = Field(default_factory=list)

class MealPlanCreate(MealPlanBase):
    pass

class MealPlanUpdate(BaseModel):
    dinners_per_week: Optional[int] = Field(None, ge=4, le=5)
    constraints: Optional[PlannerConstraints] = None
    entries: Optional[List[MealPlanEntry]] = None

class MealPlan(MealPlanBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str = "me"
    type: str = "MealPlan"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        from_attributes = True

class MealPlanGenerate(BaseModel):
    week_start_date: date
    dinners_per_week: int = Field(5, ge=4, le=5)
    constraints: PlannerConstraints = Field(default_factory=PlannerConstraints)
    seed: Optional[str] = None

class MealPlanLockRequest(BaseModel):
    entry_dates: List[date]
    locked: bool
