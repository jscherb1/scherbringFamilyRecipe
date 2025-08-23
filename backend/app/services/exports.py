import csv
import json
from io import StringIO
from typing import Dict, Any, List
from datetime import date, datetime
import logging
import re
from collections import defaultdict
from app.models.meal_plan import MealPlan
from app.models.recipe import Recipe
from app.repositories.recipes import recipe_repository
from app.repositories.profile import ProfileRepository

logger = logging.getLogger(__name__)

class ExportService:
    def __init__(self):
        self.recipe_repo = recipe_repository
        self.profile_repo = ProfileRepository()
    
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
            ingredients = '; '.join(recipe.get_all_ingredients_text()) if recipe else ''
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
                    "ingredients": recipe.get_all_ingredients_text(),
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
            
            if recipe:
                ingredient_texts = recipe.get_all_ingredients_text()
                if ingredient_texts:
                    lines.append(f"{recipe.title}:")
                    for ingredient in ingredient_texts:
                        lines.append(f"  - {ingredient}")
                    lines.append("")
        
        return "\n".join(lines)
    
    async def export_consolidated_ingredients(self, meal_plan: MealPlan) -> str:
        """Export consolidated ingredient list for copying to todo apps"""
        
        # Get recipes for the meal plan
        recipe_map = await self._get_recipe_map(meal_plan)
        
        # Collect and consolidate ingredients
        ingredient_counts = defaultdict(int)
        ingredient_base_names = {}  # Track the base name for similar ingredients
        
        for entry in meal_plan.entries:
            recipe = recipe_map.get(entry.recipe_id) if entry.recipe_id else None
            
            if recipe:
                shopping_ingredients = recipe.get_ingredients_for_shopping_list()
                
                for ingredient in shopping_ingredients:
                    # Normalize ingredient for consolidation
                    normalized = self._normalize_ingredient(ingredient)
                    base_name = self._extract_base_ingredient(normalized)
                    
                    if base_name not in ingredient_base_names:
                        ingredient_base_names[base_name] = ingredient
                    
                    ingredient_counts[base_name] += 1
        
        # Format for todo app (no headers or blank lines for easy copy-paste)
        lines = []
        
        # Sort ingredients alphabetically
        for base_name in sorted(ingredient_counts.keys()):
            count = ingredient_counts[base_name]
            original_ingredient = ingredient_base_names[base_name]
            
            if count > 1:
                lines.append(f"{original_ingredient} (needed for {count} recipes)")
            else:
                lines.append(f"{original_ingredient}")
        
        return "\n".join(lines)
    
    async def export_consolidated_ingredients_with_staples(self, meal_plan: MealPlan) -> str:
        """Export consolidated ingredient list with family staple items included"""
        
        # Get recipes for the meal plan
        recipe_map = await self._get_recipe_map(meal_plan)
        
        # Get user profile for staple groceries
        profile = await self.profile_repo.get_profile()
        staple_groceries = profile.staple_groceries if profile else []
        
        # Collect and consolidate ingredients
        ingredient_counts = defaultdict(int)
        ingredient_base_names = {}  # Track the base name for similar ingredients
        
        # Add meal plan ingredients
        for entry in meal_plan.entries:
            recipe = recipe_map.get(entry.recipe_id) if entry.recipe_id else None
            
            if recipe:
                shopping_ingredients = recipe.get_ingredients_for_shopping_list()
                for ingredient in shopping_ingredients:
                    # Normalize ingredient for consolidation
                    normalized = self._normalize_ingredient(ingredient)
                    base_name = self._extract_base_ingredient(normalized)
                    
                    if base_name not in ingredient_base_names:
                        ingredient_base_names[base_name] = ingredient
                    
                    ingredient_counts[base_name] += 1
        
        # Add staple groceries (avoiding duplicates)
        staple_items = []
        for staple in staple_groceries:
            normalized = self._normalize_ingredient(staple)
            base_name = self._extract_base_ingredient(normalized)
            
            # Only add if not already in meal plan ingredients
            if base_name not in ingredient_base_names:
                staple_items.append(staple)
        
        # Format for todo app (no headers or blank lines for easy copy-paste)
        lines = []
        
        # Add meal plan ingredients first
        meal_plan_ingredients = []
        for base_name in sorted(ingredient_counts.keys()):
            count = ingredient_counts[base_name]
            original_ingredient = ingredient_base_names[base_name]
            
            if count > 1:
                meal_plan_ingredients.append(f"{original_ingredient} (needed for {count} recipes)")
            else:
                meal_plan_ingredients.append(f"{original_ingredient}")
        
        if meal_plan_ingredients:
            lines.extend(meal_plan_ingredients)
        
        # Add staple items
        if staple_items:
            lines.extend(sorted(staple_items))
        
        return "\n".join(lines)

    async def export_meal_plan_ics(self, meal_plan: MealPlan) -> str:
        """Export meal plan as ICS calendar file for Google Calendar"""
        
        # Get recipes for the meal plan
        recipe_map = await self._get_recipe_map(meal_plan)
        
        lines = []
        lines.append("BEGIN:VCALENDAR")
        lines.append("VERSION:2.0")
        lines.append("PRODID:-//Scherbring Family Recipe//Meal Plan//EN")
        lines.append("CALSCALE:GREGORIAN")
        
        # Add each meal as an all-day event
        for entry in meal_plan.entries:
            recipe = recipe_map.get(entry.recipe_id) if entry.recipe_id else None
            
            if recipe:
                # Create unique event ID
                event_id = f"meal-{meal_plan.id}-{entry.date}-{recipe.id}"
                
                # Format date for ICS (YYYYMMDD for all-day events)
                event_date = entry.date.strftime('%Y%m%d')
                
                # Create event
                lines.append("BEGIN:VEVENT")
                lines.append(f"UID:{event_id}@scherbringfamilyrecipe.com")
                lines.append(f"DTSTART;VALUE=DATE:{event_date}")
                lines.append(f"DTEND;VALUE=DATE:{event_date}")
                lines.append(f"SUMMARY:{recipe.title}")
                
                # Build description with ingredients, steps, and URL
                description_parts = []
                
                ingredient_texts = recipe.get_all_ingredients_text()
                if ingredient_texts:
                    description_parts.append("INGREDIENTS:")
                    for ingredient in ingredient_texts:
                        description_parts.append(f"- {ingredient}")
                    description_parts.append("")
                
                if recipe.steps:
                    description_parts.append("INSTRUCTIONS:")
                    for i, step in enumerate(recipe.steps, 1):
                        description_parts.append(f"{i}. {step}")
                    description_parts.append("")
                
                if recipe.source_url:
                    description_parts.append(f"Recipe URL: {recipe.source_url}")
                
                # ICS requires line folding for long descriptions
                description = "\\n".join(description_parts)
                description = self._fold_ics_line(f"DESCRIPTION:{description}")
                lines.extend(description)
                
                # Add creation timestamp
                now = datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
                lines.append(f"DTSTAMP:{now}")
                lines.append(f"CREATED:{now}")
                
                lines.append("END:VEVENT")
        
        lines.append("END:VCALENDAR")
        
        return "\r\n".join(lines)  # ICS files use CRLF line endings
    
    def _normalize_ingredient(self, ingredient: str) -> str:
        """Normalize ingredient text for comparison"""
        return ingredient.lower().strip()
    
    def _extract_base_ingredient(self, ingredient: str) -> str:
        """Extract the base ingredient name for consolidation"""
        original = ingredient
        
        # Remove common measurements and descriptors
        # Remove measurements at the beginning
        ingredient = re.sub(r'^\d+\s*(\d+/)?\d*\s*(cups?|tbsp|tsp|teaspoons?|tablespoons?|lbs?|pounds?|oz|ounces?|cloves?|cans?|packages?|ribs?)\s+', '', ingredient)
        ingredient = re.sub(r'^(¼|½|¾|⅓|⅔|⅛|⅜|⅝|⅞)\s*(cups?|tbsp|tsp|teaspoons?|tablespoons?|lbs?|pounds?|oz|ounces?|cloves?|cans?|packages?|ribs?)\s+', '', ingredient)
        
        # Remove descriptors but be more careful
        ingredient = re.sub(r'\s*(large|small|medium|extra)\s+', ' ', ingredient)
        ingredient = re.sub(r'\s*(chopped|diced|sliced|minced|peeled)\s*', ' ', ingredient)
        
        # Clean up extra whitespace
        ingredient = re.sub(r'\s+', ' ', ingredient).strip()
        
        # Remove parenthetical information
        ingredient = re.sub(r'\s*\([^)]*\)\s*', ' ', ingredient).strip()
        
        # For very short ingredients or those that lost too much, return original
        if len(ingredient.split()) == 0 or len(ingredient) < 3:
            return original.lower()
        
        # For spices and seasonings, be more specific
        words = ingredient.split()
        
        # If we have specific spice/herb names, include more context
        spice_herbs = ['thyme', 'rosemary', 'basil', 'oregano', 'parsley', 'cilantro', 'sage', 'salt', 'pepper']
        for spice in spice_herbs:
            if spice in ingredient.lower():
                # For spices, include qualifying words like "dried", "fresh", "kosher", "black"
                relevant_words = []
                for word in words:
                    if word.lower() in ['fresh', 'dried', 'kosher', 'black', 'white', 'ground'] or spice in word.lower():
                        relevant_words.append(word)
                if relevant_words:
                    return ' '.join(relevant_words).lower()
        
        # For other ingredients, take first 2-3 words but be smarter
        if len(words) <= 2:
            return ingredient.lower()
        elif len(words) == 3:
            # If third word is likely important (not just descriptor), keep it
            if words[2].lower() not in ['leaves', 'powder', 'flakes', 'bits']:
                return ' '.join(words).lower()
            else:
                return ' '.join(words[:2]).lower()
        else:
            return ' '.join(words[:2]).lower()
    
    def _fold_ics_line(self, line: str) -> List[str]:
        """Fold ICS lines to 75 characters as required by RFC 5545"""
        if len(line) <= 75:
            return [line]
        
        folded = []
        current = line
        
        while len(current) > 75:
            # Find a good break point (prefer spaces)
            break_point = 74
            while break_point > 60 and current[break_point] != ' ':
                break_point -= 1
            
            if break_point <= 60:
                break_point = 74
            
            folded.append(current[:break_point + 1])
            current = ' ' + current[break_point + 1:]  # Continuation lines start with space
        
        if current.strip():
            folded.append(current)
        
        return folded
    
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
