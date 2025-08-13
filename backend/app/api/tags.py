from fastapi import APIRouter, HTTPException, Depends
from typing import List
import logging
from app.repositories.recipes import RecipeRepository
from app.deps import get_recipe_repository

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/tags", tags=["tags"])

@router.get("/", response_model=List[str])
async def get_all_tags(
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Get all unique tags across all recipes"""
    try:
        return await repo.get_all_tags()
    except Exception as e:
        logger.error(f"Error getting tags: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
