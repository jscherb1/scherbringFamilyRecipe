from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import logging
from app.models.recipe import Recipe, RecipeCreate, RecipeUpdate, ProteinType, MealType
from app.repositories.recipes import RecipeRepository
from app.deps import get_recipe_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/recipes", tags=["recipes"])

@router.post("/", response_model=Recipe)
async def create_recipe(
    recipe_data: RecipeCreate,
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Create a new recipe"""
    try:
        return await repo.create_recipe(recipe_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating recipe: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/", response_model=dict)
async def list_recipes(
    search: Optional[str] = Query(None, description="Search in title, ingredients, and tags"),
    tag: Optional[str] = Query(None, description="Filter by tag"),
    protein_type: Optional[ProteinType] = Query(None, description="Filter by protein type"),
    meal_type: Optional[MealType] = Query(None, description="Filter by meal type"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """List recipes with filtering and pagination"""
    try:
        return await repo.list_recipes(
            search=search,
            tag=tag,
            protein_type=protein_type.value if protein_type else None,
            meal_type=meal_type.value if meal_type else None,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        logger.error(f"Error listing recipes: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{recipe_id}", response_model=Recipe)
async def get_recipe(
    recipe_id: str,
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Get a recipe by ID"""
    try:
        recipe = await repo.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return recipe
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting recipe {recipe_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.put("/{recipe_id}", response_model=Recipe)
async def update_recipe(
    recipe_id: str,
    recipe_data: RecipeCreate,  # Full replacement
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Replace a recipe completely"""
    try:
        # Convert to update model (all fields)
        update_data = RecipeUpdate(**recipe_data.model_dump())
        recipe = await repo.update_recipe(recipe_id, update_data)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return recipe
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating recipe {recipe_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/{recipe_id}", response_model=Recipe)
async def patch_recipe(
    recipe_id: str,
    recipe_data: RecipeUpdate,
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Partially update a recipe"""
    try:
        recipe = await repo.update_recipe(recipe_id, recipe_data)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return recipe
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error patching recipe {recipe_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: str,
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Delete a recipe"""
    try:
        success = await repo.delete_recipe(recipe_id)
        if not success:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return {"message": "Recipe deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting recipe {recipe_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
