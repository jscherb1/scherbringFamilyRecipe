from app.repositories.cosmos_client import cosmos_client
from app.repositories.recipes import recipe_repository
from app.repositories.mealplans import meal_plan_repository
from app.repositories.profile import profile_repository

async def get_cosmos_client():
    """Dependency to get Cosmos DB client"""
    if not cosmos_client.client:
        cosmos_client.connect()
    return cosmos_client

async def get_recipe_repository():
    """Dependency to get recipe repository"""
    return recipe_repository

async def get_meal_plan_repository():
    """Dependency to get meal plan repository"""
    return meal_plan_repository

async def get_profile_repository():
    """Dependency to get profile repository"""
    return profile_repository
