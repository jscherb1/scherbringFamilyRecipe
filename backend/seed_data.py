import asyncio
import logging
from datetime import datetime
from app.models.recipe import RecipeCreate, ProteinType, MealType
from app.repositories.recipes import recipe_repository
from app.repositories.cosmos_client import cosmos_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SEED_RECIPES = [
    {
        "title": "Classic Chicken Teriyaki Bowl",
        "description": "Delicious teriyaki chicken served over rice with vegetables",
        "ingredients": [
            "1 lb chicken breast, diced",
            "2 cups jasmine rice",
            "1/4 cup soy sauce",
            "2 tbsp honey",
            "1 tbsp rice vinegar",
            "1 tsp sesame oil",
            "2 cloves garlic, minced",
            "1 cup broccoli florets",
            "1 carrot, sliced",
            "2 green onions, chopped",
            "1 tbsp sesame seeds"
        ],
        "steps": [
            "Cook rice according to package directions",
            "Mix soy sauce, honey, vinegar, and sesame oil for teriyaki sauce",
            "Cook chicken in a large pan until golden brown",
            "Add garlic and cook for 1 minute",
            "Pour teriyaki sauce over chicken and simmer",
            "Steam broccoli and carrots until tender",
            "Serve chicken over rice with vegetables",
            "Garnish with green onions and sesame seeds"
        ],
        "tags": ["quick", "healthy", "kid-friendly"],
        "protein_type": ProteinType.CHICKEN,
        "meal_type": MealType.DINNER,
        "prep_time_min": 15,
        "cook_time_min": 20,
        "servings": 4,
        "rating": 5
    },
    {
        "title": "Creamy Vegetarian Pasta",
        "description": "Creamy pasta with mixed vegetables and herbs",
        "ingredients": [
            "1 lb penne pasta",
            "2 cups heavy cream",
            "1/2 cup parmesan cheese, grated",
            "2 zucchini, diced",
            "1 bell pepper, diced",
            "1 cup cherry tomatoes, halved",
            "3 cloves garlic, minced",
            "2 tbsp olive oil",
            "1/4 cup fresh basil, chopped",
            "Salt and pepper to taste"
        ],
        "steps": [
            "Cook pasta according to package directions",
            "Heat olive oil in a large pan",
            "Sauté zucchini and bell pepper until tender",
            "Add garlic and cook for 1 minute",
            "Add cherry tomatoes and cook until softened",
            "Pour in cream and bring to a simmer",
            "Add parmesan cheese and stir until melted",
            "Toss with pasta and fresh basil",
            "Season with salt and pepper"
        ],
        "tags": ["vegetarian", "comfort-food"],
        "protein_type": ProteinType.VEGETARIAN,
        "meal_type": MealType.DINNER,
        "prep_time_min": 10,
        "cook_time_min": 25,
        "servings": 6,
        "rating": 4
    },
    {
        "title": "Spicy Beef Tacos",
        "description": "Flavorful beef tacos with fresh toppings",
        "ingredients": [
            "1 lb ground beef",
            "8 corn tortillas",
            "1 onion, diced",
            "2 cloves garlic, minced",
            "1 tbsp chili powder",
            "1 tsp cumin",
            "1/2 tsp paprika",
            "1/4 tsp cayenne pepper",
            "1 cup shredded lettuce",
            "1 cup diced tomatoes",
            "1/2 cup shredded cheese",
            "1/4 cup sour cream",
            "2 limes, cut into wedges"
        ],
        "steps": [
            "Brown ground beef in a large skillet",
            "Add onion and cook until softened",
            "Add garlic and spices, cook for 1 minute",
            "Simmer until beef is fully cooked",
            "Warm tortillas in a dry pan",
            "Fill tortillas with beef mixture",
            "Top with lettuce, tomatoes, and cheese",
            "Serve with sour cream and lime wedges"
        ],
        "tags": ["spicy", "quick"],
        "protein_type": ProteinType.BEEF,
        "meal_type": MealType.DINNER,
        "prep_time_min": 10,
        "cook_time_min": 15,
        "servings": 4,
        "rating": 5
    },
    {
        "title": "Baked Salmon with Lemon",
        "description": "Simple and healthy baked salmon with lemon and herbs",
        "ingredients": [
            "4 salmon fillets",
            "2 lemons, sliced",
            "2 tbsp olive oil",
            "2 cloves garlic, minced",
            "1 tbsp fresh dill",
            "1 tbsp fresh parsley",
            "Salt and pepper to taste",
            "1 lb asparagus, trimmed",
            "1 tbsp butter"
        ],
        "steps": [
            "Preheat oven to 400°F",
            "Place salmon on a baking sheet",
            "Drizzle with olive oil and season with salt and pepper",
            "Top with garlic, dill, and lemon slices",
            "Toss asparagus with butter, salt, and pepper",
            "Add asparagus to the baking sheet",
            "Bake for 12-15 minutes until salmon flakes easily",
            "Garnish with fresh parsley and serve"
        ],
        "tags": ["healthy", "quick"],
        "protein_type": ProteinType.FISH,
        "meal_type": MealType.DINNER,
        "prep_time_min": 10,
        "cook_time_min": 15,
        "servings": 4,
        "rating": 5
    },
    {
        "title": "Pork Stir Fry",
        "description": "Quick and easy pork stir fry with vegetables",
        "ingredients": [
            "1 lb pork tenderloin, sliced thin",
            "2 tbsp vegetable oil",
            "1 bell pepper, sliced",
            "1 onion, sliced",
            "2 cups snow peas",
            "3 cloves garlic, minced",
            "1 tbsp ginger, minced",
            "3 tbsp soy sauce",
            "1 tbsp oyster sauce",
            "1 tsp cornstarch",
            "2 cups cooked rice",
            "2 green onions, chopped"
        ],
        "steps": [
            "Heat oil in a large wok or skillet",
            "Stir-fry pork until almost cooked through",
            "Add vegetables and stir-fry for 3-4 minutes",
            "Add garlic and ginger, cook for 1 minute",
            "Mix soy sauce, oyster sauce, and cornstarch",
            "Add sauce to pan and stir until thickened",
            "Serve over rice and garnish with green onions"
        ],
        "tags": ["quick", "healthy"],
        "protein_type": ProteinType.PORK,
        "meal_type": MealType.DINNER,
        "prep_time_min": 15,
        "cook_time_min": 10,
        "servings": 4,
        "rating": 4
    },
    {
        "title": "Shrimp Scampi",
        "description": "Classic shrimp scampi with garlic and white wine",
        "ingredients": [
            "1 lb large shrimp, peeled and deveined",
            "1 lb linguine pasta",
            "6 cloves garlic, minced",
            "1/2 cup dry white wine",
            "1/4 cup lemon juice",
            "1/4 cup butter",
            "3 tbsp olive oil",
            "1/4 cup fresh parsley, chopped",
            "1/4 tsp red pepper flakes",
            "Salt and pepper to taste",
            "Parmesan cheese for serving"
        ],
        "steps": [
            "Cook linguine according to package directions",
            "Heat olive oil in a large skillet",
            "Season shrimp with salt and pepper",
            "Cook shrimp for 2-3 minutes per side",
            "Add garlic and red pepper flakes, cook 1 minute",
            "Add wine and lemon juice, simmer 2 minutes",
            "Stir in butter until melted",
            "Toss with pasta and parsley",
            "Serve with parmesan cheese"
        ],
        "tags": ["quick"],
        "protein_type": ProteinType.SEAFOOD,
        "meal_type": MealType.DINNER,
        "prep_time_min": 10,
        "cook_time_min": 15,
        "servings": 4,
        "rating": 5
    },
    {
        "title": "Veggie Buddha Bowl",
        "description": "Nutritious bowl with quinoa, roasted vegetables, and tahini dressing",
        "ingredients": [
            "1 cup quinoa",
            "2 cups sweet potato, cubed",
            "2 cups broccoli florets",
            "1 cup chickpeas, drained",
            "2 tbsp olive oil",
            "1 avocado, sliced",
            "1/4 cup tahini",
            "2 tbsp lemon juice",
            "1 tbsp maple syrup",
            "1 clove garlic, minced",
            "2-3 tbsp water",
            "Salt and pepper to taste"
        ],
        "steps": [
            "Cook quinoa according to package directions",
            "Preheat oven to 425°F",
            "Toss sweet potato and broccoli with olive oil",
            "Roast vegetables for 25-30 minutes",
            "Add chickpeas to pan in last 10 minutes",
            "Whisk tahini, lemon juice, maple syrup, and garlic",
            "Add water to thin dressing as needed",
            "Serve quinoa topped with vegetables and avocado",
            "Drizzle with tahini dressing"
        ],
        "tags": ["healthy", "vegetarian", "vegan"],
        "protein_type": ProteinType.VEGAN,
        "meal_type": MealType.DINNER,
        "prep_time_min": 15,
        "cook_time_min": 30,
        "servings": 4,
        "rating": 4
    },
    {
        "title": "Classic Mac and Cheese",
        "description": "Creamy, comforting mac and cheese that kids love",
        "ingredients": [
            "1 lb elbow macaroni",
            "4 tbsp butter",
            "4 tbsp flour",
            "3 cups milk",
            "2 cups sharp cheddar cheese, shredded",
            "1 cup mozzarella cheese, shredded",
            "1/2 tsp mustard powder",
            "1/2 tsp garlic powder",
            "Salt and pepper to taste",
            "1/2 cup breadcrumbs",
            "2 tbsp butter, melted"
        ],
        "steps": [
            "Cook macaroni according to package directions",
            "Preheat oven to 350°F",
            "Melt butter in a large saucepan",
            "Whisk in flour and cook for 1 minute",
            "Gradually add milk, whisking constantly",
            "Cook until thickened, about 5 minutes",
            "Add cheeses and seasonings, stir until melted",
            "Combine with pasta in a baking dish",
            "Top with breadcrumbs mixed with melted butter",
            "Bake for 25-30 minutes until bubbly"
        ],
        "tags": ["comfort-food", "kid-friendly"],
        "protein_type": ProteinType.VEGETARIAN,
        "meal_type": MealType.DINNER,
        "prep_time_min": 15,
        "cook_time_min": 30,
        "servings": 6,
        "rating": 5
    }
]

async def seed_database():
    """Seed the database with initial recipes"""
    try:
        # Connect to Cosmos DB
        cosmos_client.connect()
        logger.info("Connected to Cosmos DB")
        
        # Add recipes
        created_count = 0
        for recipe_data in SEED_RECIPES:
            try:
                recipe_create = RecipeCreate(**recipe_data)
                existing = await recipe_repository.get_recipe_by_title(recipe_create.title)
                
                if not existing:
                    await recipe_repository.create_recipe(recipe_create)
                    created_count += 1
                    logger.info(f"Created recipe: {recipe_create.title}")
                else:
                    logger.info(f"Recipe already exists: {recipe_create.title}")
                    
            except Exception as e:
                logger.error(f"Error creating recipe {recipe_data['title']}: {e}")
        
        logger.info(f"Seed complete. Created {created_count} new recipes.")
        
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        cosmos_client.disconnect()

if __name__ == "__main__":
    asyncio.run(seed_database())
