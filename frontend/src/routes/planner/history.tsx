import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Calendar, ArrowLeft, Trash2, Eye } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { MealPlan, Recipe } from '../../lib/types';
import { formatDate } from '../../lib/utils';

export function PlannerHistory() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const allPlans = await apiClient.getMealPlans();
      // Sort by creation date (newest first)
      const sortedPlans = allPlans.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPlans(sortedPlans);
    } catch (error) {
      console.error('Failed to load meal plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this meal plan?')) {
      return;
    }

    try {
      await apiClient.deleteMealPlan(planId);
      setPlans(plans.filter(plan => plan.id !== planId));
    } catch (error) {
      console.error('Failed to delete meal plan:', error);
      alert('Failed to delete meal plan');
    }
  };

  const togglePlanDetails = (planId: string) => {
    setExpandedPlan(expandedPlan === planId ? null : planId);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/planner')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Planner
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Meal Plan History</h1>
          <p className="text-muted-foreground">
            View and manage your previous meal plans
          </p>
        </div>
      </div>

      {plans.length === 0 ? (
        <EmptyHistoryView />
      ) : (
        <div className="space-y-4">
          {plans.map((plan) => (
            <PlanCard 
              key={plan.id} 
              plan={plan} 
              onDelete={() => deletePlan(plan.id)}
              isExpanded={expandedPlan === plan.id}
              onToggleDetails={() => togglePlanDetails(plan.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({ 
  plan, 
  onDelete, 
  isExpanded, 
  onToggleDetails 
}: { 
  plan: MealPlan; 
  onDelete: () => void;
  isExpanded: boolean;
  onToggleDetails: () => void;
}) {
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  
  const mealCount = plan.entries.filter(entry => entry.recipeId).length;

  useEffect(() => {
    if (isExpanded && mealCount > 0) {
      loadRecipes();
    }
  }, [isExpanded, mealCount]);

  const loadRecipes = async () => {
    try {
      setLoadingRecipes(true);
      const recipeIds = plan.entries
        .filter(entry => entry.recipeId)
        .map(entry => entry.recipeId!);

      const recipeMap: Record<string, Recipe> = {};
      for (const recipeId of recipeIds) {
        try {
          const recipe = await apiClient.getRecipe(recipeId);
          recipeMap[recipeId] = recipe;
        } catch (error) {
          console.error(`Failed to load recipe ${recipeId}:`, error);
        }
      }
      setRecipes(recipeMap);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Week of {formatDate(plan.weekStartDate)}</span>
            </CardTitle>
            <CardDescription>
              Created on {formatDate(plan.createdAt)} • {mealCount} meals planned
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary">
              {plan.dinnersPerWeek} dinners/week
            </Badge>
            <Button variant="outline" size="sm" onClick={onToggleDetails}>
              <Eye className="h-4 w-4 mr-2" />
              {isExpanded ? 'Hide Details' : 'View Details'}
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-3">Meal Schedule:</h4>
              {loadingRecipes ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Loading recipes...</span>
                </div>
              ) : (
                <div className="grid gap-3">
                  {plan.entries
                    .filter(entry => entry.recipeId)
                    .map((entry, index) => {
                      const recipe = recipes[entry.recipeId!];
                      return (
                        <div key={entry.date} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="space-y-1">
                            <div className="font-medium">
                              {getDayName(entry.date)} ({formatDate(entry.date)})
                            </div>
                            {recipe ? (
                              <div className="space-y-1">
                                <div className="text-lg font-medium text-primary">
                                  {recipe.title}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {recipe.tags.slice(0, 3).map(tag => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {recipe.cookTimeMin && (
                                    <Badge variant="secondary" className="text-xs">
                                      {recipe.cookTimeMin}m cook
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground">Recipe not found</div>
                            )}
                          </div>
                          {recipe && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/recipes/${recipe.id}`)}
                            >
                              View Recipe
                            </Button>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
            
            {(plan.constraints.excludeIngredients.length > 0 || 
              plan.constraints.includeTags.length > 0 || 
              plan.constraints.excludeTags.length > 0) && (
              <div className="pt-4 border-t space-y-2">
                <h4 className="font-medium">Constraints Used:</h4>
                {plan.constraints.excludeIngredients.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Excluded ingredients: </span>
                    <span className="text-muted-foreground">
                      {plan.constraints.excludeIngredients.join(', ')}
                    </span>
                  </div>
                )}
                {plan.constraints.includeTags.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Required tags: </span>
                    <span className="text-muted-foreground">
                      {plan.constraints.includeTags.join(', ')}
                    </span>
                  </div>
                )}
                {plan.constraints.excludeTags.length > 0 && (
                  <div className="text-sm">
                    <span className="font-medium">Excluded tags: </span>
                    <span className="text-muted-foreground">
                      {plan.constraints.excludeTags.join(', ')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      )}
      
      {!isExpanded && mealCount > 0 && (
        <CardContent>
          <div className="space-y-3">
            <h4 className="font-medium">Meal Schedule:</h4>
            <div className="grid gap-2 text-sm">
              {plan.entries
                .filter(entry => entry.recipeId)
                .map((entry, index) => (
                  <div key={entry.date} className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">
                      {getDayName(entry.date)} ({formatDate(entry.date)})
                    </span>
                    <span className="font-medium">Recipe planned</span>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function EmptyHistoryView() {
  return (
    <Card className="text-center py-12">
      <CardContent>
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Calendar className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No meal plans yet</h3>
            <p className="text-muted-foreground">
              Create your first meal plan to see it here
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
