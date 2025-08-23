import random
from datetime import date, timedelta
from typing import List, Dict, Any, Optional, Set
import logging
from app.models.recipe import Recipe
from app.models.meal_plan import MealPlanEntry, PlannerConstraints
from app.repositories.recipes import recipe_repository
from app.repositories.mealplans import meal_plan_repository

logger = logging.getLogger(__name__)

class MealPlannerService:
    def __init__(self):
        self.recipe_repo = recipe_repository
        self.meal_plan_repo = meal_plan_repository
    
    async def generate_meal_plan(
        self,
        week_start_date: date,
        dinners_per_week: int,
        constraints: PlannerConstraints,
        existing_entries: Optional[List[MealPlanEntry]] = None,
        seed: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate a meal plan for a week"""
        
        # Set up deterministic randomness
        if seed:
            random.seed(f"{week_start_date.isoformat()}-{seed}")
        else:
            random.seed(week_start_date.isoformat())
        
        # Get all eligible recipes
        eligible_recipes = await self._get_eligible_recipes(constraints)
        
        if not eligible_recipes:
            return {
                "entries": [],
                "recipes": [],
                "message": "No recipes found matching the constraints"
            }
        
        # Generate dinner dates for the week
        dinner_dates = self._generate_dinner_dates(week_start_date, dinners_per_week, constraints.start_week_on)
        
        # Keep locked entries, generate new ones for unlocked
        locked_entries = {}
        if existing_entries:
            for entry in existing_entries:
                if entry.locked and entry.date in dinner_dates:
                    locked_entries[entry.date] = entry
        
        # Get recently used recipes to avoid repeats
        recently_used = await self._get_recently_used_recipes(week_start_date, constraints.avoid_repeat_weeks)
        
        # Generate entries
        entries = []
        used_recipe_ids = set()
        available_pool = eligible_recipes.copy()  # Pool of recipes to select from
        
        for dinner_date in dinner_dates:
            if dinner_date in locked_entries:
                # Keep locked entry
                entries.append(locked_entries[dinner_date])
                if locked_entries[dinner_date].recipe_id:
                    used_recipe_ids.add(locked_entries[dinner_date].recipe_id)
                    # Remove from pool if used
                    available_pool = [r for r in available_pool if r.id != locked_entries[dinner_date].recipe_id]
            else:
                # Generate new entry
                recipe = self._select_recipe(
                    eligible_recipes,
                    used_recipe_ids,
                    recently_used,
                    constraints,
                    available_pool
                )
                
                entry = MealPlanEntry(
                    date=dinner_date,
                    recipe_id=recipe.id if recipe else None,
                    notes="",
                    locked=False
                )
                entries.append(entry)
                
                if recipe:
                    used_recipe_ids.add(recipe.id)
                    # Remove from pool once used
                    available_pool = [r for r in available_pool if r.id != recipe.id]
                    
                    # If pool is empty and we still have dates to fill, reset the pool
                    if not available_pool and len(entries) < len(dinner_dates):
                        available_pool = eligible_recipes.copy()
                        # Remove already used recipes from this plan
                        available_pool = [r for r in available_pool if r.id not in used_recipe_ids]
        
        # Get recipe details for the response
        recipe_map = {recipe.id: recipe for recipe in eligible_recipes}
        selected_recipes = [
            recipe_map[entry.recipe_id] 
            for entry in entries 
            if entry.recipe_id and entry.recipe_id in recipe_map
        ]
        
        return {
            "entries": entries,
            "recipes": selected_recipes,
            "message": f"Generated meal plan with {len(selected_recipes)} recipes"
        }
    
    async def _get_eligible_recipes(self, constraints: PlannerConstraints) -> List[Recipe]:
        """Get recipes that meet the constraints"""
        # Get all recipes (we'll filter in memory for simplicity)
        result = await self.recipe_repo.list_recipes(page_size=1000)
        all_recipes = result["recipes"]
        
        eligible = []
        
        for recipe in all_recipes:
            # Only include breakfast, lunch, and dinner meal types (exclude snack and misc)
            if recipe.meal_type not in ["breakfast", "lunch", "dinner"]:
                continue
            
            # Check required recipes
            if constraints.required_recipes and recipe.id in constraints.required_recipes:
                eligible.append(recipe)
                continue
            
            # Check exclude tags
            if constraints.exclude_tags:
                if any(tag in recipe.tags for tag in constraints.exclude_tags):
                    continue
            
            # Check exclude ingredients
            if constraints.exclude_ingredients:
                recipe_text = " ".join(recipe.ingredients).lower()
                if any(ingredient.lower() in recipe_text for ingredient in constraints.exclude_ingredients):
                    continue
            
            # Check max cook time
            if constraints.max_cook_time_min and recipe.cook_time_min:
                if recipe.cook_time_min > constraints.max_cook_time_min:
                    continue
            
            # Check include tags (if specified, recipe must have at least one)
            if constraints.include_tags:
                if not any(tag in recipe.tags for tag in constraints.include_tags):
                    continue
            
            eligible.append(recipe)
        
        return eligible
    
    async def _get_recently_used_recipes(self, week_start_date: date, avoid_weeks: int) -> Set[str]:
        """Get recipe IDs that were used in recent weeks"""
        if avoid_weeks <= 0:
            return set()
        
        # Calculate date range to check
        start_check = week_start_date - timedelta(weeks=avoid_weeks)
        end_check = week_start_date - timedelta(days=1)
        
        # Get recent meal plans
        recent_plans = await self.meal_plan_repo.list_meal_plans(
            from_date=start_check,
            to_date=end_check
        )
        
        recently_used = set()
        for plan in recent_plans:
            for entry in plan.entries:
                if entry.recipe_id:
                    recently_used.add(entry.recipe_id)
        
        return recently_used
    
    def _generate_dinner_dates(self, week_start: date, dinners_per_week: int, start_week_on: str) -> List[date]:
        """Generate the dates for dinners in the week"""
        # Adjust week start based on preference
        if start_week_on == "sunday" and week_start.weekday() == 0:  # Monday
            week_start = week_start - timedelta(days=1)  # Move to Sunday
        elif start_week_on == "monday" and week_start.weekday() == 6:  # Sunday
            week_start = week_start + timedelta(days=1)  # Move to Monday
        
        # Generate dates
        dates = []
        for i in range(dinners_per_week):
            dates.append(week_start + timedelta(days=i))
        
        return dates
    
    def _select_recipe(
        self,
        eligible_recipes: List[Recipe],
        used_recipe_ids: Set[str],
        recently_used: Set[str],
        constraints: PlannerConstraints,
        available_pool: Optional[List[Recipe]] = None
    ) -> Optional[Recipe]:
        """Select a recipe based on constraints and balancing"""
        
        # Use the available pool if provided, otherwise use all eligible recipes
        pool = available_pool if available_pool is not None else eligible_recipes
        
        # Filter out already used recipes in this plan
        available = [r for r in pool if r.id not in used_recipe_ids]
        
        if not available:
            # If no recipes available from the pool, start over with all eligible recipes
            if available_pool is not None:
                available = [r for r in eligible_recipes if r.id not in used_recipe_ids]
            
            if not available:
                return None
        
        # Prefer recipes not used recently
        preferred = [r for r in available if r.id not in recently_used]
        candidates = preferred if preferred else available
        
        # If protein balancing is enabled, try to avoid back-to-back same proteins
        if constraints.balance_protein_types and used_recipe_ids:
            # Get protein types of recently selected recipes
            used_proteins = set()
            for recipe in eligible_recipes:
                if recipe.id in used_recipe_ids and recipe.protein_type:
                    used_proteins.add(recipe.protein_type)
            
            # Prefer different protein types
            different_proteins = [
                r for r in candidates 
                if not r.protein_type or r.protein_type not in used_proteins
            ]
            
            if different_proteins:
                candidates = different_proteins
        
        # Random selection from candidates
        return random.choice(candidates) if candidates else None

# Global instance
meal_planner_service = MealPlannerService()
