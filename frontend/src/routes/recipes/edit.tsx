import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { Plus, X, Save, ArrowLeft, List, FileText, Link } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { RecipeCreate, RecipeCreateBulk, ProteinType, MealType } from '../../lib/types';
import { parseBulkText, arrayToBulkText } from '../../lib/utils';
import { UrlImportDialog } from '../../components/ui/UrlImportDialog';

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
  
  // Bulk input state
  const [ingredientsBulkMode, setIngredientsBulkMode] = useState(true);
  const [stepsBulkMode, setStepsBulkMode] = useState(true);
  const [ingredientsBulkText, setIngredientsBulkText] = useState('');
  const [stepsBulkText, setStepsBulkText] = useState('');
  
  // Image state
  const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>();
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  // URL import state
  const [showUrlImportDialog, setShowUrlImportDialog] = useState(false);
  const [urlImportLoading, setUrlImportLoading] = useState(false);

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
      
      // Also populate bulk text fields since bulk mode is now default
      setIngredientsBulkText(arrayToBulkText(recipe.ingredients));
      setStepsBulkText(arrayToBulkText(recipe.steps));
      
      setTags(recipe.tags);
      setProteinType(recipe.proteinType || '');
      setMealType(recipe.mealType);
      setPrepTimeMin(recipe.prepTimeMin || '');
      setCookTimeMin(recipe.cookTimeMin || '');
      setServings(recipe.servings || '');
      setRating(recipe.rating || '');
      setSourceUrl(recipe.sourceUrl || '');
      setNotes(recipe.notes || '');
      setCurrentImageUrl(recipe.imageUrl);
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

    try {
      setSaving(true);
      
      if (isEditing && id) {
        // Update existing recipe - check if we should use bulk or individual mode
        if (ingredientsBulkMode || stepsBulkMode) {
          // Use bulk update API
          const bulkRecipeData: any = {
            title: title.trim(),
            description: description.trim() || undefined,
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

          // Add bulk or individual data based on current mode
          if (ingredientsBulkMode) {
            bulkRecipeData.ingredientsText = ingredientsBulkText;
          } else {
            bulkRecipeData.ingredients = ingredients.filter(i => i.trim()).map(i => i.trim());
          }

          if (stepsBulkMode) {
            bulkRecipeData.stepsText = stepsBulkText;
          } else {
            bulkRecipeData.steps = steps.filter(s => s.trim()).map(s => s.trim());
          }

          await apiClient.updateRecipeBulk(id, bulkRecipeData);
        } else {
          // Use standard update API
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
          
          await apiClient.updateRecipe(id, recipeData);
        }
        
        // Handle image update if changed
        if (imageChanged) {
          if (selectedImageFile) {
            await apiClient.uploadRecipeImage(id, selectedImageFile);
          } else if (currentImageUrl && !selectedImageFile) {
            // Remove image if it was deleted
            await apiClient.deleteRecipeImage(id);
          }
        }
      } else {
        // Create new recipe
        console.log('Creating new recipe, selectedImageFile:', selectedImageFile);
        
        if (selectedImageFile) {
          // Create recipe with image - check if we should use bulk or individual mode
          if (ingredientsBulkMode || stepsBulkMode) {
            // Use bulk with image API
            console.log('Creating recipe with image using bulk input');
            const formData = new FormData();
            formData.append('title', title.trim());
            if (description.trim()) formData.append('description', description.trim());
            
            // Handle ingredients
            if (ingredientsBulkMode) {
              formData.append('ingredients_text', ingredientsBulkText);
            } else {
              formData.append('ingredients', JSON.stringify(ingredients.filter(i => i.trim()).map(i => i.trim())));
            }
            
            // Handle steps
            if (stepsBulkMode) {
              formData.append('steps_text', stepsBulkText);
            } else {
              formData.append('steps', JSON.stringify(steps.filter(s => s.trim()).map(s => s.trim())));
            }
            
            formData.append('tags', JSON.stringify(tags));
            if (proteinType) formData.append('protein_type', proteinType);
            formData.append('meal_type', mealType);
            if (prepTimeMin) formData.append('prep_time_min', String(prepTimeMin));
            if (cookTimeMin) formData.append('cook_time_min', String(cookTimeMin));
            if (servings) formData.append('servings', String(servings));
            if (rating) formData.append('rating', String(rating));
            if (sourceUrl.trim()) formData.append('source_url', sourceUrl.trim());
            if (notes.trim()) formData.append('notes', notes.trim());
            formData.append('image', selectedImageFile);
            
            await apiClient.createRecipeWithImageBulk(formData);
          } else {
            // Use standard with image API
            console.log('Creating recipe with image using individual input');
            const formData = new FormData();
            formData.append('title', title.trim());
            if (description.trim()) formData.append('description', description.trim());
            formData.append('ingredients', JSON.stringify(ingredients.filter(i => i.trim()).map(i => i.trim())));
            formData.append('steps', JSON.stringify(steps.filter(s => s.trim()).map(s => s.trim())));
            formData.append('tags', JSON.stringify(tags));
            if (proteinType) formData.append('protein_type', proteinType);
            formData.append('meal_type', mealType);
            if (prepTimeMin) formData.append('prep_time_min', String(prepTimeMin));
            if (cookTimeMin) formData.append('cook_time_min', String(cookTimeMin));
            if (servings) formData.append('servings', String(servings));
            if (rating) formData.append('rating', String(rating));
            if (sourceUrl.trim()) formData.append('source_url', sourceUrl.trim());
            if (notes.trim()) formData.append('notes', notes.trim());
            formData.append('image', selectedImageFile);
            
            await apiClient.createRecipeWithImage(formData);
          }
        } else {
          // Create recipe without image - check if we should use bulk or individual mode
          if (ingredientsBulkMode || stepsBulkMode) {
            // Use bulk API
            console.log('Creating recipe without image using bulk input');
            const bulkRecipeData: RecipeCreateBulk = {
              title: title.trim(),
              description: description.trim() || undefined,
              ingredientsText: ingredientsBulkMode ? ingredientsBulkText : undefined,
              stepsText: stepsBulkMode ? stepsBulkText : undefined,
              ingredients: !ingredientsBulkMode ? ingredients.filter(i => i.trim()).map(i => i.trim()) : undefined,
              steps: !stepsBulkMode ? steps.filter(s => s.trim()).map(s => s.trim()) : undefined,
              tags,
              proteinType: proteinType || undefined,
              mealType,
              prepTimeMin: prepTimeMin ? Number(prepTimeMin) : undefined,
              cookTimeMin: cookTimeMin ? Number(cookTimeMin) : undefined,
              servings: servings ? Number(servings) : undefined,
              rating: rating ? Number(rating) : undefined,
              sourceUrl: sourceUrl.trim() || undefined,
              notes: notes.trim() || undefined,
              imageUrl: currentImageUrl || undefined,
              thumbnailUrl: undefined, // Will be set by backend if image is processed
            };
            
            await apiClient.createRecipeBulk(bulkRecipeData);
          } else {
            // Use standard API
            console.log('Creating recipe without image using individual input');
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
            
            await apiClient.createRecipe(recipeData);
          }
        }
      }
      
      navigate('/recipes');
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const handleUrlImport = async (url: string) => {
    try {
      setUrlImportLoading(true);
      
      const response = await apiClient.parseRecipeFromUrl({ url });
      
      if (response.success && response.recipeData) {
        const recipeData = response.recipeData;
        
        // Populate form with parsed data
        setTitle(recipeData.title);
        setDescription(recipeData.description || '');
        
        // Handle ingredients
        if (recipeData.ingredientsText) {
          setIngredientsBulkText(recipeData.ingredientsText);
          setIngredientsBulkMode(true);
        } else if (recipeData.ingredients && recipeData.ingredients.length > 0) {
          setIngredients(recipeData.ingredients);
          setIngredientsBulkText(arrayToBulkText(recipeData.ingredients));
        }
        
        // Handle steps
        if (recipeData.stepsText) {
          setStepsBulkText(recipeData.stepsText);
          setStepsBulkMode(true);
        } else if (recipeData.steps && recipeData.steps.length > 0) {
          setSteps(recipeData.steps);
          setStepsBulkText(arrayToBulkText(recipeData.steps));
        }
        
        // Set other fields
        setTags(recipeData.tags || []);
        setProteinType(recipeData.proteinType || '');
        setMealType(recipeData.mealType || 'dinner');
        setPrepTimeMin(recipeData.prepTimeMin || '');
        setCookTimeMin(recipeData.cookTimeMin || '');
        setServings(recipeData.servings || '');
        setSourceUrl(recipeData.sourceUrl || url);
        setNotes(recipeData.notes || '');
        
        // Handle image URL if provided
        if (recipeData.imageUrl) {
          setCurrentImageUrl(recipeData.imageUrl);
        }
        
        alert('Recipe imported successfully! Please review and modify as needed.');
      } else {
        throw new Error(response.error || 'Failed to parse recipe from URL');
      }
    } catch (error) {
      console.error('Failed to import recipe from URL:', error);
      throw error; // Re-throw to let dialog handle the error display
    } finally {
      setUrlImportLoading(false);
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

  const handleImageSelect = (file: File | null) => {
    setSelectedImageFile(file);
    setImageChanged(true);
  };

  const handleImageRemove = () => {
    setSelectedImageFile(null);
    setCurrentImageUrl(undefined);
    setImageChanged(true);
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

  // Functions to handle switching between individual and bulk modes
  const switchToIngredientsBulkMode = () => {
    // Convert current individual ingredients to bulk text
    const bulkText = arrayToBulkText(ingredients.filter(i => i.trim()));
    setIngredientsBulkText(bulkText);
    setIngredientsBulkMode(true);
  };

  const switchToIngredientsIndividualMode = () => {
    // Convert current bulk text to individual ingredients
    const individualItems = parseBulkText(ingredientsBulkText);
    setIngredients(individualItems.length > 0 ? individualItems : ['']);
    setIngredientsBulkMode(false);
  };

  const switchToStepsBulkMode = () => {
    // Convert current individual steps to bulk text
    const bulkText = arrayToBulkText(steps.filter(s => s.trim()));
    setStepsBulkText(bulkText);
    setStepsBulkMode(true);
  };

  const switchToStepsIndividualMode = () => {
    // Convert current bulk text to individual steps
    const individualItems = parseBulkText(stepsBulkText);
    setSteps(individualItems.length > 0 ? individualItems : ['']);
    setStepsBulkMode(false);
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
      <div className="flex items-center justify-between">
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
        
        {/* Import from URL button - only show when creating new recipe */}
        {!isEditing && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowUrlImportDialog(true)}
            className="shrink-0"
          >
            <Link className="h-4 w-4 mr-2" />
            Import from URL
          </Button>
        )}
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

            <ImageUpload
              currentImageUrl={currentImageUrl}
              onImageSelect={handleImageSelect}
              onImageRemove={handleImageRemove}
              disabled={saving}
            />

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
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Ingredients</CardTitle>
                <CardDescription>List all ingredients needed for this recipe</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={ingredientsBulkMode ? "outline" : "default"}
                  size="sm"
                  onClick={ingredientsBulkMode ? switchToIngredientsIndividualMode : switchToIngredientsBulkMode}
                >
                  {ingredientsBulkMode ? <List className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                  {ingredientsBulkMode ? "Switch to Individual" : "Switch to Bulk"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {ingredientsBulkMode ? (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Paste ingredients (one per line):
                </label>
                <Textarea
                  value={ingredientsBulkText}
                  onChange={(e) => setIngredientsBulkText(e.target.value)}
                  placeholder="1 cup flour&#10;2 cups sugar&#10;3 eggs&#10;1 tsp vanilla extract"
                  rows={8}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Copy and paste your ingredient list. Each line will become a separate ingredient.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Steps */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Instructions</CardTitle>
                <CardDescription>Step-by-step cooking instructions</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant={stepsBulkMode ? "outline" : "default"}
                  size="sm"
                  onClick={stepsBulkMode ? switchToStepsIndividualMode : switchToStepsBulkMode}
                >
                  {stepsBulkMode ? <List className="h-4 w-4 mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                  {stepsBulkMode ? "Switch to Individual" : "Switch to Bulk"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {stepsBulkMode ? (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Paste instructions (one step per line):
                </label>
                <Textarea
                  value={stepsBulkText}
                  onChange={(e) => setStepsBulkText(e.target.value)}
                  placeholder="Preheat oven to 350°F&#10;Mix flour and sugar in a bowl&#10;Add eggs one at a time&#10;Bake for 25-30 minutes"
                  rows={10}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: Copy and paste your recipe steps. Each line will become a separate step.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
              </div>
            )}
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

      {/* URL Import Dialog */}
      <UrlImportDialog
        open={showUrlImportDialog}
        onClose={() => setShowUrlImportDialog(false)}
        onImport={handleUrlImport}
        loading={urlImportLoading}
      />
    </div>
  );
}
