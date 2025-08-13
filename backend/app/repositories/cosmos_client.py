from azure.cosmos import CosmosClient, PartitionKey
from typing import Optional
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class CosmosDBClient:
    def __init__(self):
        self.client: Optional[CosmosClient] = None
        self.database = None
        self.containers = {}
        
    def connect(self):
        """Initialize connection to Cosmos DB"""
        try:
            self.client = CosmosClient(settings.cosmos_endpoint, settings.cosmos_key)
            
            # Create database if it doesn't exist
            self.database = self.client.create_database_if_not_exists(id=settings.cosmos_db_name)
            logger.info(f"Database '{settings.cosmos_db_name}' is ready")
            
            # Initialize containers
            self._ensure_containers()
            logger.info("Connected to Cosmos DB successfully")
            
        except Exception as e:
            logger.error(f"Failed to connect to Cosmos DB: {e}")
            raise
    
    def _ensure_containers(self):
        """Ensure all required containers exist"""
        container_configs = [
            {"name": "recipes", "partition_key": "/userId"},
            {"name": "mealplans", "partition_key": "/userId"},
            {"name": "userprofiles", "partition_key": "/userId"}
        ]
        
        for config in container_configs:
            try:
                container = self.database.create_container_if_not_exists(
                    id=config["name"],
                    partition_key=PartitionKey(path=config["partition_key"])
                )
                self.containers[config["name"]] = container
                logger.info(f"Container '{config['name']}' ready")
            except Exception as e:
                logger.error(f"Failed to create container '{config['name']}': {e}")
                raise
    
    def get_container(self, container_name: str):
        """Get a container client"""
        if container_name not in self.containers:
            raise ValueError(f"Container '{container_name}' not found")
        return self.containers[container_name]
    
    def disconnect(self):
        """Close the connection"""
        if self.client:
            self.client = None
            self.database = None
            self.containers = {}
            logger.info("Disconnected from Cosmos DB")

# Global instance
cosmos_client = CosmosDBClient()
