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
    // For now, just regenerate everything since we don't have locking implemented
    await generatePlan();
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
                  key={index}
                  dayName={getDayName(index)}
                  dayDate={getDayDate(index)}
                  recipe={recipe}
                  entry={entry}
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
    </div>
  );
}

function DayCard({ 
  dayName, 
  dayDate, 
  recipe, 
  entry 
}: { 
  dayName: string;
  dayDate: string;
  recipe: Recipe | null; 
  entry?: MealPlanEntry;
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
          {entry?.locked && (
            <Badge variant="secondary" className="text-xs">
              🔒
            </Badge>
          )}
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
            <Button variant="outline" size="sm" className="flex-1">
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
        </CardContent>
      ) : (
        <CardContent className="space-y-3">
          <div className="flex items-center justify-center h-20 bg-muted/30 rounded border-2 border-dashed">
            <ChefHat className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-center text-sm text-muted-foreground">No recipe assigned</p>
          <Button variant="outline" size="sm" className="w-full">
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
