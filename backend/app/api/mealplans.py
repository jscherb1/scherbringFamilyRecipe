from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import Response
from typing import List, Optional
from datetime import date
import logging
from app.models.meal_plan import (
    MealPlan, MealPlanCreate, MealPlanUpdate, MealPlanGenerate, MealPlanLockRequest
)
from app.repositories.mealplans import MealPlanRepository
from app.repositories.recipes import RecipeRepository
from app.repositories.profile import ProfileRepository
from app.services.planner import MealPlannerService
from app.services.exports import ExportService
from app.services.todoist import todoist_service
from app.services.google_calendar import GoogleCalendarService
from app.services.ai_ingredient_consolidator import ai_ingredient_consolidator
from app.deps import get_recipe_repository

logger = logging.getLogger(__name__)

class CustomIngredientsRequest(BaseModel):
    ingredients: str

class GoogleCalendarRequest(BaseModel):
    access_token: str
    calendar_id: str
    overwrite_existing: bool = False

router = APIRouter(prefix="/api/mealplans", tags=["mealplans"])

# Global instances
meal_plan_repo = MealPlanRepository()
meal_planner = MealPlannerService()
export_service = ExportService()
profile_repo = ProfileRepository()
google_calendar_service = GoogleCalendarService()

@router.post("/generate")
async def generate_meal_plan(
    request: MealPlanGenerate,
    recipe_repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Generate a meal plan (dry-run, doesn't save)"""
    try:
        result = await meal_planner.generate_meal_plan(
            week_start_date=request.week_start_date,
            dinners_per_week=request.dinners_per_week,
            constraints=request.constraints,
            seed=request.seed
        )
        return result
    except Exception as e:
        logger.error(f"Error generating meal plan: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/", response_model=MealPlan)
async def create_meal_plan(
    meal_plan_data: MealPlanCreate,
    recipe_repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Save a meal plan and update lastCookedAt for recipes"""
    try:
        # Create the meal plan
        meal_plan = await meal_plan_repo.create_meal_plan(meal_plan_data)
        
        # Update lastCookedAt for recipes used in the plan
        recipe_updates = {}
        for entry in meal_plan.entries:
            if entry.recipe_id:
                recipe_updates[entry.recipe_id] = entry.date
        
        if recipe_updates:
            # Group by date and update
            for recipe_id, cooked_date in recipe_updates.items():
                from datetime import datetime
                # Convert date to datetime at midnight UTC
                cooked_datetime = datetime.combine(cooked_date, datetime.min.time())
                await recipe_repo.update_last_cooked([recipe_id], cooked_datetime)
        
        return meal_plan
    except Exception as e:
        logger.error(f"Error creating meal plan: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=List[MealPlan])
async def list_meal_plans(
    from_date: Optional[date] = Query(None, description="Start date filter"),
    to_date: Optional[date] = Query(None, description="End date filter")
):
    """List meal plans with optional date filtering"""
    try:
        return await meal_plan_repo.list_meal_plans(from_date=from_date, to_date=to_date)
    except Exception as e:
        logger.error(f"Error listing meal plans: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{meal_plan_id}", response_model=MealPlan)
async def get_meal_plan(meal_plan_id: str):
    """Get a meal plan by ID"""
    try:
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        return meal_plan
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting meal plan {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/{meal_plan_id}", response_model=MealPlan)
async def update_meal_plan(
    meal_plan_id: str,
    meal_plan_data: MealPlanUpdate
):
    """Update a meal plan or regenerate unlocked entries"""
    try:
        meal_plan = await meal_plan_repo.update_meal_plan(meal_plan_id, meal_plan_data)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        return meal_plan
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating meal plan {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{meal_plan_id}/lock")
async def lock_meal_plan_entries(
    meal_plan_id: str,
    request: MealPlanLockRequest
):
    """Lock or unlock specific meal plan entries"""
    try:
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        # Update lock status for specified dates
        for entry in meal_plan.entries:
            if entry.date in request.entry_dates:
                entry.locked = request.locked
        
        # Save the updated meal plan
        from app.models.meal_plan import MealPlanUpdate
        update_data = MealPlanUpdate(entries=meal_plan.entries)
        updated_meal_plan = await meal_plan_repo.update_meal_plan(meal_plan_id, update_data)
        
        return {
            "message": f"{'Locked' if request.locked else 'Unlocked'} {len(request.entry_dates)} entries",
            "meal_plan": updated_meal_plan
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error locking meal plan entries {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{meal_plan_id}")
async def delete_meal_plan(meal_plan_id: str):
    """Delete a meal plan"""
    try:
        success = await meal_plan_repo.delete_meal_plan(meal_plan_id)
        if not success:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        return {"message": "Meal plan deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting meal plan {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{meal_plan_id}/export.csv")
async def export_meal_plan_csv(meal_plan_id: str):
    """Export meal plan as CSV"""
    try:
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        csv_content = await export_service.export_meal_plan_csv(meal_plan)
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=meal_plan_{meal_plan.week_start_date}.csv"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting meal plan CSV {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{meal_plan_id}/export.json")
async def export_meal_plan_json(meal_plan_id: str):
    """Export meal plan as JSON"""
    try:
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        json_content = await export_service.export_meal_plan_json(meal_plan)
        
        return Response(
            content=json_content,
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=meal_plan_{meal_plan.week_start_date}.json"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting meal plan JSON {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{meal_plan_id}/export.txt")
async def export_meal_plan_txt(meal_plan_id: str):
    """Export meal plan as plain text shopping list"""
    try:
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        txt_content = await export_service.export_meal_plan_txt(meal_plan)
        
        return Response(
            content=txt_content,
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=meal_plan_{meal_plan.week_start_date}.txt"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting meal plan TXT {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{meal_plan_id}/export/ingredients")
async def export_consolidated_ingredients(meal_plan_id: str):
    """Export consolidated ingredient list for copying to todo apps"""
    try:
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        ingredients_text = await export_service.export_consolidated_ingredients(meal_plan)
        
        return {
            "ingredients": ingredients_text,
            "ai_consolidation_used": ai_ingredient_consolidator.is_available(),
            "consolidation_method": "AI-powered grocery intelligence" if ai_ingredient_consolidator.is_available() else "Basic pattern matching"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting consolidated ingredients {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{meal_plan_id}/export/ingredients/with-staples")
async def export_consolidated_ingredients_with_staples(meal_plan_id: str):
    """Export consolidated ingredient list with family staple items included"""
    try:
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        ingredients_text = await export_service.export_consolidated_ingredients_with_staples(meal_plan)
        
        return {
            "ingredients": ingredients_text,
            "ai_consolidation_used": ai_ingredient_consolidator.is_available(),
            "consolidation_method": "AI-powered grocery intelligence" if ai_ingredient_consolidator.is_available() else "Basic pattern matching"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting consolidated ingredients with staples {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{meal_plan_id}/export/ingredients/ai-status")
async def get_ai_consolidation_status(meal_plan_id: str):
    """Get the status of AI-powered ingredient consolidation"""
    try:
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        return {
            "ai_available": ai_ingredient_consolidator.is_available(),
            "feature_enabled": ai_ingredient_consolidator.is_available(),
            "consolidation_method": "AI-powered grocery intelligence" if ai_ingredient_consolidator.is_available() else "Basic text matching"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting AI consolidation status for {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{meal_plan_id}/export.ics")
async def export_meal_plan_ics(meal_plan_id: str):
    """Export meal plan as ICS calendar file"""
    try:
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        ics_content = await export_service.export_meal_plan_ics(meal_plan)
        
        return Response(
            content=ics_content,
            media_type="text/calendar",
            headers={"Content-Disposition": f"attachment; filename=meal_plan_{meal_plan.week_start_date}.ics"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting meal plan ICS {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{meal_plan_id}/export/todoist")
async def export_to_todoist(
    meal_plan_id: str, 
    include_staples: bool = Query(default=False, description="Include staple groceries")
):
    """Export shopping list to Todoist"""
    try:
        # Get the meal plan
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        # Get user profile for Todoist settings
        profile = await profile_repo.get_profile()
        if not profile or not profile.todoist_project_id:
            raise HTTPException(
                status_code=400, 
                detail="Todoist integration not configured. Please set a Todoist project in your profile settings."
            )
        
        # Get shopping list items
        if include_staples:
            ingredients_text = await export_service.export_consolidated_ingredients_with_staples(meal_plan)
        else:
            ingredients_text = await export_service.export_consolidated_ingredients(meal_plan)
        
        # Split into individual items (one per line)
        shopping_items = [
            item.strip() 
            for item in ingredients_text.split('\n') 
            if item.strip()
        ]
        
        if not shopping_items:
            return {
                "success": True,
                "itemsAdded": 0,
                "totalItems": 0,
                "projectName": profile.todoist_project_name or "Unknown Project",
                "message": "No items to add to Todoist"
            }
        
        # Add items to Todoist
        items_added = await todoist_service.add_tasks(
            project_id=profile.todoist_project_id,
            task_contents=shopping_items
        )
        
        return {
            "success": True,
            "itemsAdded": items_added,
            "totalItems": len(shopping_items),
            "projectName": profile.todoist_project_name or "Unknown Project",
            "message": f"Added {items_added} items to {profile.todoist_project_name or 'Todoist'}"
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error exporting to Todoist {meal_plan_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export to Todoist: {str(e)}")

@router.post("/export/todoist/custom")
async def export_custom_ingredients_to_todoist(
    request: CustomIngredientsRequest
):
    """Export custom shopping list to Todoist"""
    try:
        # Get user profile for Todoist settings
        profile = await profile_repo.get_profile()
        if not profile or not profile.todoist_project_id:
            raise HTTPException(
                status_code=400, 
                detail="Todoist integration not configured. Please set a Todoist project in your profile settings."
            )
        
        # Split into individual items (one per line)
        shopping_items = [
            item.strip() 
            for item in request.ingredients.split('\n') 
            if item.strip()
        ]
        
        if not shopping_items:
            return {
                "success": True,
                "itemsAdded": 0,
                "totalItems": 0,
                "projectName": profile.todoist_project_name or "Unknown Project",
                "message": "No items to add to Todoist"
            }
        
        # Add items to Todoist
        items_added = await todoist_service.add_tasks(
            project_id=profile.todoist_project_id,
            task_contents=shopping_items
        )
        
        return {
            "success": True,
            "itemsAdded": items_added,
            "totalItems": len(shopping_items),
            "projectName": profile.todoist_project_name or "Unknown Project",
            "message": f"Added {items_added} items to {profile.todoist_project_name or 'Todoist'}"
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error exporting custom ingredients to Todoist: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export to Todoist: {str(e)}")


# Google Calendar Integration Endpoints

@router.get("/{meal_plan_id}/google/calendars")
async def get_google_calendars(
    meal_plan_id: str,
    access_token: str = Query(..., description="Google OAuth access token")
):
    """Get user's Google calendars for meal plan sync selection"""
    try:
        # Verify meal plan exists
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        calendars = await google_calendar_service.get_user_calendars(access_token)
        return {"calendars": calendars}
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting Google calendars: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get calendars: {str(e)}")


@router.post("/{meal_plan_id}/google/calendar/check")
async def check_google_calendar_conflicts(
    meal_plan_id: str,
    request: GoogleCalendarRequest
):
    """Check for existing events on Google Calendar that might conflict with meal plan"""
    try:
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        conflicting_events = await google_calendar_service.check_calendar_events(
            access_token=request.access_token,
            calendar_id=request.calendar_id,
            meal_plan=meal_plan
        )
        
        return {
            "has_conflicts": len(conflicting_events) > 0,
            "conflicting_events": conflicting_events
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error checking Google Calendar conflicts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to check calendar conflicts: {str(e)}")


@router.post("/{meal_plan_id}/google/calendar/sync")
async def sync_meal_plan_to_google_calendar(
    meal_plan_id: str,
    request: GoogleCalendarRequest
):
    """Sync meal plan to Google Calendar"""
    try:
        meal_plan = await meal_plan_repo.get_meal_plan(meal_plan_id)
        if not meal_plan:
            raise HTTPException(status_code=404, detail="Meal plan not found")
        
        # Get recipe details for the meal plan
        recipe_map = await export_service._get_recipe_map(meal_plan)
        
        result = await google_calendar_service.sync_meal_plan_to_calendar(
            access_token=request.access_token,
            calendar_id=request.calendar_id,
            meal_plan=meal_plan,
            recipe_map=recipe_map,
            overwrite_existing=request.overwrite_existing
        )
        
        return result
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error syncing meal plan to Google Calendar: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to sync to Google Calendar: {str(e)}")
