#!/usr/bin/env python3

"""
Test script for Azure Storage integration
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the app directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.storage import storage_service

async def test_storage_service():
    """Test basic storage service functionality"""
    print("🍳 Recipe App - Storage Service Test")
    print("====================================")
    
    # Check if storage service is properly configured
    if storage_service.blob_service_client is None:
        print("❌ Storage service not configured")
        print("\nImage uploads will be disabled. To enable image uploads, set:")
        print("- AZURE_STORAGE_ACCOUNT_NAME")
        print("- AZURE_STORAGE_ACCOUNT_KEY")
        print("- AZURE_STORAGE_CONTAINER_NAME (optional)")
        print("\nYou can still use the app without images!")
        return False
    
    print("✅ Storage service configured successfully")
    print(f"   Account: {os.getenv('AZURE_STORAGE_ACCOUNT_NAME', 'N/A')}")
    print(f"   Container: {storage_service.container_name}")
    
    # Test container exists
    try:
        container_client = storage_service.blob_service_client.get_container_client(
            storage_service.container_name
        )
        exists = container_client.exists()
        if exists:
            print("✅ Container exists and is accessible")
        else:
            print("❌ Container does not exist (will be created automatically)")
            return False
    except Exception as e:
        print(f"❌ Error checking container: {e}")
        print("   This might be a permissions issue or incorrect credentials")
        return False
    
    print("\n🎉 Storage is ready for recipe images!")
    return True

if __name__ == "__main__":
    success = asyncio.run(test_storage_service())
    if success:
        print("\nNext steps:")
        print("1. Start the backend server: python main.py")
        print("2. Start the frontend: cd ../frontend && npm run dev")
        print("3. Create a recipe and try uploading an image!")
    else:
        print("\nThe app will work without image uploads.")
        print("See IMAGE_UPLOAD_SETUP.md for configuration instructions.")
