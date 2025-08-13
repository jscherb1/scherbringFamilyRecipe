#!/usr/bin/env python3
"""
Test datetime serialization fix for Recipe model
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from datetime import datetime
from app.models.recipe import Recipe, RecipeCreate
import json

def test_datetime_serialization():
    """Test that datetime fields are properly serialized"""
    print("🧪 Testing datetime serialization fix...")
    
    # Create a test recipe
    recipe_data = RecipeCreate(
        title="Test Recipe",
        description="A test recipe",
        ingredients=["ingredient 1", "ingredient 2"],
        steps=["step 1", "step 2"],
        tags=["test"],
        prep_time_min=10,
        cook_time_min=20
    )
    
    # Create Recipe instance
    recipe = Recipe(**recipe_data.model_dump())
    
    print(f"✅ Recipe created with ID: {recipe.id}")
    print(f"   Created at: {recipe.created_at}")
    print(f"   Updated at: {recipe.updated_at}")
    
    # Test model_dump serialization
    try:
        serialized = recipe.model_dump()
        print("✅ model_dump() successful")
        print(f"   Serialized created_at: {serialized['created_at']} (type: {type(serialized['created_at'])})")
        print(f"   Serialized updated_at: {serialized['updated_at']} (type: {type(serialized['updated_at'])})")
        
        # Test JSON serialization
        json_str = json.dumps(serialized)
        print("✅ JSON serialization successful")
        print(f"   JSON length: {len(json_str)} characters")
        
        # Test round-trip conversion
        parsed_data = json.loads(json_str)
        recreated_recipe = Recipe.from_cosmos_data(parsed_data)
        print("✅ Round-trip conversion successful")
        print(f"   Recreated recipe ID: {recreated_recipe.id}")
        print(f"   Recreated created_at: {recreated_recipe.created_at} (type: {type(recreated_recipe.created_at)})")
        
        return True
        
    except Exception as e:
        print(f"❌ Serialization failed: {e}")
        return False

if __name__ == "__main__":
    if test_datetime_serialization():
        print("\n🎉 All datetime serialization tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Datetime serialization tests failed!")
        sys.exit(1)
