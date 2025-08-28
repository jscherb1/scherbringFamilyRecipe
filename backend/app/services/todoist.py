import httpx
import json
from typing import List, Dict, Any, Optional
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class TodoistService:
    """Service for interacting with Todoist API"""
    
    def __init__(self):
        self.api_key = settings.todoist_api_key
        self.base_url = "https://api.todoist.com/rest/v2"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def get_projects(self) -> List[Dict[str, Any]]:
        """Get all Todoist projects/lists"""
        if not self.api_key:
            raise ValueError("Todoist API key not configured")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/projects",
                    headers=self.headers
                )
                response.raise_for_status()
                projects = response.json()
                
                # Return simplified project data
                return [
                    {
                        "id": project["id"],
                        "name": project["name"],
                        "color": project.get("color", ""),
                        "is_shared": project.get("is_shared", False),
                        "is_favorite": project.get("is_favorite", False)
                    }
                    for project in projects
                ]
            except httpx.HTTPError as e:
                logger.error(f"Error fetching Todoist projects: {e}")
                raise Exception(f"Failed to fetch Todoist projects: {str(e)}")
    
    async def get_project_tasks(self, project_id: str) -> List[Dict[str, Any]]:
        """Get all tasks in a specific project"""
        if not self.api_key:
            raise ValueError("Todoist API key not configured")
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.base_url}/tasks",
                    headers=self.headers,
                    params={"project_id": project_id}
                )
                response.raise_for_status()
                tasks = response.json()
                
                # Return simplified task data with just content (task name)
                return [
                    {
                        "id": task["id"],
                        "content": task["content"],
                        "is_completed": task.get("is_completed", False)
                    }
                    for task in tasks
                ]
            except httpx.HTTPError as e:
                logger.error(f"Error fetching Todoist tasks for project {project_id}: {e}")
                raise Exception(f"Failed to fetch tasks: {str(e)}")
    
    async def add_tasks(self, project_id: str, task_contents: List[str]) -> int:
        """
        Add multiple tasks to a project.
        First checks for existing tasks to avoid duplicates.
        Returns the number of tasks actually added.
        """
        if not self.api_key:
            raise ValueError("Todoist API key not configured")
        
        if not task_contents:
            return 0
        
        try:
            # Get existing tasks in the project
            existing_tasks = await self.get_project_tasks(project_id)
            existing_contents = {task["content"].lower().strip() for task in existing_tasks if not task["is_completed"]}
            
            # Filter out tasks that already exist (case-insensitive)
            tasks_to_add = [
                content for content in task_contents 
                if content.lower().strip() not in existing_contents
            ]
            
            if not tasks_to_add:
                logger.info("All tasks already exist in the project")
                return 0
            
            # Add new tasks
            added_count = 0
            async with httpx.AsyncClient() as client:
                for content in tasks_to_add:
                    try:
                        task_data = {
                            "content": content,
                            "project_id": project_id
                        }
                        
                        response = await client.post(
                            f"{self.base_url}/tasks",
                            headers=self.headers,
                            json=task_data
                        )
                        response.raise_for_status()
                        added_count += 1
                        logger.info(f"Added task: {content}")
                        
                    except httpx.HTTPError as e:
                        logger.error(f"Error adding task '{content}': {e}")
                        # Continue with other tasks even if one fails
                        continue
            
            return added_count
            
        except Exception as e:
            logger.error(f"Error in add_tasks: {e}")
            raise Exception(f"Failed to add tasks to Todoist: {str(e)}")
    
    async def test_connection(self) -> bool:
        """Test if the API key is valid and connection works"""
        if not self.api_key:
            return False
        
        try:
            projects = await self.get_projects()
            return True
        except Exception:
            return False

# Global instance
todoist_service = TodoistService()
