import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Plus, X, Save, ArrowLeft } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { RecipeCreate, ProteinType, MealType } from '../../lib/types';

export function RecipeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredients, setIngredients] = useState<string[]>(['']);
  const [steps, setSteps] = useState<string[]>(['']);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [proteinType, setProteinType] = useState<ProteinType | ''>('');
  const [mealType, setMealType] = useState<MealType>('dinner');
  const [prepTimeMin, setPrepTimeMin] = useState<number | ''>('');
  const [cookTimeMin, setCookTimeMin] = useState<number | ''>('');
  const [servings, setServings] = useState<number | ''>('');
  const [rating, setRating] = useState<number | ''>('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isEditing && id) {
      loadRecipe(id);
    }
  }, [id, isEditing]);

  const loadRecipe = async (recipeId: string) => {
    try {
      setLoading(true);
      const recipe = await apiClient.getRecipe(recipeId);
      
      setTitle(recipe.title);
      setDescription(recipe.description || '');
      setIngredients(recipe.ingredients.length > 0 ? recipe.ingredients : ['']);
      setSteps(recipe.steps.length > 0 ? recipe.steps : ['']);
      setTags(recipe.tags);
      setProteinType(recipe.proteinType || '');
      setMealType(recipe.mealType);
      setPrepTimeMin(recipe.prepTimeMin || '');
      setCookTimeMin(recipe.cookTimeMin || '');
      setServings(recipe.servings || '');
      setRating(recipe.rating || '');
      setSourceUrl(recipe.sourceUrl || '');
      setNotes(recipe.notes || '');
    } catch (error) {
      console.error('Failed to load recipe:', error);
      alert('Failed to load recipe');
      navigate('/recipes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      alert('Recipe title is required');
      return;
    }

    const recipeData: RecipeCreate = {
      title: title.trim(),
      description: description.trim() || undefined,
      ingredients: ingredients.filter(i => i.trim()).map(i => i.trim()),
      steps: steps.filter(s => s.trim()).map(s => s.trim()),
      tags,
      proteinType: proteinType || undefined,
      mealType,
      prepTimeMin: prepTimeMin ? Number(prepTimeMin) : undefined,
      cookTimeMin: cookTimeMin ? Number(cookTimeMin) : undefined,
      servings: servings ? Number(servings) : undefined,
      rating: rating ? Number(rating) : undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      setSaving(true);
      if (isEditing && id) {
        await apiClient.updateRecipe(id, recipeData);
      } else {
        await apiClient.createRecipe(recipeData);
      }
      navigate('/recipes');
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, '']);
  };

  const updateIngredient = (index: number, value: string) => {
    const newIngredients = [...ingredients];
    newIngredients[index] = value;
    setIngredients(newIngredients);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const addStep = () => {
    setSteps([...steps, '']);
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading recipe...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/recipes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Recipes
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Recipe' : 'New Recipe'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update your recipe details' : 'Create a new recipe for your collection'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Essential details about your recipe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Recipe Title *</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter recipe title"
                required
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the recipe"
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Protein Type</label>
                <select
                  value={proteinType}
                  onChange={(e) => setProteinType(e.target.value as ProteinType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Select...</option>
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

              <div>
                <label className="text-sm font-medium">Meal Type</label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value as MealType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="dinner">Dinner</option>
                  <option value="lunch">Lunch</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="snack">Snack</option>
                  <option value="misc">Misc</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium">Servings</label>
                <Input
                  type="number"
                  value={servings}
                  onChange={(e) => setServings(e.target.value ? Number(e.target.value) : '')}
                  placeholder="4"
                  min="1"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium">Prep Time (minutes)</label>
                <Input
                  type="number"
                  value={prepTimeMin}
                  onChange={(e) => setPrepTimeMin(e.target.value ? Number(e.target.value) : '')}
                  placeholder="15"
                  min="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Cook Time (minutes)</label>
                <Input
                  type="number"
                  value={cookTimeMin}
                  onChange={(e) => setCookTimeMin(e.target.value ? Number(e.target.value) : '')}
                  placeholder="30"
                  min="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Rating (1-5)</label>
                <Input
                  type="number"
                  value={rating}
                  onChange={(e) => setRating(e.target.value ? Number(e.target.value) : '')}
                  placeholder="5"
                  min="1"
                  max="5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ingredients */}
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
            <CardDescription>List all ingredients needed for this recipe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="flex space-x-2">
                <Input
                  value={ingredient}
                  onChange={(e) => updateIngredient(index, e.target.value)}
                  placeholder={`Ingredient ${index + 1}`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addIngredient}>
              <Plus className="h-4 w-4 mr-2" />
              Add Ingredient
            </Button>
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>Step-by-step cooking instructions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex space-x-2">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <Textarea
                  value={step}
                  onChange={(e) => updateStep(index, e.target.value)}
                  placeholder={`Step ${index + 1} instructions`}
                  className="flex-1"
                  rows={3}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeStep(index)}
                  disabled={steps.length === 1}
                  className="self-start"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addStep}>
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
            <CardDescription>Add tags to help categorize and search for this recipe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex space-x-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag}>
                Add Tag
              </Button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                    <span>{tag}</span>
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
            <CardDescription>Optional details about the recipe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Source URL</label>
              <Input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/recipe"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes or tips for this recipe"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate('/recipes')}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : (isEditing ? 'Update Recipe' : 'Create Recipe')}
          </Button>
        </div>
      </form>
    </div>
  );
}
