import os
import uuid
import logging
from typing import Optional, Tuple
from io import BytesIO
from datetime import datetime, timedelta
from PIL import Image
from azure.storage.blob import BlobServiceClient, BlobClient, generate_blob_sas, BlobSasPermissions
from azure.core.exceptions import AzureError
from app.config import get_storage_account_name, get_storage_account_key, get_storage_container_name

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        # Check for Azure Storage credentials in environment variables
        storage_account_name = get_storage_account_name()
        storage_account_key = get_storage_account_key()
        storage_container_name = get_storage_container_name()
        
        # Store credentials for SAS URL generation
        self.account_name = storage_account_name
        self.account_key = storage_account_key
        
        if not storage_account_name or not storage_account_key:
            logger.warning("Azure Storage credentials not configured. Image upload will be disabled.")
            logger.info("Set these environment variables to enable image uploads:")
            logger.info("- AZURE_STORAGE_ACCOUNT_NAME")
            logger.info("- AZURE_STORAGE_ACCOUNT_KEY") 
            logger.info("- AZURE_STORAGE_CONTAINER_NAME (optional, defaults to 'recipe-images')")
            self.blob_service_client = None
            return
            
        account_url = f"https://{storage_account_name}.blob.core.windows.net"
        self.blob_service_client = BlobServiceClient(
            account_url=account_url,
            credential=storage_account_key
        )
        self.container_name = storage_container_name
        
        # Ensure container exists
        self._ensure_container_exists()
    
    def _ensure_container_exists(self):
        """Ensure the blob container exists"""
        if not self.blob_service_client:
            return
            
        try:
            container_client = self.blob_service_client.get_container_client(self.container_name)
            if not container_client.exists():
                # Try to create container with public blob access first
                try:
                    container_client.create_container(public_access="blob")
                    logger.info(f"Created container: {self.container_name} with public blob access")
                except Exception as e:
                    if "PublicAccessNotPermitted" in str(e):
                        # If public access is not allowed, create private container
                        container_client.create_container()
                        logger.info(f"Created container: {self.container_name} (private - public access not permitted)")
                        logger.warning("Images will require authentication to view. Consider enabling public access on the storage account for better user experience.")
                    else:
                        raise e
            else:
                logger.info(f"Container already exists: {self.container_name}")
        except AzureError as e:
            logger.error(f"Error ensuring container exists: {e}")
    
    def _generate_blob_paths(self, recipe_id: str, original_filename: str) -> Tuple[str, str]:
        """Generate blob paths for original and thumbnail images"""
        file_extension = os.path.splitext(original_filename)[1].lower()
        if not file_extension:
            file_extension = '.jpg'
        
        base_path = f"recipes/{recipe_id}"
        original_path = f"{base_path}/original{file_extension}"
        thumbnail_path = f"{base_path}/thumbnail{file_extension}"
        
        return original_path, thumbnail_path
    
    def _create_thumbnail(self, image_data: bytes, max_size: Tuple[int, int] = (300, 300)) -> bytes:
        """Create a thumbnail from image data"""
        try:
            image = Image.open(BytesIO(image_data))
            
            # Convert to RGB if necessary (handles RGBA, P mode, etc.)
            if image.mode in ('RGBA', 'P'):
                image = image.convert('RGB')
            
            # Create thumbnail
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save to bytes
            thumbnail_io = BytesIO()
            image.save(thumbnail_io, format='JPEG', quality=85, optimize=True)
            return thumbnail_io.getvalue()
        except Exception as e:
            logger.error(f"Error creating thumbnail: {e}")
            raise ValueError("Failed to process image")
    
    def _generate_sas_url(self, blob_path: str, expiry_hours: int = 24) -> str:
        """Generate a SAS URL for a blob with read permissions"""
        if not self.account_name or not self.account_key:
            logger.error("Cannot generate SAS URL: missing account credentials")
            return ""
        
        try:
            # Generate SAS token
            sas_token = generate_blob_sas(
                account_name=self.account_name,
                container_name=self.container_name,
                blob_name=blob_path,
                account_key=self.account_key,
                permission=BlobSasPermissions(read=True),
                expiry=datetime.utcnow() + timedelta(hours=expiry_hours)
            )
            
            # Construct full URL with SAS token
            sas_url = f"https://{self.account_name}.blob.core.windows.net/{self.container_name}/{blob_path}?{sas_token}"
            logger.debug(f"Generated SAS URL for {blob_path}: {sas_url[:100]}...")  # Log partial URL for debugging
            return sas_url
        except Exception as e:
            logger.error(f"Error generating SAS URL for {blob_path}: {e}")
            # Return empty string instead of invalid URL
            return ""
    
    async def upload_recipe_image(self, recipe_id: str, filename: str, file_content: bytes) -> Tuple[Optional[str], Optional[str]]:
        """
        Upload recipe image and create thumbnail
        Returns tuple of (original_url, thumbnail_url) or (None, None) if upload fails
        """
        if not self.blob_service_client:
            logger.warning("Storage not configured, skipping image upload")
            return None, None
        
        try:
            # Validate image
            try:
                Image.open(BytesIO(file_content)).verify()
            except Exception as e:
                logger.error(f"Image validation failed: {e}")
                raise ValueError("Invalid image file")
            
            # Generate blob paths
            original_path, thumbnail_path = self._generate_blob_paths(recipe_id, filename)
            
            # Create thumbnail
            thumbnail_data = self._create_thumbnail(file_content)
            
            # Upload original image
            original_blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=original_path
            )
            original_blob_client.upload_blob(
                file_content,
                overwrite=True,
                content_type=self._get_content_type(filename)
            )
            
            # Upload thumbnail
            thumbnail_blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=thumbnail_path
            )
            thumbnail_blob_client.upload_blob(
                thumbnail_data,
                overwrite=True,
                content_type="image/jpeg"
            )
            
            # Generate SAS URLs (valid for 1 year since these are recipe images)
            original_url = self._generate_sas_url(original_path, expiry_hours=8760)  # 1 year
            thumbnail_url = self._generate_sas_url(thumbnail_path, expiry_hours=8760)  # 1 year
            
            # Ensure we have valid URLs
            if not original_url or not thumbnail_url:
                logger.error("Failed to generate valid SAS URLs")
                return None, None
            
            logger.info(f"Successfully uploaded images for recipe {recipe_id}")
            return original_url, thumbnail_url
            
        except ValueError:
            raise
        except AzureError as e:
            logger.error(f"Azure storage error: {e}")
            raise RuntimeError("Failed to upload image to storage")
        except Exception as e:
            logger.error(f"Unexpected error uploading image: {e}")
            raise RuntimeError("Failed to upload image")
    
    async def delete_recipe_images(self, recipe_id: str):
        """Delete all images for a recipe"""
        if not self.blob_service_client:
            return
        
        try:
            # List all blobs with the recipe prefix
            blob_list = self.blob_service_client.get_container_client(self.container_name).list_blobs(
                name_starts_with=f"recipes/{recipe_id}/"
            )
            
            # Delete each blob
            for blob in blob_list:
                blob_client = self.blob_service_client.get_blob_client(
                    container=self.container_name,
                    blob=blob.name
                )
                blob_client.delete_blob()
            
            logger.info(f"Deleted images for recipe {recipe_id}")
            
        except AzureError as e:
            logger.error(f"Error deleting images for recipe {recipe_id}: {e}")
    
    def _get_content_type(self, filename: str) -> str:
        """Get content type based on file extension"""
        extension = os.path.splitext(filename)[1].lower()
        content_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        return content_types.get(extension, 'image/jpeg')


# Global instance
storage_service = StorageService()
