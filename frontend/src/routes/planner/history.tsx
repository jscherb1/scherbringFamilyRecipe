import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Calendar, ArrowLeft, Trash2, Eye, ShoppingCart, Download, Copy, X, Plus } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { MealPlan, Recipe } from '../../lib/types';
import { formatDate } from '../../lib/utils';

export function PlannerHistory() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  
  // Export modal states
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [ingredientsText, setIngredientsText] = useState('');
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

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

  const exportIngredients = async (planId: string) => {
    try {
      setLoadingIngredients(true);
      const response = await apiClient.exportConsolidatedIngredients(planId);
      setIngredientsText(response.ingredients);
      setCurrentPlanId(planId);
      setShowIngredientsModal(true);
    } catch (error) {
      console.error('Failed to export ingredients:', error);
      alert('Failed to export ingredients. Please try again.');
    } finally {
      setLoadingIngredients(false);
    }
  };

  const exportIngredientsWithStaples = async (planId: string) => {
    try {
      setLoadingIngredients(true);
      const response = await apiClient.exportConsolidatedIngredientsWithStaples(planId);
      setIngredientsText(response.ingredients);
    } catch (error) {
      console.error('Failed to export ingredients with staples:', error);
      alert('Failed to export ingredients with staples. Please try again.');
    } finally {
      setLoadingIngredients(false);
    }
  };

  const exportIcsFile = async (planId: string) => {
    try {
      const blob = await apiClient.exportMealPlanIcs(planId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meal-plan-${planId}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export ICS file:', error);
      alert('Failed to export calendar file. Please try again.');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert('Failed to copy to clipboard. Please select and copy manually.');
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
              onExportIngredients={() => exportIngredients(plan.id)}
              onExportIcs={() => exportIcsFile(plan.id)}
              loadingIngredients={loadingIngredients}
            />
          ))}
        </div>
      )}

      {/* Ingredients Export Modal */}
      {showIngredientsModal && (
        <IngredientsModal
          ingredients={ingredientsText}
          onClose={() => setShowIngredientsModal(false)}
          onCopy={() => copyToClipboard(ingredientsText)}
          onAddStaples={currentPlanId ? () => exportIngredientsWithStaples(currentPlanId) : undefined}
          loadingStaples={loadingIngredients}
        />
      )}
    </div>
  );
}

function PlanCard({ 
  plan, 
  onDelete, 
  isExpanded, 
  onToggleDetails,
  onExportIngredients,
  onExportIcs,
  loadingIngredients
}: { 
  plan: MealPlan; 
  onDelete: () => void;
  isExpanded: boolean;
  onToggleDetails: () => void;
  onExportIngredients: () => void;
  onExportIcs: () => void;
  loadingIngredients: boolean;
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
        <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Week of {formatDate(plan.weekStartDate)}</span>
            </CardTitle>
            <CardDescription>
              Created on {formatDate(plan.createdAt)} • {mealCount} meals planned
            </CardDescription>
          </div>
          <div className="flex flex-col space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-2">
            <Badge variant="secondary">
              {plan.dinnersPerWeek} dinners/week
            </Badge>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/planner/${plan.id}`)} className="flex-1 md:flex-none">
                <Eye className="h-4 w-4 mr-2" />
                View Plan
              </Button>
              <Button variant="outline" size="sm" onClick={onToggleDetails} className="flex-1 md:flex-none">
                {isExpanded ? 'Hide Details' : 'Show Details'}
              </Button>
              <Button variant="outline" size="sm" onClick={onDelete} className="flex-1 md:flex-none">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
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
            
            {/* Export Options */}
            <div className="pt-4 border-t space-y-3">
              <h4 className="font-medium">Export Options:</h4>
              <div className="flex flex-col space-y-2 sm:flex-row sm:flex-wrap sm:gap-2 sm:space-y-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportIngredients}
                  disabled={loadingIngredients}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <ShoppingCart className="h-4 w-4" />
                  {loadingIngredients ? 'Loading...' : 'Export Shopping List'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportIcs}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  Download Calendar (.ics)
                </Button>
              </div>
            </div>
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

function IngredientsModal({
  ingredients,
  onClose,
  onCopy,
  onAddStaples,
  loadingStaples = false
}: {
  ingredients: string;
  onClose: () => void;
  onCopy: () => void;
  onAddStaples?: () => void;
  loadingStaples?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Consolidated Shopping List
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Copy this list to your todo app or shopping app
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="flex-1 overflow-y-auto">
            <Textarea
              value={ingredients}
              readOnly
              className="min-h-[300px] font-mono text-sm resize-none"
              placeholder="Loading ingredients..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {onAddStaples && (
              <Button 
                variant="secondary" 
                onClick={onAddStaples}
                disabled={loadingStaples}
                className="flex items-center gap-2"
              >
                {loadingStaples ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    Loading...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Family Staple Items
                  </>
                )}
              </Button>
            )}
            <Button onClick={onCopy} className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy to Clipboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
