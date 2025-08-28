from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
import logging
from app.models.profile import UserProfile, UserProfileUpdate
from app.repositories.profile import ProfileRepository
from app.services.todoist import todoist_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["profile"])

# Global instance
profile_repo = ProfileRepository()

@router.get("/", response_model=UserProfile)
async def get_profile():
    """Get user profile"""
    try:
        return await profile_repo.get_profile()
    except Exception as e:
        logger.error(f"Error getting profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.patch("/", response_model=UserProfile)
async def update_profile(profile_data: UserProfileUpdate):
    """Update user profile"""
    try:
        return await profile_repo.update_profile(profile_data)
    except Exception as e:
        logger.error(f"Error updating profile: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/tags/{tag}", response_model=UserProfile)
async def add_tag_to_catalog(tag: str):
    """Add a new tag to the catalog"""
    try:
        return await profile_repo.add_tag_to_catalog(tag)
    except Exception as e:
        logger.error(f"Error adding tag to catalog: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/tags/{tag}", response_model=UserProfile)
async def remove_tag_from_catalog(tag: str):
    """Remove a tag from the catalog"""
    try:
        return await profile_repo.remove_tag_from_catalog(tag)
    except Exception as e:
        logger.error(f"Error removing tag from catalog: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/todoist/projects")
async def get_todoist_projects():
    """Get all Todoist projects for user selection"""
    try:
        projects = await todoist_service.get_projects()
        return {"projects": projects}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting Todoist projects: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch Todoist projects")

@router.get("/todoist/test")
async def test_todoist_connection():
    """Test Todoist API connection"""
    try:
        is_connected = await todoist_service.test_connection()
        return {"connected": is_connected}
    except Exception as e:
        logger.error(f"Error testing Todoist connection: {e}")
        return {"connected": False, "error": str(e)}
