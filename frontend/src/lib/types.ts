export type ProteinType = 
  | "beef"
  | "chicken" 
  | "pork"
  | "fish"
  | "seafood"
  | "vegetarian"
  | "vegan"
  | "other";

export type MealType = 
  | "dinner"
  | "lunch"
  | "breakfast"
  | "snack"
  | "misc";

export interface Recipe {
  id: string;
  userId: string;
  type: "Recipe";
  title: string;
  description?: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  proteinType?: ProteinType;
  mealType: MealType;
  prepTimeMin?: number;
  cookTimeMin?: number;
  totalTimeMin?: number;
  servings?: number;
  rating?: number;
  sourceUrl?: string;
  notes?: string;
  lastCookedAt?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeCreate {
  title: string;
  description?: string;
  ingredients: string[];
  steps: string[];
  tags: string[];
  proteinType?: ProteinType;
  mealType: MealType;
  prepTimeMin?: number;
  cookTimeMin?: number;
  totalTimeMin?: number;
  servings?: number;
  rating?: number;
  sourceUrl?: string;
  notes?: string;
  lastCookedAt?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface RecipeUpdate {
  title?: string;
  description?: string;
  ingredients?: string[];
  steps?: string[];
  tags?: string[];
  proteinType?: ProteinType;
  mealType?: MealType;
  prepTimeMin?: number;
  cookTimeMin?: number;
  totalTimeMin?: number;
  servings?: number;
  rating?: number;
  sourceUrl?: string;
  notes?: string;
  lastCookedAt?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

export interface RecipeListResponse {
  recipes: Recipe[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MealPlanEntry {
  date: string;
  recipeId?: string;
  notes?: string;
  locked: boolean;
}

export interface PlannerConstraints {
  excludeIngredients: string[];
  includeTags: string[];
  excludeTags: string[];
  avoidRepeatWeeks: number;
  balanceProteinTypes: boolean;
  maxCookTimeMin?: number;
  requiredRecipes: string[];
  startWeekOn: "monday" | "sunday";
}

export interface MealPlan {
  id: string;
  userId: string;
  type: "MealPlan";
  weekStartDate: string;
  dinnersPerWeek: number;
  constraints: PlannerConstraints;
  entries: MealPlanEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanGenerate {
  weekStartDate: string;
  dinnersPerWeek: number;
  constraints: PlannerConstraints;
  seed?: string;
}

export interface MealPlanGenerateResponse {
  entries: MealPlanEntry[];
  recipes: Recipe[];
  message: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  type: "UserProfile";
  likes: string[];
  dislikes: string[];
  defaultDinnersPerWeek: number;
  startWeekOn: "monday" | "sunday";
  timezone: string;
  tagCatalog: string[];
  exportPrefs: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfileUpdate {
  likes?: string[];
  dislikes?: string[];
  defaultDinnersPerWeek?: number;
  startWeekOn?: "monday" | "sunday";
  timezone?: string;
  tagCatalog?: string[];
  exportPrefs?: Record<string, any>;
}
