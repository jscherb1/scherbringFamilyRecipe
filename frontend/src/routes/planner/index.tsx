import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Calendar, Clock, ChefHat, Shuffle, History, Loader, Settings, Save } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { MealPlan, MealPlanGenerate, Recipe, MealPlanEntry } from '../../lib/types';
import { formatDate } from '../../lib/utils';

export function PlannerIndex() {
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(null);
  const [planRecipes, setPlanRecipes] = useState<Record<string, Recipe>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Recipe selection modal
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([]);

  // Plan settings
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday.toISOString().split('T')[0];
  });
  const [dinnersPerWeek, setDinnersPerWeek] = useState(5);
  
  // Current generated plan (not saved yet)
  const [generatedEntries, setGeneratedEntries] = useState<MealPlanEntry[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const generatePlan = async () => {
    try {
      setGenerating(true);
      
      const request: MealPlanGenerate = {
        weekStartDate,
        dinnersPerWeek,
        constraints: {
          excludeIngredients: [],
          includeTags: [],
          excludeTags: [],
          avoidRepeatWeeks: 2,
          balanceProteinTypes: true,
          requiredRecipes: [],
          startWeekOn: 'monday'
        }
      };
      
      const response = await apiClient.generateMealPlan(request);
      
      setGeneratedEntries(response.entries);
      setHasUnsavedChanges(true);
      
      // Set up recipes mapping
      const recipes: Record<string, Recipe> = {};
      response.recipes.forEach(recipe => {
        recipes[recipe.id] = recipe;
      });
      setPlanRecipes(recipes);
      
    } catch (error) {
      console.error('Failed to generate meal plan:', error);
      alert('Failed to generate meal plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const savePlan = async () => {
    try {
      setSaving(true);
      
      const newPlan = await apiClient.createMealPlan({
        weekStartDate,
        dinnersPerWeek,
        constraints: {
          excludeIngredients: [],
          includeTags: [],
          excludeTags: [],
          avoidRepeatWeeks: 2,
          balanceProteinTypes: true,
          requiredRecipes: [],
          startWeekOn: 'monday'
        },
        entries: generatedEntries
      });
      
      setCurrentPlan(newPlan);
      setHasUnsavedChanges(false);
      
    } catch (error) {
      console.error('Failed to save meal plan:', error);
      alert('Failed to save meal plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const regenerateUnlocked = async () => {
    if (!generatedEntries || generatedEntries.length === 0) {
      // If no meal plan exists, just generate a new one
      await generatePlan();
      return;
    }

    setGenerating(true);
    try {
      // Get all available dinner recipes
      const recipesResponse = await apiClient.getRecipes({ 
        mealType: 'dinner',
        pageSize: 100 
      });

      // Get currently locked recipe IDs
      const lockedRecipeIds = new Set(
        generatedEntries
          .filter(entry => entry?.locked && entry?.recipeId)
          .map(entry => entry.recipeId)
      );

      // Filter out locked recipes from available recipes
      const availableForSelection = recipesResponse.recipes.filter(
        recipe => !lockedRecipeIds.has(recipe.id)
      );

      // Ensure we always have recipes to choose from
      const recipesToChooseFrom = availableForSelection.length > 0 
        ? availableForSelection 
        : recipesResponse.recipes;

      // If we still don't have any recipes, that's a problem
      if (recipesToChooseFrom.length === 0) {
        throw new Error('No recipes available in the database');
      }

      // Create updated entries
      const updatedEntries = [...generatedEntries];
      const usedRecipeIds = new Set(lockedRecipeIds); // Start with locked recipes

      for (let i = 0; i < updatedEntries.length; i++) {
        // If this day is not locked, replace it with a new entry
        if (!updatedEntries[i]?.locked) {
          // Find a recipe that hasn't been used yet in this regeneration
          let selectedRecipe = null;
          const availableRecipes = recipesToChooseFrom.filter(recipe => !usedRecipeIds.has(recipe.id));
          
          if (availableRecipes.length > 0) {
            // Select random recipe from unused recipes
            selectedRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
          } else {
            // If all recipes are used, select any recipe (allow duplicates)
            selectedRecipe = recipesToChooseFrom[Math.floor(Math.random() * recipesToChooseFrom.length)];
          }
          
          // Always assign a recipe - this should never be null/undefined now
          updatedEntries[i] = {
            date: new Date(new Date(weekStartDate).getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            recipeId: selectedRecipe.id,
            locked: false
          };
          usedRecipeIds.add(selectedRecipe.id);
        }
      }

      setGeneratedEntries(updatedEntries);
      setAvailableRecipes(recipesResponse.recipes);
      
      // Update planRecipes to include all fetched recipes so DayCard can find them
      const newPlanRecipes: Record<string, Recipe> = {};
      recipesResponse.recipes.forEach(recipe => {
        newPlanRecipes[recipe.id] = recipe;
      });
      setPlanRecipes(newPlanRecipes);
    } catch (error) {
      console.error('Failed to regenerate unlocked entries:', error);
      alert('Failed to regenerate meal plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const openRecipeSelector = async (dayIndex: number) => {
    try {
      // Fetch all dinner recipes
      const response = await apiClient.getRecipes({ 
        mealType: 'dinner',
        pageSize: 100 
      });
      setAvailableRecipes(response.recipes);
      setSelectedDayIndex(dayIndex);
      setShowRecipeSelector(true);
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
      alert('Failed to load recipes. Please try again.');
    }
  };

  const selectRecipeForDay = (recipe: Recipe) => {
    if (selectedDayIndex === null) return;
    
    const updatedEntries = [...generatedEntries];
    const dayDate = getDayDate(selectedDayIndex);
    
    // Find or create entry for this day
    let entryIndex = updatedEntries.findIndex(entry => {
      const entryDate = new Date(entry.date).toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return entryDate === dayDate;
    });
    
    if (entryIndex === -1) {
      // Create new entry
      const startDate = new Date(weekStartDate);
      const entryDate = new Date(startDate);
      entryDate.setDate(startDate.getDate() + selectedDayIndex);
      
      updatedEntries.push({
        date: entryDate.toISOString().split('T')[0],
        recipeId: recipe.id,
        locked: false
      });
    } else {
      // Update existing entry
      updatedEntries[entryIndex] = {
        ...updatedEntries[entryIndex],
        recipeId: recipe.id
      };
    }
    
    setGeneratedEntries(updatedEntries);
    setPlanRecipes(prev => ({ ...prev, [recipe.id]: recipe }));
    setHasUnsavedChanges(true);
    setShowRecipeSelector(false);
    setSelectedDayIndex(null);
  };

  const deleteRecipeForDay = (dayIndex: number) => {
    const updatedEntries = [...generatedEntries];
    const dayDate = getDayDate(dayIndex);
    
    // Find entry for this day
    const entryIndex = updatedEntries.findIndex(entry => {
      const entryDate = new Date(entry.date).toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return entryDate === dayDate;
    });
    
    if (entryIndex !== -1) {
      // Remove recipe but keep the entry structure
      updatedEntries[entryIndex] = {
        ...updatedEntries[entryIndex],
        recipeId: undefined
      };
      setGeneratedEntries(updatedEntries);
      setHasUnsavedChanges(true);
    }
  };

  const toggleLockForDay = (dayIndex: number) => {
    const updatedEntries = [...generatedEntries];
    const dayDate = getDayDate(dayIndex);
    
    // Find entry for this day
    const entryIndex = updatedEntries.findIndex(entry => {
      const entryDate = new Date(entry.date).toLocaleDateString('en-US', { 
        month: 'numeric', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return entryDate === dayDate;
    });
    
    if (entryIndex !== -1) {
      updatedEntries[entryIndex] = {
        ...updatedEntries[entryIndex],
        locked: !updatedEntries[entryIndex].locked
      };
      setGeneratedEntries(updatedEntries);
      setHasUnsavedChanges(true);
    }
  };

  const swapRecipeForDay = async (dayIndex: number) => {
    try {
      // Get current entry
      const dayDate = getDayDate(dayIndex);
      const currentEntry = generatedEntries.find(entry => {
        const entryDate = new Date(entry.date).toLocaleDateString('en-US', { 
          month: 'numeric', 
          day: 'numeric', 
          year: 'numeric' 
        });
        return entryDate === dayDate;
      });
      
      // Fetch all dinner recipes
      const response = await apiClient.getRecipes({ 
        mealType: 'dinner',
        pageSize: 100 
      });
      
      // Filter out the current recipe
      const eligibleRecipes = response.recipes.filter(recipe => 
        recipe.id !== currentEntry?.recipeId
      );
      
      if (eligibleRecipes.length === 0) {
        alert('No other recipes available for swapping.');
        return;
      }
      
      // Randomly select a new recipe
      const randomIndex = Math.floor(Math.random() * eligibleRecipes.length);
      const newRecipe = eligibleRecipes[randomIndex];
      
      // Update the entry
      const updatedEntries = [...generatedEntries];
      const entryIndex = updatedEntries.findIndex(entry => {
        const entryDate = new Date(entry.date).toLocaleDateString('en-US', { 
          month: 'numeric', 
          day: 'numeric', 
          year: 'numeric' 
        });
        return entryDate === dayDate;
      });
      
      if (entryIndex !== -1) {
        updatedEntries[entryIndex] = {
          ...updatedEntries[entryIndex],
          recipeId: newRecipe.id
        };
      } else {
        // Create new entry
        const startDate = new Date(weekStartDate);
        const entryDate = new Date(startDate);
        entryDate.setDate(startDate.getDate() + dayIndex);
        
        updatedEntries.push({
          date: entryDate.toISOString().split('T')[0],
          recipeId: newRecipe.id,
          locked: false
        });
      }
      
      setGeneratedEntries(updatedEntries);
      setPlanRecipes(prev => ({ ...prev, [newRecipe.id]: newRecipe }));
      setHasUnsavedChanges(true);
      
    } catch (error) {
      console.error('Failed to swap recipe:', error);
      alert('Failed to swap recipe. Please try again.');
    }
  };

  const getDayName = (index: number) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return days[index] || `Day ${index + 1}`;
  };

  const getDayDate = (index: number) => {
    const startDate = new Date(weekStartDate);
    const dayDate = new Date(startDate);
    dayDate.setDate(startDate.getDate() + index);
    return dayDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meal Planner</h1>
          <p className="text-muted-foreground">
            Generate and manage your weekly meal plans
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate('/planner/history')}
          >
            History
          </Button>
        </div>
      </div>

      {/* Plan Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-orange-500" />
            <span>Plan Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <label className="text-sm font-medium">Week Starting</label>
              <Input
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Dinners per Week</label>
              <div className="flex space-x-2">
                <Button
                  variant={dinnersPerWeek === 4 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDinnersPerWeek(4)}
                >
                  4 days
                </Button>
                <Button
                  variant={dinnersPerWeek === 5 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDinnersPerWeek(5)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  5 days
                </Button>
              </div>
            </div>

            <Button
              onClick={generatePlan}
              disabled={generating}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Shuffle className="h-4 w-4 mr-2" />
              {generating ? 'Generating...' : 'Generate Plan'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Plan Grid */}
      {generatedEntries.length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: dinnersPerWeek }).map((_, index) => {
              const entry = generatedEntries[index];
              const recipe = entry?.recipeId ? planRecipes[entry.recipeId] : null;
              
              return (
                <DayCard
                  key={`${index}-${entry?.recipeId || 'empty'}-${entry?.locked || false}`}
                  dayIndex={index}
                  dayName={getDayName(index)}
                  dayDate={getDayDate(index)}
                  recipe={recipe}
                  entry={entry}
                  onSelectRecipe={() => openRecipeSelector(index)}
                  onDeleteRecipe={() => deleteRecipeForDay(index)}
                  onToggleLock={() => toggleLockForDay(index)}
                  onSwapRecipe={() => swapRecipeForDay(index)}
                />
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              onClick={regenerateUnlocked}
              disabled={generating}
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Regenerate Unlocked
            </Button>
            <Button
              onClick={savePlan}
              disabled={saving || !hasUnsavedChanges}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Plan'}
            </Button>
          </div>
        </div>
      ) : (
        <EmptyPlanView onGenerate={generatePlan} generating={generating} />
      )}

      {/* Recipe Selection Modal */}
      {showRecipeSelector && (
        <RecipeSelectionModal
          recipes={availableRecipes}
          onSelect={selectRecipeForDay}
          onClose={() => {
            setShowRecipeSelector(false);
            setSelectedDayIndex(null);
          }}
        />
      )}
    </div>
  );
}

function DayCard({ 
  dayIndex,
  dayName, 
  dayDate, 
  recipe, 
  entry,
  onSelectRecipe,
  onDeleteRecipe,
  onToggleLock,
  onSwapRecipe
}: { 
  dayIndex: number;
  dayName: string;
  dayDate: string;
  recipe: Recipe | null; 
  entry?: MealPlanEntry;
  onSelectRecipe: () => void;
  onDeleteRecipe: () => void;
  onToggleLock: () => void;
  onSwapRecipe: () => void;
}) {
  const navigate = useNavigate();

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{dayName}</h3>
            <p className="text-sm text-muted-foreground">{dayDate}</p>
          </div>
          <div className="flex items-center space-x-1">
            {entry?.locked && (
              <Badge variant="secondary" className="text-xs">
                🔒
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleLock}
              className="h-8 w-8 p-0"
              title={entry?.locked ? "Unlock day" : "Lock day"}
            >
              {entry?.locked ? "🔓" : "🔒"}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {recipe ? (
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-medium text-lg">{recipe.title}</h4>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {recipe.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>

          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            {recipe.cookTimeMin && (
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{recipe.cookTimeMin}m cook time</span>
              </div>
            )}
          </div>

          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onSwapRecipe}
              disabled={entry?.locked}
              title={entry?.locked ? "Day is locked" : "Swap with random recipe"}
            >
              <Shuffle className="h-3 w-3 mr-1" />
              Swap
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => navigate(`/recipes/${recipe.id}`)}
            >
              View
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={onSelectRecipe}
              disabled={entry?.locked}
              title={entry?.locked ? "Day is locked" : "Select different recipe"}
            >
              Select
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="flex-1"
              onClick={onDeleteRecipe}
              disabled={entry?.locked}
              title={entry?.locked ? "Day is locked" : "Remove recipe"}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      ) : (
        <CardContent className="space-y-3">
          <div className="flex items-center justify-center h-20 bg-muted/30 rounded border-2 border-dashed">
            <ChefHat className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-center text-sm text-muted-foreground">No recipe assigned</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={onSelectRecipe}
            disabled={entry?.locked}
            title={entry?.locked ? "Day is locked" : "Select recipe"}
          >
            Add Recipe
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

function EmptyPlanView({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Ready to plan your meals?</h3>
            <p className="text-muted-foreground">
              Set your preferences above and generate your first meal plan
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecipeSelectionModal({
  recipes,
  onSelect,
  onClose
}: {
  recipes: Recipe[];
  onSelect: (recipe: Recipe) => void;
  onClose: () => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] m-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Select a Recipe</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
          <Input
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </CardHeader>
        <CardContent className="overflow-y-auto">
          <div className="space-y-2">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="flex items-center justify-between p-3 border rounded hover:bg-muted cursor-pointer"
                onClick={() => onSelect(recipe)}
              >
                <div className="flex-1">
                  <h4 className="font-medium">{recipe.title}</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {recipe.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {recipe.cookTimeMin && (
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>{recipe.cookTimeMin}m cook time</span>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm">
                  Select
                </Button>
              </div>
            ))}
            {filteredRecipes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No recipes found matching your search.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
