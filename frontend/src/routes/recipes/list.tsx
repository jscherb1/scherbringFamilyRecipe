import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { AIRecipeDialog } from '../../components/ui/AIRecipeDialog';
import { Plus, Search, Filter, Star, Clock, Users, Edit, Trash2, Sparkles } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { Recipe, ProteinType, RecipeCreateBulk } from '../../lib/types';
import { getProteinTypeColor, getTagColor, formatTime } from '../../lib/utils';

export function RecipeList() {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedProtein, setSelectedProtein] = useState<ProteinType | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalRecipes, setTotalRecipes] = useState(0);
  
  // AI Recipe Generation state
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiGenerationLoading, setAiGenerationLoading] = useState(false);

  const loadRecipes = async (resetList = true) => {
    try {
      if (resetList) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const currentPage = resetList ? 1 : page + 1;
      const response = await apiClient.getRecipes({
        search: search || undefined,
        tag: selectedTag || undefined,
        proteinType: selectedProtein || undefined,
        page: currentPage,
        pageSize: 20
      });
      
      if (resetList) {
        setRecipes(response.recipes);
        setPage(1);
        setTotalRecipes(response.total);
        setHasMore(response.recipes.length < response.total && response.recipes.length > 0);
      } else {
        setRecipes(prev => {
          const newRecipes = [...prev, ...response.recipes];
          setTotalRecipes(response.total);
          setHasMore(newRecipes.length < response.total && response.recipes.length > 0);
          return newRecipes;
        });
        setPage(currentPage);
      }
      
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadTags = async () => {
    try {
      const allTags = await apiClient.getTags();
      setTags(allTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  useEffect(() => {
    loadRecipes(true);
  }, [search, selectedTag, selectedProtein]);

  useEffect(() => {
    loadTags();
  }, []);

  const loadMoreRecipes = () => {
    if (!loadingMore && hasMore) {
      loadRecipes(false);
    }
  };

  // Infinite scroll implementation
  useEffect(() => {
    const handleScroll = () => {
      if (loadingMore || !hasMore) return;

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Load more when user is 300px from bottom
      if (scrollTop + windowHeight >= documentHeight - 300) {
        loadMoreRecipes();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore]);

  const handleDeleteRecipe = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return;
    
    try {
      await apiClient.deleteRecipe(id);
      loadRecipes(); // Reload the list
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      alert('Failed to delete recipe');
    }
  };

  const handleAIGeneration = async (request: { type: 'prompt' | 'random'; prompt?: string }) => {
    try {
      setAiGenerationLoading(true);
      
      let response;
      if (request.type === 'random') {
        response = await apiClient.generateRandomRecipeWithAI();
      } else if (request.prompt) {
        response = await apiClient.generateRecipeWithAI(request.prompt);
      } else {
        throw new Error('Invalid generation request');
      }
      
      if (response.success && response.recipeData) {
        // Close the dialog
        setShowAIDialog(false);
        
        // Navigate to recipe edit page with the generated data
        // We'll pass the data through navigation state
        navigate('/recipes/new', { 
          state: { 
            aiGeneratedData: response.recipeData,
            isAIGenerated: true 
          } 
        });
      } else {
        throw new Error(response.error || 'Failed to generate recipe');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      alert(`Failed to generate recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setAiGenerationLoading(false);
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading && recipes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading recipes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">My Recipes</h1>
          <p className="text-muted-foreground">Manage your personal recipe collection</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline"
            onClick={() => setShowAIDialog(true)}
            disabled={aiGenerationLoading}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate w/ AI
          </Button>
          <Link to="/recipes/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Recipe
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-4 md:grid-cols-12">
        <div className="md:col-span-6">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        
        <div className="md:col-span-3">
          <select
            value={selectedProtein}
            onChange={(e) => setSelectedProtein(e.target.value as ProteinType)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">All Proteins</option>
            <option value="beef">Beef</option>
            <option value="chicken">Chicken</option>
            <option value="pork">Pork</option>
            <option value="fish">Fish</option>
            <option value="seafood">Seafood</option>
            <option value="vegetarian">Vegetarian</option>
            <option value="vegan">Vegan</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="md:col-span-3">
          <Button variant="outline" className="w-full justify-start">
            <Filter className="mr-2 h-4 w-4" />
            Filter by protein
          </Button>
        </div>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Filter by tags:</p>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedTag === '' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTag('')}
            >
              All
            </Badge>
            {tags.map((tag, index) => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                className={`cursor-pointer ${getTagColor(index)}`}
                onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Recipe Grid */}
      {recipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No recipes found. Create your first recipe!</p>
          <Link to="/recipes/new">
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Recipe
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <Card key={recipe.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              {/* Recipe Image */}
              {recipe.thumbnailUrl && (
                <Link to={`/recipes/${recipe.id}`}>
                  <div className="aspect-[16/9] overflow-hidden cursor-pointer">
                    <img
                      src={recipe.thumbnailUrl}
                      alt={recipe.title}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                </Link>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link to={`/recipes/${recipe.id}`}>
                      <CardTitle className="text-lg line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer">
                        {recipe.title}
                      </CardTitle>
                    </Link>
                    {recipe.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {recipe.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <Link to={`/recipes/${recipe.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteRecipe(recipe.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                {/* Rating */}
                {recipe.rating && (
                  <div className="mb-3">
                    {renderStars(recipe.rating)}
                  </div>
                )}
                
                {/* Tags */}
                {recipe.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {recipe.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={tag} variant="outline" className={getTagColor(index)}>
                        {tag}
                      </Badge>
                    ))}
                    {recipe.tags.length > 3 && (
                      <Badge variant="outline">
                        +{recipe.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Meta info */}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    {recipe.totalTimeMin && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatTime(recipe.totalTimeMin)}</span>
                      </div>
                    )}
                    {recipe.servings && (
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{recipe.servings}</span>
                      </div>
                    )}
                  </div>
                  
                  {recipe.proteinType && (
                    <Badge className={getProteinTypeColor(recipe.proteinType)}>
                      {recipe.proteinType}
                    </Badge>
                  )}
                </div>
                
                {recipe.lastCookedAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Last cooked: {new Date(recipe.lastCookedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Load More / Loading Indicator */}
      {(hasMore || loadingMore) && (
        <div className="flex flex-col items-center space-y-4">
          {recipes.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Showing {recipes.length} of {totalRecipes} recipes
            </p>
          )}
          
          {loadingMore ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading more recipes...</p>
            </div>
          ) : hasMore ? (
            <Button 
              variant="outline" 
              onClick={loadMoreRecipes}
              className="min-w-[120px]"
            >
              Load More
            </Button>
          ) : null}
        </div>
      )}
      
      {/* Show completion message when all recipes are loaded */}
      {!hasMore && recipes.length > 0 && !loadingMore && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            You've reached the end! All {totalRecipes} recipes loaded.
          </p>
        </div>
      )}

      {/* AI Recipe Generation Dialog */}
      <AIRecipeDialog
        open={showAIDialog}
        onClose={() => setShowAIDialog(false)}
        onRecipeGenerated={handleAIGeneration}
        loading={aiGenerationLoading}
      />
    </div>
  );
}
