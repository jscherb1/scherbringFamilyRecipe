import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Calendar, Clock, ChefHat, Shuffle, History, Loader } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { MealPlan, MealPlanGenerate, Recipe } from '../../lib/types';
import { formatDate } from '../../lib/utils';

export function PlannerIndex() {
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<MealPlan | null>(null);
  const [planRecipes, setPlanRecipes] = useState<Record<string, Recipe>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadCurrentPlan();
  }, []);

  const loadCurrentPlan = async () => {
    try {
      const plans = await apiClient.getMealPlans();
      // Get the most recent plan
      const latest = plans.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      if (latest) {
        setCurrentPlan(latest);
        // Load recipes for this plan
        const recipeIds = latest.entries
          .filter(entry => entry.recipeId)
          .map(entry => entry.recipeId!);
        
        const recipes: Record<string, Recipe> = {};
        for (const recipeId of recipeIds) {
          try {
            const recipe = await apiClient.getRecipe(recipeId);
            recipes[recipeId] = recipe;
          } catch (error) {
            console.error(`Failed to load recipe ${recipeId}:`, error);
          }
        }
        setPlanRecipes(recipes);
      }
    } catch (error) {
      console.error('Failed to load meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateNewPlan = async () => {
    try {
      setGenerating(true);
      
      // Get default preferences (we'll use sensible defaults for now)
      const request: MealPlanGenerate = {
        weekStartDate: new Date().toISOString().split('T')[0],
        dinnersPerWeek: 5,
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
      
      // Create the meal plan from the response
      const newPlan = await apiClient.createMealPlan({
        weekStartDate: request.weekStartDate,
        dinnersPerWeek: request.dinnersPerWeek,
        constraints: request.constraints,
        entries: response.entries
      });
      
      setCurrentPlan(newPlan);
      
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

  const deletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this meal plan?')) {
      return;
    }

    try {
      await apiClient.deleteMealPlan(planId);
      setCurrentPlan(null);
      setPlanRecipes({});
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
      alert('Failed to delete meal plan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading meal plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meal Planner</h1>
          <p className="text-muted-foreground">
            Generate and manage your weekly dinner plans
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate('/planner/history')}
          >
            <History className="h-4 w-4 mr-2" />
            View History
          </Button>
          <Button
            onClick={generateNewPlan}
            disabled={generating}
          >
            {generating ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shuffle className="h-4 w-4 mr-2" />
            )}
            {generating ? 'Generating...' : 'Generate New Plan'}
          </Button>
        </div>
      </div>

      {currentPlan ? (
        <CurrentPlanView 
          plan={currentPlan} 
          recipes={planRecipes}
          onDelete={() => deletePlan(currentPlan.id)}
        />
      ) : (
        <EmptyPlanView onGenerate={generateNewPlan} generating={generating} />
      )}
    </div>
  );
}

function CurrentPlanView({ 
  plan, 
  recipes, 
  onDelete 
}: { 
  plan: MealPlan; 
  recipes: Record<string, Recipe>; 
  onDelete: () => void;
}) {
  const mealEntries = plan.entries.filter(entry => entry.recipeId);
  
  return (
    <div className="space-y-6">
      {/* Plan Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Current Meal Plan</span>
              </CardTitle>
              <CardDescription>
                Week starting {formatDate(plan.weekStartDate)} • Created on {formatDate(plan.createdAt)}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Badge variant="secondary">
                {mealEntries.length} meals
              </Badge>
              <Button variant="outline" size="sm" onClick={onDelete}>
                Delete Plan
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Meals Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mealEntries.map((entry, index) => {
          const recipe = entry.recipeId ? recipes[entry.recipeId] : null;
          return (
            <MealCard 
              key={entry.date} 
              entry={entry} 
              recipe={recipe} 
              dayNumber={index + 1} 
            />
          );
        })}
      </div>
    </div>
  );
}

function MealCard({ 
  entry, 
  recipe, 
  dayNumber 
}: { 
  entry: any; 
  recipe: Recipe | null; 
  dayNumber: number;
}) {
  if (!recipe) {
    return (
      <Card>
        <CardHeader>
          <Badge variant="outline">Day {dayNumber}</Badge>
          <CardTitle className="text-lg">No recipe assigned</CardTitle>
          <CardDescription>{formatDate(entry.date)}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline">Day {dayNumber}</Badge>
          {recipe.rating && (
            <div className="flex items-center space-x-1">
              <span className="text-sm text-muted-foreground">★</span>
              <span className="text-sm font-medium">{recipe.rating}</span>
            </div>
          )}
        </div>
        <CardTitle className="text-lg">{recipe.title}</CardTitle>
        <CardDescription>{formatDate(entry.date)}</CardDescription>
        {recipe.description && (
          <CardDescription className="line-clamp-2 mt-2">
            {recipe.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {recipe.proteinType && (
            <Badge variant="secondary" className="text-xs">
              {recipe.proteinType}
            </Badge>
          )}
          {recipe.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {recipe.tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{recipe.tags.length - 2}
            </Badge>
          )}
        </div>

        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          {recipe.prepTimeMin && (
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{recipe.prepTimeMin + (recipe.cookTimeMin || 0)}m</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center space-x-1">
              <ChefHat className="h-3 w-3" />
              <span>{recipe.servings} servings</span>
            </div>
          )}
        </div>

        {entry.notes && (
          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
            {entry.notes}
          </div>
        )}
      </CardContent>
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
            <h3 className="text-lg font-semibold">No meal plan yet</h3>
            <p className="text-muted-foreground">
              Generate your first weekly meal plan to get started
            </p>
          </div>
          <Button onClick={onGenerate} disabled={generating} size="lg">
            {generating ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Shuffle className="h-4 w-4 mr-2" />
            )}
            {generating ? 'Generating...' : 'Generate Meal Plan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
