import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Calendar, ArrowLeft, Trash2, Eye } from 'lucide-react';
import { apiClient } from '../../lib/api';
import { MealPlan } from '../../lib/types';
import { formatDate } from '../../lib/utils';

export function PlannerHistory() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);

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
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlanCard({ plan, onDelete }: { plan: MealPlan; onDelete: () => void }) {
  const mealCount = plan.entries.filter(entry => entry.recipeId).length;
  
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
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {mealCount > 0 && (
        <CardContent>
          <div className="space-y-3">
            <h4 className="font-medium">Meal Schedule:</h4>
            <div className="grid gap-2 text-sm">
              {plan.entries
                .filter(entry => entry.recipeId)
                .map((entry, index) => (
                  <div key={entry.date} className="flex items-center justify-between py-1">
                    <span className="text-muted-foreground">
                      Day {index + 1} ({formatDate(entry.date)})
                    </span>
                    <span className="font-medium">Recipe planned</span>
                  </div>
                ))}
            </div>
            
            {plan.constraints.excludeIngredients.length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-sm">
                  <span className="font-medium">Excluded ingredients: </span>
                  <span className="text-muted-foreground">
                    {plan.constraints.excludeIngredients.join(', ')}
                  </span>
                </div>
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
