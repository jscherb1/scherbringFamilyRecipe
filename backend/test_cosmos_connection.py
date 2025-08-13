#!/usr/bin/env python3
"""
Test script to verify Cosmos DB connection and setup
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.repositories.cosmos_client import cosmos_client
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_cosmos_connection():
    """Test the Cosmos DB connection and setup"""
    print("🔍 Testing Cosmos DB Connection...")
    print(f"Endpoint: {settings.cosmos_endpoint}")
    print(f"Database: {settings.cosmos_db_name}")
    print("-" * 50)
    
    try:
        # Test connection
        cosmos_client.connect()
        print("✅ Successfully connected to Cosmos DB!")
        
        # Test container access
        for container_name in ["recipes", "mealplans", "userprofiles"]:
            container = cosmos_client.get_container(container_name)
            print(f"✅ Container '{container_name}' is ready")
        
        print("\n🎉 All Cosmos DB components are working correctly!")
        return True
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\n💡 Make sure to:")
        print("1. Update COSMOS_ENDPOINT in .env with your actual endpoint")
        print("2. Update COSMOS_KEY in .env with your primary key")
        print("3. Ensure your Cosmos DB account is running in Azure")
        return False
    
    finally:
        cosmos_client.disconnect()

if __name__ == "__main__":
    test_cosmos_connection()
