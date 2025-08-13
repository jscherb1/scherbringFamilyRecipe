from typing import List, Optional, Dict, Any
from datetime import datetime, date
import logging
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from app.repositories.cosmos_client import cosmos_client
from app.models.meal_plan import MealPlan, MealPlanCreate, MealPlanUpdate

logger = logging.getLogger(__name__)

class MealPlanRepository:
    def __init__(self):
        self.container_name = "mealplans"
        self.user_id = "me"  # Single user for now
    
    def _get_container(self):
        return cosmos_client.get_container(self.container_name)
    
    async def create_meal_plan(self, meal_plan_data: MealPlanCreate) -> MealPlan:
        """Create a new meal plan"""
        meal_plan = MealPlan(**meal_plan_data.model_dump())
        
        container = self._get_container()
        created_item = container.create_item(body=meal_plan.model_dump())
        
        logger.info(f"Created meal plan: {meal_plan.id}")
        return MealPlan(**created_item)
    
    async def get_meal_plan(self, meal_plan_id: str) -> Optional[MealPlan]:
        """Get meal plan by ID"""
        try:
            container = self._get_container()
            item = container.read_item(item=meal_plan_id, partition_key=self.user_id)
            return MealPlan(**item)
        except CosmosResourceNotFoundError:
            return None
    
    async def list_meal_plans(
        self,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None
    ) -> List[MealPlan]:
        """List meal plans with optional date filtering"""
        container = self._get_container()
        
        query_parts = ["SELECT * FROM c WHERE c.userId = @user_id AND c.type = 'MealPlan'"]
        parameters = [{"name": "@user_id", "value": self.user_id}]
        
        if from_date:
            query_parts.append("AND c.weekStartDate >= @from_date")
            parameters.append({"name": "@from_date", "value": from_date.isoformat()})
        
        if to_date:
            query_parts.append("AND c.weekStartDate <= @to_date")
            parameters.append({"name": "@to_date", "value": to_date.isoformat()})
        
        # Order by week start date descending (most recent first)
        query_parts.append("ORDER BY c.weekStartDate DESC")
        
        query = " ".join(query_parts)
        
        items = list(container.query_items(
            query=query,
            parameters=parameters,
            enable_cross_partition_query=True
        ))
        
        return [MealPlan(**item) for item in items]
    
    async def update_meal_plan(self, meal_plan_id: str, meal_plan_data: MealPlanUpdate) -> Optional[MealPlan]:
        """Update an existing meal plan"""
        existing = await self.get_meal_plan(meal_plan_id)
        if not existing:
            return None
        
        # Update fields
        update_data = meal_plan_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(existing, field, value)
        
        existing.updated_at = datetime.utcnow()
        
        container = self._get_container()
        updated_item = container.replace_item(
            item=meal_plan_id,
            body=existing.model_dump()
        )
        
        logger.info(f"Updated meal plan: {meal_plan_id}")
        return MealPlan(**updated_item)
    
    async def delete_meal_plan(self, meal_plan_id: str) -> bool:
        """Delete a meal plan"""
        try:
            container = self._get_container()
            container.delete_item(item=meal_plan_id, partition_key=self.user_id)
            logger.info(f"Deleted meal plan: {meal_plan_id}")
            return True
        except CosmosResourceNotFoundError:
            return False

# Global instance
meal_plan_repository = MealPlanRepository()
