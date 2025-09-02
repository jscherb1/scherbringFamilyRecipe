export interface Ingredient {
  text: string;
  includeInShoppingList?: boolean;  // camelCase version
  include_in_shopping_list?: boolean;  // snake_case version from backend
}

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
  ingredients: (Ingredient | string)[];  // Support both new and legacy formats
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
  ingredients: (Ingredient | string)[];  // Support both new and legacy formats
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

export interface RecipeCreateBulk {
  title: string;
  description?: string;
  ingredientsText?: string;  // Bulk ingredients as text, separated by line breaks
  stepsText?: string;        // Bulk steps as text, separated by line breaks
  ingredients?: (Ingredient | string)[];    // Individual ingredients list (alternative to ingredientsText)
  steps?: string[];          // Individual steps list (alternative to stepsText)
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
  ingredients?: (Ingredient | string)[];
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

export interface RecipeUpdateBulk {
  title?: string;
  description?: string;
  ingredientsText?: string;  // Bulk ingredients as text, separated by line breaks
  stepsText?: string;        // Bulk steps as text, separated by line breaks
  ingredients?: string[];    // Individual ingredients list (alternative to ingredientsText)
  steps?: string[];          // Individual steps list (alternative to stepsText)
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
  name?: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanCreate {
  weekStartDate: string;
  dinnersPerWeek: number;
  constraints: PlannerConstraints;
  entries: MealPlanEntry[];
  name?: string;
  description?: string;
}

export interface MealPlanUpdate {
  dinnersPerWeek?: number;
  constraints?: PlannerConstraints;
  entries?: MealPlanEntry[];
  name?: string;
  description?: string;
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
  stapleGroceries: string[];
  exportPrefs: Record<string, any>;
  todoistProjectId?: string;
  todoistProjectName?: string;
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
  stapleGroceries?: string[];
  exportPrefs?: Record<string, any>;
  todoistProjectId?: string;
  todoistProjectName?: string;
}

export interface RecipeUrlParseRequest {
  url: string;
}

export interface RecipeUrlParseResponse {
  success: boolean;
  recipeData?: RecipeCreateBulk;
  error?: string;
}

export interface RecipeAIImageGenerateRequest {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
}

export interface RecipeAIImageGenerateResponse {
  success: boolean;
  imageUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

// Todoist Integration Types
export interface TodoistProject {
  id: string;
  name: string;
  color?: string;
  isShared?: boolean;
  isFavorite?: boolean;
}

export interface TodoistProjectsResponse {
  projects: TodoistProject[];
}

export interface TodoistConnectionResponse {
  connected: boolean;
  error?: string;
}

export interface TodoistExportResponse {
  success: boolean;
  itemsAdded: number;
  totalItems: number;
  projectName: string;
  message: string;
}

// Google Calendar Integration Types
export interface GoogleCalendar {
  id: string;
  name: string;
  description: string;
  primary: boolean;
  access_role: string;
}

export interface GoogleCalendarConflictingEvent {
  id: string;
  title: string;
  date: string;
  description: string;
}

export interface GoogleCalendarConflictCheck {
  has_conflicts: boolean;
  conflicting_events: GoogleCalendarConflictingEvent[];
}

export interface GoogleCalendarCreatedEvent {
  id: string;
  title: string;
  date: string;
}

export interface GoogleCalendarSyncResult {
  success: boolean;
  events_created?: number;
  created_events?: GoogleCalendarCreatedEvent[];
  total_entries?: number;
  error?: string;
  conflicting_events?: GoogleCalendarConflictingEvent[];
}
