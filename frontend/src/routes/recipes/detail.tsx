import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, Edit, Star, Clock, Users, ChefHat, ShoppingCart, X } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Recipe } from '../../lib/types';
import { getProteinTypeColor, getTagColor, formatTime, getIngredientText, getIngredientShoppingFlag } from '../../lib/utils';

export function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadRecipe(id);
    }
  }, [id]);

  const loadRecipe = async (recipeId: string) => {
    try {
      setLoading(true);
      const recipeData = await apiClient.getRecipe(recipeId);
      setRecipe(recipeData);
    } catch (error) {
      console.error('Failed to load recipe:', error);
      alert('Failed to load recipe');
      navigate('/recipes');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating}/5)</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading recipe...</div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Recipe not found</h2>
          <p className="text-gray-600 mb-4">The recipe you're looking for doesn't exist.</p>
          <Link to="/recipes">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Recipes
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/recipes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Recipes
        </Button>
        <Link to={`/recipes/${recipe.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Recipe
          </Button>
        </Link>
      </div>

      {/* Recipe Header */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recipe Image */}
        {recipe.imageUrl ? (
          <div className="aspect-[4/3] overflow-hidden rounded-lg border">
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="aspect-[4/3] bg-gray-100 rounded-lg border flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ChefHat className="mx-auto h-12 w-12 mb-2" />
              <p>No image available</p>
            </div>
          </div>
        )}

        {/* Recipe Info */}
        <div className="space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
            {recipe.description && (
              <p className="text-lg text-gray-600 mt-2">{recipe.description}</p>
            )}
          </div>

          {/* Rating */}
          {recipe.rating && (
            <div>
              {renderStars(recipe.rating)}
            </div>
          )}

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4">
            {recipe.prepTimeMin && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <span className="font-medium">Prep:</span> {formatTime(recipe.prepTimeMin)}
                </span>
              </div>
            )}
            
            {recipe.cookTimeMin && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <span className="font-medium">Cook:</span> {formatTime(recipe.cookTimeMin)}
                </span>
              </div>
            )}
            
            {recipe.servings && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <span className="font-medium">Serves:</span> {recipe.servings}
                </span>
              </div>
            )}
            
            {recipe.totalTimeMin && (
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">
                  <span className="font-medium">Total:</span> {formatTime(recipe.totalTimeMin)}
                </span>
              </div>
            )}
          </div>

          {/* Tags and Protein Type */}
          <div className="space-y-3">
            {recipe.proteinType && (
              <div>
                <Badge className={getProteinTypeColor(recipe.proteinType)}>
                  {recipe.proteinType.charAt(0).toUpperCase() + recipe.proteinType.slice(1)}
                </Badge>
              </div>
            )}
            
            {recipe.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag, index) => (
                  <Badge key={tag} variant="outline" className={getTagColor(index)}>
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Source URL */}
          {recipe.sourceUrl && (
            <div>
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm"
              >
                View Original Recipe →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Recipe Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recipe.ingredients.map((ingredient, index) => {
                const text = getIngredientText(ingredient);
                const includeInShopping = getIngredientShoppingFlag(ingredient);
                
                return (
                  <li key={index} className="flex items-start justify-between group">
                    <div className="flex items-start">
                      <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mt-2 mr-3 flex-shrink-0"></span>
                      <span>{text}</span>
                    </div>
                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {includeInShopping ? (
                        <span title="Included in shopping list">
                          <ShoppingCart className="h-4 w-4 text-green-600" />
                        </span>
                      ) : (
                        <span title="Not included in shopping list">
                          <X className="h-4 w-4 text-red-400" />
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {recipe.steps.map((step, index) => (
                <li key={index} className="flex items-start">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mr-3 flex-shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {recipe.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{recipe.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
