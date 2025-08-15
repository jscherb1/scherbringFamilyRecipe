from typing import Optional
from datetime import datetime
import logging
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from app.repositories.cosmos_client import cosmos_client
from app.models.profile import UserProfile, UserProfileCreate, UserProfileUpdate

logger = logging.getLogger(__name__)

class ProfileRepository:
    def __init__(self):
        self.container_name = "userprofiles"
        self.user_id = "me"  # Single user for now
        self.profile_id = "profile-me"  # Fixed profile ID
    
    def _get_container(self):
        return cosmos_client.get_container(self.container_name)
    
    async def get_profile(self) -> Optional[UserProfile]:
        """Get user profile (creates default if not exists)"""
        try:
            container = self._get_container()
            item = container.read_item(item=self.profile_id, partition_key=self.user_id)
            return UserProfile.from_cosmos_data(item)
        except CosmosResourceNotFoundError:
            # Create default profile
            return await self.create_default_profile()
    
    async def create_default_profile(self) -> UserProfile:
        """Create default user profile"""
        profile_data = UserProfileCreate()
        profile = UserProfile(**profile_data.model_dump())
        
        container = self._get_container()
        created_item = container.create_item(body=profile.model_dump())
        
        logger.info("Created default user profile")
        return UserProfile(**created_item)
    
    async def update_profile(self, profile_data: UserProfileUpdate) -> UserProfile:
        """Update user profile"""
        existing = await self.get_profile()
        
        # Update fields
        update_data = profile_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:  # Handle empty lists and other falsy values
                setattr(existing, field, value)
        
        existing.updated_at = datetime.utcnow()
        
        container = self._get_container()
        updated_item = container.replace_item(
            item=self.profile_id,
            body=existing.model_dump()
        )
        
        logger.info("Updated user profile")
        return UserProfile.from_cosmos_data(updated_item)
    
    async def add_tag_to_catalog(self, tag: str) -> UserProfile:
        """Add a new tag to the catalog"""
        profile = await self.get_profile()
        
        if tag not in profile.tag_catalog:
            profile.tag_catalog.append(tag)
            profile.tag_catalog.sort()  # Keep sorted
            profile.updated_at = datetime.utcnow()
            
            container = self._get_container()
            updated_item = container.replace_item(
                item=self.profile_id,
                body=profile.model_dump()
            )
            
            logger.info(f"Added tag '{tag}' to catalog")
            return UserProfile.from_cosmos_data(updated_item)
        
        return profile
    
    async def remove_tag_from_catalog(self, tag: str) -> UserProfile:
        """Remove a tag from the catalog"""
        profile = await self.get_profile()
        
        if tag in profile.tag_catalog:
            profile.tag_catalog.remove(tag)
            profile.updated_at = datetime.utcnow()
            
            container = self._get_container()
            updated_item = container.replace_item(
                item=self.profile_id,
                body=profile.model_dump()
            )
            
            logger.info(f"Removed tag '{tag}' from catalog")
            return UserProfile.from_cosmos_data(updated_item)
        
        return profile

# Global instance
profile_repository = ProfileRepository()
