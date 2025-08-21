from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File, Form
from typing import List, Optional
import logging
import json
from app.models.recipe import Recipe, RecipeCreate, RecipeCreateBulk, RecipeUpdate, RecipeUpdateBulk, ProteinType, MealType
from app.repositories.recipes import RecipeRepository
from app.services.storage import storage_service
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

@router.post("/bulk", response_model=Recipe)
async def create_recipe_bulk(
    recipe_data: RecipeCreateBulk,
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Create a new recipe with bulk text input for ingredients and steps"""
    try:
        # Convert bulk input to standard recipe format
        standard_recipe_data = recipe_data.to_recipe_create()
        return await repo.create_recipe(standard_recipe_data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating recipe with bulk input: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/with-image", response_model=Recipe)
async def create_recipe_with_image(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    ingredients: str = Form(...),  # JSON string
    steps: str = Form(...),  # JSON string
    tags: str = Form("[]"),  # JSON string
    protein_type: Optional[ProteinType] = Form(None),
    meal_type: MealType = Form(MealType.DINNER),
    prep_time_min: Optional[int] = Form(None),
    cook_time_min: Optional[int] = Form(None),
    total_time_min: Optional[int] = Form(None),
    servings: Optional[int] = Form(None),
    rating: Optional[int] = Form(None),
    source_url: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Create a new recipe with optional image"""
    try:
        # Parse JSON fields
        try:
            ingredients_list = json.loads(ingredients)
            steps_list = json.loads(steps)
            tags_list = json.loads(tags)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON in form data: {e}")
        
        # Create recipe data
        recipe_data = RecipeCreate(
            title=title,
            description=description,
            ingredients=ingredients_list,
            steps=steps_list,
            tags=tags_list,
            protein_type=protein_type,
            meal_type=meal_type,
            prep_time_min=prep_time_min,
            cook_time_min=cook_time_min,
            total_time_min=total_time_min,
            servings=servings,
            rating=rating,
            source_url=source_url,
            notes=notes
        )
        
        # Create recipe first
        recipe = await repo.create_recipe(recipe_data)
        
        # Upload image if provided
        if image and image.filename:
            try:
                # Validate file type
                if not image.content_type or not image.content_type.startswith('image/'):
                    raise HTTPException(status_code=400, detail="File must be an image")
                
                # Read file content
                file_content = await image.read()
                
                # Upload to storage
                original_url, thumbnail_url = await storage_service.upload_recipe_image(
                    recipe.id, image.filename, file_content
                )
                
                # Update recipe with image URLs
                if original_url and thumbnail_url:
                    update_data = RecipeUpdate(
                        image_url=original_url,
                        thumbnail_url=thumbnail_url
                    )
                    
                    updated_recipe = await repo.update_recipe(recipe.id, update_data)
                    if updated_recipe:
                        recipe = updated_recipe
                        logger.info(f"Successfully uploaded image for recipe {recipe.id}")
                    else:
                        logger.error(f"Failed to update recipe {recipe.id} with image URLs")
                else:
                    logger.warning(f"Failed to get image URLs from storage service for recipe {recipe.id}")
                    
            except HTTPException:
                # Clean up created recipe on image upload failure
                await repo.delete_recipe(recipe.id)
                raise
            except Exception as e:
                logger.error(f"Error uploading image: {e}")
                # Clean up created recipe on image upload failure
                await repo.delete_recipe(recipe.id)
                raise HTTPException(status_code=500, detail="Failed to upload image")
        
        return recipe
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating recipe with image: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/with-image-bulk", response_model=Recipe)
async def create_recipe_with_image_bulk(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    ingredients_text: Optional[str] = Form(None),  # Bulk ingredients as text
    steps_text: Optional[str] = Form(None),  # Bulk steps as text
    ingredients: Optional[str] = Form("[]"),  # JSON string for individual ingredients (fallback)
    steps: Optional[str] = Form("[]"),  # JSON string for individual steps (fallback)
    tags: str = Form("[]"),  # JSON string
    protein_type: Optional[ProteinType] = Form(None),
    meal_type: MealType = Form(MealType.DINNER),
    prep_time_min: Optional[int] = Form(None),
    cook_time_min: Optional[int] = Form(None),
    total_time_min: Optional[int] = Form(None),
    servings: Optional[int] = Form(None),
    rating: Optional[int] = Form(None),
    source_url: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Create a new recipe with optional image and bulk text input for ingredients and steps"""
    try:
        # Parse JSON fields
        try:
            ingredients_list = json.loads(ingredients) if ingredients else []
            steps_list = json.loads(steps) if steps else []
            tags_list = json.loads(tags)
        except json.JSONDecodeError as e:
            raise HTTPException(status_code=400, detail=f"Invalid JSON in form data: {e}")
        
        # Create bulk recipe data
        bulk_recipe_data = RecipeCreateBulk(
            title=title,
            description=description,
            ingredients_text=ingredients_text,
            steps_text=steps_text,
            ingredients=ingredients_list,
            steps=steps_list,
            tags=tags_list,
            protein_type=protein_type,
            meal_type=meal_type,
            prep_time_min=prep_time_min,
            cook_time_min=cook_time_min,
            total_time_min=total_time_min,
            servings=servings,
            rating=rating,
            source_url=source_url,
            notes=notes
        )
        
        # Convert to standard recipe format
        recipe_data = bulk_recipe_data.to_recipe_create()
        
        # Create recipe first
        recipe = await repo.create_recipe(recipe_data)
        
        # Upload image if provided
        if image and image.filename:
            try:
                # Validate file type
                if not image.content_type or not image.content_type.startswith('image/'):
                    raise HTTPException(status_code=400, detail="File must be an image")
                
                # Read file content
                file_content = await image.read()
                
                # Upload to storage
                original_url, thumbnail_url = await storage_service.upload_recipe_image(
                    recipe.id, image.filename, file_content
                )
                
                # Update recipe with image URLs
                if original_url and thumbnail_url:
                    update_data = RecipeUpdate(
                        image_url=original_url,
                        thumbnail_url=thumbnail_url
                    )
                    
                    updated_recipe = await repo.update_recipe(recipe.id, update_data)
                    if updated_recipe:
                        recipe = updated_recipe
                        logger.info(f"Successfully uploaded image for recipe {recipe.id}")
                    else:
                        logger.error(f"Failed to update recipe {recipe.id} with image URLs")
                else:
                    logger.warning(f"Failed to get image URLs from storage service for recipe {recipe.id}")
                    
            except HTTPException:
                # Clean up created recipe on image upload failure
                await repo.delete_recipe(recipe.id)
                raise
            except Exception as e:
                logger.error(f"Error uploading image: {e}")
                # Clean up created recipe on image upload failure
                await repo.delete_recipe(recipe.id)
                raise HTTPException(status_code=500, detail="Failed to upload image")
        
        return recipe
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating recipe with image and bulk input: {e}")
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

@router.patch("/{recipe_id}/bulk", response_model=Recipe)
async def patch_recipe_bulk(
    recipe_id: str,
    recipe_data: RecipeUpdateBulk,
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Partially update a recipe with bulk text input for ingredients and steps"""
    try:
        # Convert bulk input to standard recipe update format
        standard_update_data = recipe_data.to_recipe_update()
        recipe = await repo.update_recipe(recipe_id, standard_update_data)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return recipe
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating recipe {recipe_id} with bulk input: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/{recipe_id}")
async def delete_recipe(
    recipe_id: str,
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Delete a recipe"""
    try:
        # Get recipe to check if it has images
        recipe = await repo.get_recipe(recipe_id)
        if recipe and (recipe.image_url or recipe.thumbnail_url):
            # Delete images from storage
            await storage_service.delete_recipe_images(recipe_id)
        
        success = await repo.delete_recipe(recipe_id)
        if not success:
            raise HTTPException(status_code=404, detail="Recipe not found")
        return {"message": "Recipe deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting recipe {recipe_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{recipe_id}/image", response_model=Recipe)
async def upload_recipe_image(
    recipe_id: str,
    image: UploadFile = File(...),
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Upload or update an image for an existing recipe"""
    try:
        # Check if recipe exists
        recipe = await repo.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Validate file type
        if not image.content_type or not image.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        file_content = await image.read()
        
        # Delete existing images if any
        if recipe.image_url or recipe.thumbnail_url:
            await storage_service.delete_recipe_images(recipe_id)
        
        # Upload new image
        original_url, thumbnail_url = await storage_service.upload_recipe_image(
            recipe_id, image.filename, file_content
        )
        
        if not original_url or not thumbnail_url:
            raise HTTPException(status_code=500, detail="Failed to upload image")
        
        # Update recipe with new image URLs
        update_data = RecipeUpdate(
            image_url=original_url,
            thumbnail_url=thumbnail_url
        )
        updated_recipe = await repo.update_recipe(recipe_id, update_data)
        
        return updated_recipe
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading image for recipe {recipe_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload image")

@router.delete("/{recipe_id}/image", response_model=Recipe)
async def delete_recipe_image(
    recipe_id: str,
    repo: RecipeRepository = Depends(get_recipe_repository)
):
    """Delete the image for a recipe"""
    try:
        # Check if recipe exists
        recipe = await repo.get_recipe(recipe_id)
        if not recipe:
            raise HTTPException(status_code=404, detail="Recipe not found")
        
        # Delete images from storage
        await storage_service.delete_recipe_images(recipe_id)
        
        # Update recipe to remove image URLs
        update_data = RecipeUpdate(
            image_url=None,
            thumbnail_url=None
        )
        updated_recipe = await repo.update_recipe(recipe_id, update_data)
        
        return updated_recipe
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting image for recipe {recipe_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete image")
