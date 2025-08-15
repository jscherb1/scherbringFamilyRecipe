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
from app.services.planner import MealPlannerService
from app.services.exports import ExportService
from app.deps import get_recipe_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/mealplans", tags=["mealplans"])

# Global instances
meal_plan_repo = MealPlanRepository()
meal_planner = MealPlannerService()
export_service = ExportService()

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
        
        return {"ingredients": ingredients_text}
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
        
        return {"ingredients": ingredients_text}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting consolidated ingredients with staples {meal_plan_id}: {e}")
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
