from typing import Optional, List
import logging
import requests
from recipe_scrapers import scrape_html
from urllib.parse import urlparse
from app.models.recipe import RecipeCreateBulk, ProteinType, MealType

logger = logging.getLogger(__name__)

class URLParsingService:
    """Service for parsing recipes from URLs using recipe-scrapers library"""
    
    def __init__(self):
        self.timeout = 30  # seconds
        
    async def parse_recipe_from_url(self, url: str) -> RecipeCreateBulk:
        """
        Parse a recipe from a URL and return a RecipeCreateBulk object
        
        Args:
            url: The URL of the recipe to parse
            
        Returns:
            RecipeCreateBulk: Parsed recipe data
            
        Raises:
            ValueError: If URL is invalid or parsing fails
            requests.RequestException: If network request fails
        """
        try:
            # Validate URL format
            parsed_url = urlparse(url)
            if not parsed_url.scheme or not parsed_url.netloc:
                raise ValueError("Invalid URL format")
            
            logger.info(f"Attempting to scrape recipe from URL: {url}")
            
            # First, get the HTML content with proper headers to avoid bot detection
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
                'Accept-Encoding': 'gzip, deflate',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            }
            
            response = requests.get(url, headers=headers, timeout=self.timeout)
            response.raise_for_status()
            
            # Use recipe-scrapers to extract recipe data
            scraper = scrape_html(response.content, org_url=url, wild_mode=True)
            
            # Extract basic recipe information
            title = scraper.title() or "Untitled Recipe"
            description = getattr(scraper, 'description', lambda: None)() or None
            
            # Get ingredients and instructions
            ingredients = scraper.ingredients() or []
            instructions = scraper.instructions_list() or []
            
            # Get timing information
            prep_time = self._extract_time_minutes(scraper.prep_time())
            cook_time = self._extract_time_minutes(scraper.cook_time())
            total_time = self._extract_time_minutes(scraper.total_time())
            
            # Get servings/yield
            servings = self._extract_servings(scraper.yields())
            
            # Get image URL
            image_url = scraper.image() or None
            
            # Get nutrients (if available) - not all scrapers support this
            nutrients = getattr(scraper, 'nutrients', lambda: {})()
            
            # Convert ingredients and instructions to bulk text format
            ingredients_text = "\n".join(ingredients) if ingredients else ""
            steps_text = "\n".join(instructions) if instructions else ""
            
            # Try to determine meal type based on title/description
            meal_type = self._determine_meal_type(title, description)
            
            # Try to determine protein type based on ingredients
            protein_type = self._determine_protein_type(ingredients)
            
            # Create and return RecipeCreateBulk object
            recipe_data = RecipeCreateBulk(
                title=title[:200],  # Ensure title doesn't exceed max length
                description=description,
                ingredients_text=ingredients_text,
                steps_text=steps_text,
                tags=[],  # Start with empty tags - user can add them
                protein_type=protein_type,
                meal_type=meal_type,
                prep_time_min=prep_time,
                cook_time_min=cook_time,
                total_time_min=total_time,
                servings=servings,
                source_url=url,
                image_url=image_url,
                notes=f"Imported from: {url}"
            )
            
            logger.info(f"Successfully scraped recipe '{title}' from {url}")
            return recipe_data
            
        except Exception as e:
            logger.error(f"Failed to scrape recipe from {url}: {str(e)}")
            raise ValueError(f"Failed to parse recipe from URL: {str(e)}")
    
    def _extract_time_minutes(self, time_value) -> Optional[int]:
        """Extract time in minutes from various time formats"""
        if not time_value:
            return None
            
        try:
            # If it's already an integer, assume it's in minutes
            if isinstance(time_value, int):
                return time_value
                
            # If it's a string, try to parse it
            if isinstance(time_value, str):
                # Remove common words and extract numbers
                import re
                numbers = re.findall(r'\d+', time_value.lower())
                if numbers:
                    # Check if it mentions hours
                    if 'hour' in time_value.lower() or 'hr' in time_value.lower():
                        hours = int(numbers[0])
                        minutes = int(numbers[1]) if len(numbers) > 1 else 0
                        return hours * 60 + minutes
                    else:
                        # Assume minutes
                        return int(numbers[0])
        except (ValueError, TypeError):
            pass
            
        return None
    
    def _extract_servings(self, yield_value) -> Optional[int]:
        """Extract number of servings from yield information"""
        if not yield_value:
            return None
            
        try:
            if isinstance(yield_value, int):
                return yield_value
                
            if isinstance(yield_value, str):
                import re
                numbers = re.findall(r'\d+', yield_value)
                if numbers:
                    return int(numbers[0])
        except (ValueError, TypeError):
            pass
            
        return None
    
    def _determine_meal_type(self, title: str, description: Optional[str]) -> MealType:
        """Determine meal type based on title and description"""
        text = (title + " " + (description or "")).lower()
        
        if any(word in text for word in ['breakfast', 'morning', 'pancake', 'waffle', 'cereal', 'oatmeal']):
            return MealType.BREAKFAST
        elif any(word in text for word in ['lunch', 'sandwich', 'salad', 'soup']):
            return MealType.LUNCH
        elif any(word in text for word in ['snack', 'appetizer', 'dip', 'chip']):
            return MealType.SNACK
        else:
            return MealType.DINNER  # Default to dinner
    
    def _determine_protein_type(self, ingredients: List[str]) -> Optional[ProteinType]:
        """Determine protein type based on ingredients"""
        if not ingredients:
            return None
            
        ingredients_text = " ".join(ingredients).lower()
        
        # Check for specific proteins
        if any(word in ingredients_text for word in ['chicken', 'poultry']):
            return ProteinType.CHICKEN
        elif any(word in ingredients_text for word in ['beef', 'steak', 'ground beef']):
            return ProteinType.BEEF
        elif any(word in ingredients_text for word in ['pork', 'bacon', 'ham', 'sausage']):
            return ProteinType.PORK
        elif any(word in ingredients_text for word in ['fish', 'salmon', 'tuna', 'cod', 'tilapia']):
            return ProteinType.FISH
        elif any(word in ingredients_text for word in ['shrimp', 'crab', 'lobster', 'scallop', 'seafood']):
            return ProteinType.SEAFOOD
        elif any(word in ingredients_text for word in ['tofu', 'tempeh', 'seitan']) and 'cheese' not in ingredients_text and 'milk' not in ingredients_text:
            return ProteinType.VEGAN
        elif not any(word in ingredients_text for word in ['chicken', 'beef', 'pork', 'fish', 'meat']):
            # Check if it contains dairy/eggs (vegetarian) or is completely plant-based (vegan)
            if any(word in ingredients_text for word in ['cheese', 'milk', 'egg', 'butter', 'cream', 'yogurt']):
                return ProteinType.VEGETARIAN
            else:
                return ProteinType.VEGAN
        
        return ProteinType.OTHER

# Create a singleton instance
url_parsing_service = URLParsingService()
