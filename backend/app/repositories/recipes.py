from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid
import logging
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from app.repositories.cosmos_client import cosmos_client
from app.models.recipe import Recipe, RecipeCreate, RecipeUpdate, Ingredient

logger = logging.getLogger(__name__)

class RecipeRepository:
    def __init__(self):
        self.container_name = "recipes"
        self.user_id = "me"  # Single user for now
    
    def _get_container(self):
        return cosmos_client.get_container(self.container_name)
    
    async def create_recipe(self, recipe_data: RecipeCreate) -> Recipe:
        """Create a new recipe"""
        # Check if title already exists for this user
        existing = await self.get_recipe_by_title(recipe_data.title)
        if existing:
            raise ValueError(f"Recipe with title '{recipe_data.title}' already exists")
        
        recipe = Recipe(**recipe_data.model_dump())
        recipe.calculate_total_time()
        
        # Dedupe tags
        recipe.tags = list(set(recipe.tags))
        
        container = self._get_container()
        created_item = container.create_item(body=recipe.model_dump())
        
        logger.info(f"Created recipe: {recipe.id}")
        return Recipe.from_cosmos_data(created_item)
    
    async def get_recipe(self, recipe_id: str) -> Optional[Recipe]:
        """Get recipe by ID"""
        try:
            container = self._get_container()
            item = container.read_item(item=recipe_id, partition_key=self.user_id)
            return Recipe.from_cosmos_data(item)
        except CosmosResourceNotFoundError:
            return None
    
    async def get_recipe_by_title(self, title: str) -> Optional[Recipe]:
        """Get recipe by title for current user"""
        container = self._get_container()
        query = "SELECT * FROM c WHERE c.userId = @user_id AND c.title = @title"
        parameters = [
            {"name": "@user_id", "value": self.user_id},
            {"name": "@title", "value": title}
        ]
        
        items = list(container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True
        ))
        
        return Recipe.from_cosmos_data(items[0]) if items else None
    
    async def list_recipes(
        self,
        search: Optional[str] = None,
        tag: Optional[str] = None,
        protein_type: Optional[str] = None,
        meal_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """List recipes with filtering and pagination"""
        container = self._get_container()
        
        # Build query
        query_parts = ["SELECT * FROM c WHERE c.userId = @user_id AND c.type = 'Recipe'"]
        parameters = [{"name": "@user_id", "value": self.user_id}]
        
        if search:
            # Search in title, ingredients, and tags
            query_parts.append("""AND (
                CONTAINS(c.title, @search, true) OR 
                EXISTS(SELECT VALUE i FROM i IN c.ingredients WHERE CONTAINS(i, @search, true)) OR
                EXISTS(SELECT VALUE t FROM t IN c.tags WHERE CONTAINS(t, @search, true))
            )""")
            parameters.append({"name": "@search", "value": search})
        
        if tag:
            query_parts.append("AND EXISTS(SELECT VALUE t FROM t IN c.tags WHERE t = @tag)")
            parameters.append({"name": "@tag", "value": tag})
        
        if protein_type:
            query_parts.append("AND c.proteinType = @protein_type")
            parameters.append({"name": "@protein_type", "value": protein_type})
        
        if meal_type:
            query_parts.append("AND c.mealType = @meal_type")
            parameters.append({"name": "@meal_type", "value": meal_type})
        
        # Remove ORDER BY to avoid CosmosDB query issues
        # We'll sort the results in Python instead
        
        query = " ".join(query_parts)
        
        # Execute query
        items = list(container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True
        ))
        
        # Sort by title in Python (to avoid CosmosDB ORDER BY issues)
        items.sort(key=lambda x: x.get('title', '').lower())
        
        # Manual pagination (Cosmos DB pagination is complex for this use case)
        total = len(items)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_items = items[start_idx:end_idx]
        
        recipes = [Recipe.from_cosmos_data(item) for item in paginated_items]
        
        return {
            "recipes": recipes,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }
    
    async def update_recipe(self, recipe_id: str, recipe_data: RecipeUpdate) -> Optional[Recipe]:
        """Update an existing recipe"""
        existing = await self.get_recipe(recipe_id)
        if not existing:
            logger.error(f"Recipe {recipe_id} not found for update")
            return None
        
        # Ensure ingredients are properly normalized before updating
        existing.normalize_ingredients()
        
        # Update fields - use by_alias=False to get original field names
        update_data = recipe_data.model_dump(exclude_unset=True, by_alias=False)
        
        # Handle ingredients in update_data if present
        if 'ingredients' in update_data and update_data['ingredients'] is not None:
            normalized_update_ingredients = []
            for ingredient in update_data['ingredients']:
                if isinstance(ingredient, dict):
                    normalized_update_ingredients.append(Ingredient(**ingredient))
                elif isinstance(ingredient, str):
                    normalized_update_ingredients.append(Ingredient(text=ingredient, includeInShoppingList=True))
                else:
                    normalized_update_ingredients.append(ingredient)
            update_data['ingredients'] = normalized_update_ingredients
        
        for field, value in update_data.items():
            setattr(existing, field, value)
        
        existing.updated_at = datetime.utcnow()
        existing.calculate_total_time()
        
        # Dedupe tags if updated
        if recipe_data.tags is not None:
            existing.tags = list(set(existing.tags))
        
        try:
            container = self._get_container()
            recipe_dict = existing.model_dump()  # Use camelCase aliases for Cosmos DB
            
            updated_item = container.replace_item(
                item=recipe_id,
                body=recipe_dict
            )
            
            logger.info(f"Updated recipe: {recipe_id}")
            return Recipe.from_cosmos_data(updated_item)
            
        except Exception as e:
            logger.error(f"Error updating recipe {recipe_id} in CosmosDB: {e}")
            raise
    
    async def delete_recipe(self, recipe_id: str) -> bool:
        """Delete a recipe"""
        try:
            container = self._get_container()
            container.delete_item(item=recipe_id, partition_key=self.user_id)
            logger.info(f"Deleted recipe: {recipe_id}")
            return True
        except CosmosResourceNotFoundError:
            return False
    
    async def get_all_tags(self) -> List[str]:
        """Get all unique tags across all recipes"""
        container = self._get_container()
        query = """
            SELECT DISTINCT t 
            FROM c 
            JOIN t IN c.tags 
            WHERE c.userId = @user_id AND c.type = 'Recipe'
        """
        parameters = [{"name": "@user_id", "value": self.user_id}]
        
        items = list(container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True
        ))
        
        # Sort tags in Python instead of using ORDER BY in the query
        tags = [item['t'] for item in items]
        return sorted(tags)
    
    async def update_last_cooked(self, recipe_ids: List[str], cooked_date: datetime) -> None:
        """Update last_cooked_at for multiple recipes"""
        container = self._get_container()
        
        for recipe_id in recipe_ids:
            try:
                # Read current recipe
                item = container.read_item(item=recipe_id, partition_key=self.user_id)
                recipe = Recipe.from_cosmos_data(item)
                
                # Update last cooked date
                recipe.last_cooked_at = cooked_date
                recipe.updated_at = datetime.utcnow()
                
                # Save back - use model_dump() with proper serialization
                recipe_data = recipe.model_dump()
                container.replace_item(
                    item=recipe_id,
                    body=recipe_data
                )
                
            except CosmosResourceNotFoundError:
                logger.warning(f"Recipe {recipe_id} not found for last_cooked update")
                continue
            except Exception as e:
                logger.error(f"Error updating recipe {recipe_id}: {e}")
                continue
        
        logger.info(f"Updated last_cooked_at for {len(recipe_ids)} recipes")

    async def remove_tag_from_all_recipes(self, tag: str) -> int:
        """Remove a specific tag from all recipes that have it"""
        container = self._get_container()
        
        logger.info(f"Attempting to remove tag '{tag}' from all recipes")
        
        # Query for all recipes that have the tag
        query = f"""
        SELECT c.id
        FROM c 
        WHERE c.type = 'Recipe' 
        AND c.userId = @userId 
        AND ARRAY_CONTAINS(c.tags, @tag)
        """
        
        parameters = [
            {"name": "@userId", "value": self.user_id},
            {"name": "@tag", "value": tag}
        ]
        
        recipes_to_update = list(container.query_items(
            query=query,
            parameters=parameters
        ))
        
        logger.info(f"Found {len(recipes_to_update)} recipes with tag '{tag}'")
        
        updated_count = 0
        
        for recipe_data in recipes_to_update:
            try:
                recipe_id = recipe_data['id']
                logger.debug(f"Processing recipe {recipe_id}")
                
                # Fetch the full recipe to ensure we have all data
                full_recipe = await self.get_recipe(recipe_id)
                if not full_recipe:
                    logger.error(f"Could not fetch full recipe data for {recipe_id}")
                    continue
                
                # Check if the tag is actually in the recipe
                if tag not in full_recipe.tags:
                    logger.warning(f"Tag '{tag}' not found in recipe {recipe_id}, skipping")
                    continue
                
                # Remove the tag from the tags array
                updated_tags = [t for t in full_recipe.tags if t != tag]
                
                logger.debug(f"Updated tags for recipe {recipe_id}: {full_recipe.tags} -> {updated_tags}")
                
                # Update the recipe tags
                full_recipe.tags = updated_tags
                full_recipe.updated_at = datetime.utcnow()
                
                # Use the full recipe data for the update
                container.replace_item(
                    item=recipe_id,
                    body=full_recipe.model_dump()
                )
                
                updated_count += 1
                logger.info(f"Successfully removed tag '{tag}' from recipe {recipe_id}")
                
            except Exception as e:
                logger.error(f"Error removing tag '{tag}' from recipe {recipe_data.get('id', 'unknown')}: {e}")
                continue
        
        logger.info(f"Successfully removed tag '{tag}' from {updated_count} recipes")
        return updated_count

# Global instance
recipe_repository = RecipeRepository()
