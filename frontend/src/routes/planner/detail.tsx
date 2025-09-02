import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { GoogleCalendarSyncModal } from '../../components/ui/GoogleCalendarSyncModal';
import { 
  Calendar, 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Trash2, 
  ShoppingCart, 
  Download, 
  Copy,
  Lock,
  Unlock,
  RotateCcw,
  Send
} from 'lucide-react';
import { apiClient } from '../../lib/api';
import { MealPlan, Recipe, MealPlanEntry, MealPlanUpdate } from '../../lib/types';
import { formatDate } from '../../lib/utils';

export function PlannerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [recipes, setRecipes] = useState<Record<string, Recipe>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Export modal states
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  const [ingredientsText, setIngredientsText] = useState('');
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  
  // Todoist export state
  const [sendingToTodoist, setSendingToTodoist] = useState(false);
  const [includeStaples, setIncludeStaples] = useState(false);
  
  // AI consolidation state
  const [aiConsolidationUsed, setAiConsolidationUsed] = useState(false);
  const [consolidationMethod, setConsolidationMethod] = useState('');
  
  // Google Calendar sync state
  const [showGoogleCalendarModal, setShowGoogleCalendarModal] = useState(false);
  
  // Editable ingredients state
  const [editedIngredientsText, setEditedIngredientsText] = useState('');
  const [isIngredientsEdited, setIsIngredientsEdited] = useState(false);

  useEffect(() => {
    if (id) {
      loadPlan();
    }
  }, [id]);

  // Reload ingredients when staples option changes and modal is open
  useEffect(() => {
    if (showIngredientsModal && plan) {
      loadIngredients();
    }
  }, [includeStaples, showIngredientsModal, plan]);

  // Sync edited ingredients when original ingredients change
  useEffect(() => {
    setEditedIngredientsText(ingredientsText);
    setIsIngredientsEdited(false);
  }, [ingredientsText]);

  const loadPlan = async () => {
    try {
      setLoading(true);
      const mealPlan = await apiClient.getMealPlan(id!);
      setPlan(mealPlan);
      setEditedName(mealPlan.name || '');
      setEditedDescription(mealPlan.description || '');
      
      // Load recipes for the meal plan
      const recipeIds = mealPlan.entries
        .filter(entry => entry.recipeId)
        .map(entry => entry.recipeId!);
      
      if (recipeIds.length > 0) {
        const recipesMap: Record<string, Recipe> = {};
        // Load recipes individually - you might want to optimize this with a bulk endpoint
        for (const recipeId of recipeIds) {
          try {
            const recipe = await apiClient.getRecipe(recipeId);
            recipesMap[recipeId] = recipe;
          } catch (err) {
            console.error(`Failed to load recipe ${recipeId}:`, err);
          }
        }
        setRecipes(recipesMap);
      }
    } catch (err) {
      console.error('Failed to load meal plan:', err);
      setError('Failed to load meal plan');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!plan) return;
    
    try {
      setSaving(true);
      
      const update: MealPlanUpdate = {
        name: editedName || undefined,
        description: editedDescription || undefined
      };
      
      const updatedPlan = await apiClient.updateMealPlan(plan.id, update);
      setPlan(updatedPlan);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update meal plan:', err);
      alert('Failed to update meal plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!plan) return;
    
    if (!confirm('Are you sure you want to delete this meal plan?')) {
      return;
    }

    try {
      await apiClient.deleteMealPlan(plan.id);
      navigate('/planner/history');
    } catch (err) {
      console.error('Failed to delete meal plan:', err);
      alert('Failed to delete meal plan');
    }
  };

  const exportIngredients = async () => {
    if (!plan) return;
    setShowIngredientsModal(true);
    await loadIngredients();
  };

  const loadIngredients = async () => {
    if (!plan) return;
    
    try {
      setLoadingIngredients(true);
      const response = includeStaples 
        ? await apiClient.exportConsolidatedIngredientsWithStaples(plan.id)
        : await apiClient.exportConsolidatedIngredients(plan.id);
      setIngredientsText(response.ingredients);
      
      // Update AI consolidation information
      if (response.ai_consolidation_used !== undefined) {
        setAiConsolidationUsed(response.ai_consolidation_used);
      }
      if (response.consolidation_method) {
        setConsolidationMethod(response.consolidation_method);
      }
    } catch (err) {
      console.error('Failed to load ingredients:', err);
      alert('Failed to load ingredients. Please try again.');
    } finally {
      setLoadingIngredients(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy to clipboard. Please select and copy manually.');
    }
  };

  const sendToTodoist = async () => {
    if (!plan) return;
    
    try {
      setSendingToTodoist(true);
      const result = await apiClient.exportToTodoist(plan.id, includeStaples);
      
      if (result.success) {
        alert(`Success! Added ${result.itemsAdded} items to ${result.projectName}${result.totalItems > result.itemsAdded ? ` (${result.totalItems - result.itemsAdded} items were already in the list)` : ''}`);
      } else {
        alert('Failed to send to Todoist');
      }
    } catch (error: any) {
      console.error('Failed to send to Todoist:', error);
      let errorMessage = 'Failed to send to Todoist';
      
      if (error.message.includes('Todoist integration not configured')) {
        errorMessage = 'Please configure Todoist integration in your profile settings first.';
      } else if (error.message.includes('not configured')) {
        errorMessage = 'Todoist API key not configured. Please contact the administrator.';
      }
      
      alert(errorMessage);
    } finally {
      setSendingToTodoist(false);
    }
  };

  const exportIcsFile = async () => {
    if (!plan) return;
    
    try {
      const blob = await apiClient.exportMealPlanIcs(plan.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meal-plan-${plan.id}.ics`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to export ICS file:', err);
      alert('Failed to export calendar file. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading meal plan...</p>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Error</h1>
        <p className="text-muted-foreground">{error || 'Meal plan not found'}</p>
        <Button onClick={() => navigate('/planner')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Planner
        </Button>
      </div>
    );
  }

  const mealCount = plan.entries.filter(entry => entry.recipeId).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/planner')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Planner
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {plan.name || `Week of ${formatDate(plan.weekStartDate)}`}
            </h1>
            <p className="text-muted-foreground">
              {plan.description || `${mealCount} planned meals`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" onClick={exportIngredients} disabled={loadingIngredients}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Shopping List
              </Button>
              <Button variant="outline" onClick={() => setShowGoogleCalendarModal(true)}>
                <Calendar className="h-4 w-4 mr-2" />
                Google Calendar
              </Button>
              <Button variant="outline" onClick={exportIcsFile}>
                <Download className="h-4 w-4 mr-2" />
                Download .ics
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>Edit Meal Plan</CardTitle>
            <CardDescription>Update the name and description of your meal plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter meal plan name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                placeholder="Enter meal plan description"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Meal Plan Overview</span>
          </CardTitle>
          <CardDescription>
            Week starting {formatDate(plan.weekStartDate)} • {mealCount} meals planned
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {plan.entries.map((entry, index) => {
              const recipe = entry.recipeId ? recipes[entry.recipeId] : null;
              const entryDate = new Date(entry.date);
              
              return (
                <div key={entry.date} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-muted-foreground">
                        {entryDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </div>
                      {entry.locked && (
                        <Lock className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    
                    {recipe ? (
                      <div className="mt-1">
                        <h4 className="font-medium">{recipe.title}</h4>
                        {recipe.tags && recipe.tags.length > 0 && (
                          <div className="flex items-center space-x-1 mt-1">
                            {recipe.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {recipe.tags.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{recipe.tags.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1 text-muted-foreground">
                        No meal planned
                      </div>
                    )}
                    
                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                    )}
                  </div>
                  
                  {recipe && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/recipes/${recipe.id}`)}
                      >
                        View Recipe
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ingredients Export Modal */}
      {showIngredientsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">Shopping List</h3>
                {isIngredientsEdited && <Badge variant="outline">Edited</Badge>}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowIngredientsModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {loadingIngredients ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm text-muted-foreground">Loading ingredients...</span>
                </div>
              ) : (
                <Textarea
                  value={editedIngredientsText}
                  onChange={(e) => {
                    setEditedIngredientsText(e.target.value);
                    setIsIngredientsEdited(e.target.value !== ingredientsText);
                  }}
                  className="min-h-[300px] font-mono text-sm resize-none"
                  placeholder="Enter ingredients, one per line..."
                />
              )}
            </div>
            <div className="p-4 border-t space-y-3">
              {/* AI Consolidation Information */}
              {consolidationMethod && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm">
                      <span className="font-medium text-blue-900">Consolidation Method: </span>
                      <span className="text-blue-700">{consolidationMethod}</span>
                    </div>
                    {aiConsolidationUsed && (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                        AI Enhanced
                      </Badge>
                    )}
                  </div>
                  {aiConsolidationUsed && (
                    <p className="text-xs text-blue-600 mt-1">
                      Ingredients were intelligently consolidated using grocery shopping AI
                    </p>
                  )}
                </div>
              )}
              
              {/* Include staples option */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-staples"
                  checked={includeStaples}
                  onChange={(e) => setIncludeStaples(e.target.checked)}
                  className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="include-staples" className="text-sm text-gray-700">
                  Include staple groceries from profile
                </label>
              </div>
              
              {/* Buttons */}
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => copyToClipboard(editedIngredientsText)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button 
                  onClick={async () => {
                    if (isIngredientsEdited) {
                      // Use custom ingredients export for edited ingredients
                      try {
                        setSendingToTodoist(true);
                        const result = await apiClient.exportCustomIngredientsToTodoist(editedIngredientsText);
                        
                        if (result.success) {
                          alert(`Success! Added ${result.itemsAdded} items to ${result.projectName}${result.totalItems > result.itemsAdded ? ` (${result.totalItems - result.itemsAdded} items were already in the list)` : ''}`);
                        } else {
                          alert('Failed to send to Todoist');
                        }
                      } catch (error: any) {
                        console.error('Failed to send custom ingredients to Todoist:', error);
                        let errorMessage = 'Failed to send to Todoist';
                        
                        if (error.message.includes('Todoist integration not configured')) {
                          errorMessage = 'Please configure Todoist integration in your profile settings first.';
                        } else if (error.message.includes('not configured')) {
                          errorMessage = 'Todoist API key not configured. Please contact the administrator.';
                        }
                        
                        alert(errorMessage);
                      } finally {
                        setSendingToTodoist(false);
                      }
                    } else {
                      // Use original meal plan export for unedited ingredients
                      sendToTodoist();
                    }
                  }}
                  disabled={sendingToTodoist}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingToTodoist ? 'Sending...' : 'Send to Todoist'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar Sync Modal */}
      {plan && (
        <GoogleCalendarSyncModal
          open={showGoogleCalendarModal}
          onClose={() => setShowGoogleCalendarModal(false)}
          mealPlanId={plan.id}
          mealPlanName={plan.name}
        />
      )}
    </div>
  );
}
