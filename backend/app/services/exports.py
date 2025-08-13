import csv
import json
from io import StringIO
from typing import Dict, Any, List
from datetime import date
import logging
from app.models.meal_plan import MealPlan
from app.models.recipe import Recipe
from app.repositories.recipes import recipe_repository

logger = logging.getLogger(__name__)

class ExportService:
    def __init__(self):
        self.recipe_repo = recipe_repository
    
    async def export_meal_plan_csv(self, meal_plan: MealPlan) -> str:
        """Export meal plan as CSV with consolidated ingredient lists"""
        
        # Get recipes for the meal plan
        recipe_map = await self._get_recipe_map(meal_plan)
        
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['Date', 'Recipe', 'Ingredients', 'Notes'])
        
        # Write entries
        for entry in meal_plan.entries:
            recipe = recipe_map.get(entry.recipe_id) if entry.recipe_id else None
            
            date_str = entry.date.strftime('%Y-%m-%d (%A)')
            recipe_name = recipe.title if recipe else 'No recipe'
            ingredients = '; '.join(recipe.ingredients) if recipe else ''
            notes = entry.notes or ''
            
            writer.writerow([date_str, recipe_name, ingredients, notes])
        
        return output.getvalue()
    
    async def export_meal_plan_json(self, meal_plan: MealPlan) -> str:
        """Export meal plan as JSON with embedded recipe summaries"""
        
        # Get recipes for the meal plan
        recipe_map = await self._get_recipe_map(meal_plan)
        
        # Build export data
        export_data = {
            "meal_plan": {
                "id": meal_plan.id,
                "week_start_date": meal_plan.week_start_date.isoformat(),
                "dinners_per_week": meal_plan.dinners_per_week,
                "created_at": meal_plan.created_at.isoformat(),
            },
            "entries": []
        }
        
        for entry in meal_plan.entries:
            recipe = recipe_map.get(entry.recipe_id) if entry.recipe_id else None
            
            entry_data = {
                "date": entry.date.isoformat(),
                "notes": entry.notes,
                "locked": entry.locked,
                "recipe": None
            }
            
            if recipe:
                entry_data["recipe"] = {
                    "id": recipe.id,
                    "title": recipe.title,
                    "description": recipe.description,
                    "ingredients": recipe.ingredients,
                    "steps": recipe.steps,
                    "tags": recipe.tags,
                    "protein_type": recipe.protein_type,
                    "prep_time_min": recipe.prep_time_min,
                    "cook_time_min": recipe.cook_time_min,
                    "servings": recipe.servings,
                    "rating": recipe.rating
                }
            
            export_data["entries"].append(entry_data)
        
        return json.dumps(export_data, indent=2, default=str)
    
    async def export_meal_plan_txt(self, meal_plan: MealPlan) -> str:
        """Export meal plan as plain text shopping list"""
        
        # Get recipes for the meal plan
        recipe_map = await self._get_recipe_map(meal_plan)
        
        lines = []
        lines.append(f"MEAL PLAN - Week of {meal_plan.week_start_date.strftime('%B %d, %Y')}")
        lines.append("=" * 60)
        lines.append("")
        
        # Add each day's recipe
        for entry in meal_plan.entries:
            recipe = recipe_map.get(entry.recipe_id) if entry.recipe_id else None
            
            date_str = entry.date.strftime('%A, %B %d')
            lines.append(f"{date_str}:")
            
            if recipe:
                lines.append(f"  {recipe.title}")
                if entry.notes:
                    lines.append(f"  Notes: {entry.notes}")
            else:
                lines.append("  No recipe planned")
                if entry.notes:
                    lines.append(f"  Notes: {entry.notes}")
            
            lines.append("")
        
        # Add shopping list section
        lines.append("SHOPPING LIST")
        lines.append("=" * 60)
        lines.append("")
        
        # Group ingredients by recipe
        for entry in meal_plan.entries:
            recipe = recipe_map.get(entry.recipe_id) if entry.recipe_id else None
            
            if recipe and recipe.ingredients:
                lines.append(f"{recipe.title}:")
                for ingredient in recipe.ingredients:
                    lines.append(f"  • {ingredient}")
                lines.append("")
        
        return "\n".join(lines)
    
    async def _get_recipe_map(self, meal_plan: MealPlan) -> Dict[str, Recipe]:
        """Get a map of recipe IDs to Recipe objects for the meal plan"""
        recipe_ids = [
            entry.recipe_id 
            for entry in meal_plan.entries 
            if entry.recipe_id
        ]
        
        recipe_map = {}
        for recipe_id in recipe_ids:
            recipe = await self.recipe_repo.get_recipe(recipe_id)
            if recipe:
                recipe_map[recipe_id] = recipe
        
        return recipe_map

# Global instance
export_service = ExportService()
