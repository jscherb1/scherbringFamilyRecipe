import { 
  Recipe, 
  RecipeCreate, 
  RecipeCreateBulk,
  RecipeUpdate, 
  RecipeUpdateBulk,
  RecipeListResponse,
  RecipeUrlParseRequest,
  RecipeUrlParseResponse,
  RecipeAIImageGenerateRequest,
  RecipeAIImageGenerateResponse,
  MealPlan,
  MealPlanGenerate,
  MealPlanGenerateResponse,
  UserProfile,
  UserProfileUpdate,
  ProteinType,
  MealType
} from './types';

// Get API base URL dynamically
const getApiBaseUrl = () => {
  // Check for runtime environment variable (Docker)
  if (typeof window !== 'undefined' && (window as any)._env_?.VITE_API_BASE_URL) {
    const envUrl = (window as any)._env_.VITE_API_BASE_URL;
    
    // If we're in Codespaces and the env URL is http://backend:8000, use the external HTTPS URL instead
    if (window.location.hostname.includes('app.github.dev') && envUrl === 'http://backend:8000') {
      const hostname = window.location.hostname;
      const baseUrl = hostname.replace('-3000.', '-8000.');
      return `https://${baseUrl}`;
    }
    
    return envUrl;
  }
  
  // Check for build-time environment variable (Vite)
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // Auto-detect Codespaces environment
  if (typeof window !== 'undefined' && window.location.hostname.includes('app.github.dev')) {
    const hostname = window.location.hostname;
    const baseUrl = hostname.replace('-3000.', '-8000.');
    return `https://${baseUrl}`;
  }
  
  // Fallback to localhost for local development
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Handle empty responses
      const contentLength = response.headers.get('content-length');
      if (contentLength === '0') {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Recipes
  async getRecipes(params?: {
    search?: string;
    tag?: string;
    proteinType?: ProteinType;
    mealType?: MealType;
    page?: number;
    pageSize?: number;
  }): Promise<RecipeListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.search) searchParams.append('search', params.search);
    if (params?.tag) searchParams.append('tag', params.tag);
    if (params?.proteinType) searchParams.append('protein_type', params.proteinType);
    if (params?.mealType) searchParams.append('meal_type', params.mealType);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.pageSize) searchParams.append('page_size', params.pageSize.toString());

    const queryString = searchParams.toString();
    const endpoint = `/api/recipes/${queryString ? `?${queryString}` : ''}`;
    
    return this.request<RecipeListResponse>(endpoint);
  }

  async getRecipe(id: string): Promise<Recipe> {
    return this.request<Recipe>(`/api/recipes/${id}`);
  }

  async createRecipe(recipe: RecipeCreate): Promise<Recipe> {
    return this.request<Recipe>('/api/recipes/', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  }

  async createRecipeBulk(recipe: RecipeCreateBulk): Promise<Recipe> {
    return this.request<Recipe>('/api/recipes/bulk', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  }

  async parseRecipeFromUrl(request: RecipeUrlParseRequest): Promise<RecipeUrlParseResponse> {
    return this.request<RecipeUrlParseResponse>('/api/recipes/parse-url', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async createRecipeWithImage(formData: FormData): Promise<Recipe> {
    const url = `${API_BASE_URL}/api/recipes/with-image`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData, // Don't set Content-Type header for FormData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  }

  async createRecipeWithImageBulk(formData: FormData): Promise<Recipe> {
    const url = `${API_BASE_URL}/api/recipes/with-image-bulk`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData, // Don't set Content-Type header for FormData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  }

  async uploadRecipeImage(id: string, file: File): Promise<Recipe> {
    const formData = new FormData();
    formData.append('image', file);
    
    const url = `${API_BASE_URL}/api/recipes/${id}/image`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  }

  async deleteRecipeImage(id: string): Promise<Recipe> {
    return this.request<Recipe>(`/api/recipes/${id}/image`, {
      method: 'DELETE',
    });
  }

  async updateRecipe(id: string, recipe: RecipeUpdate): Promise<Recipe> {
    return this.request<Recipe>(`/api/recipes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(recipe),
    });
  }

  async updateRecipeBulk(id: string, recipe: RecipeUpdateBulk): Promise<Recipe> {
    return this.request<Recipe>(`/api/recipes/${id}/bulk`, {
      method: 'PATCH',
      body: JSON.stringify(recipe),
    });
  }

  async deleteRecipe(id: string): Promise<void> {
    await this.request(`/api/recipes/${id}`, {
      method: 'DELETE',
    });
  }

  async getTags(): Promise<string[]> {
    return this.request<string[]>('/api/tags/');
  }

  // Meal Plans
  async generateMealPlan(request: MealPlanGenerate): Promise<MealPlanGenerateResponse> {
    return this.request<MealPlanGenerateResponse>('/api/mealplans/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async createMealPlan(mealPlan: any): Promise<MealPlan> {
    return this.request<MealPlan>('/api/mealplans/', {
      method: 'POST',
      body: JSON.stringify(mealPlan),
    });
  }

  async getMealPlans(params?: {
    fromDate?: string;
    toDate?: string;
  }): Promise<MealPlan[]> {
    const searchParams = new URLSearchParams();
    
    if (params?.fromDate) searchParams.append('from_date', params.fromDate);
    if (params?.toDate) searchParams.append('to_date', params.toDate);

    const queryString = searchParams.toString();
    const endpoint = `/api/mealplans/${queryString ? `?${queryString}` : ''}`;
    
    return this.request<MealPlan[]>(endpoint);
  }

  async getMealPlan(id: string): Promise<MealPlan> {
    return this.request<MealPlan>(`/api/mealplans/${id}`);
  }

  async updateMealPlan(id: string, update: any): Promise<MealPlan> {
    return this.request<MealPlan>(`/api/mealplans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(update),
    });
  }

  async lockMealPlanEntries(id: string, entryDates: string[], locked: boolean): Promise<any> {
    return this.request(`/api/mealplans/${id}/lock`, {
      method: 'POST',
      body: JSON.stringify({ entry_dates: entryDates, locked }),
    });
  }

  async deleteMealPlan(id: string): Promise<void> {
    await this.request(`/api/mealplans/${id}`, {
      method: 'DELETE',
    });
  }

  // Exports
  async exportMealPlanCsv(id: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/mealplans/${id}/export.csv`);
    return response.blob();
  }

  async exportMealPlanJson(id: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/mealplans/${id}/export.json`);
    return response.blob();
  }

  async exportMealPlanTxt(id: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/mealplans/${id}/export.txt`);
    return response.blob();
  }

  async exportConsolidatedIngredients(id: string): Promise<{ingredients: string}> {
    return this.request<{ingredients: string}>(`/api/mealplans/${id}/export/ingredients`);
  }

  async exportConsolidatedIngredientsWithStaples(id: string): Promise<{ingredients: string}> {
    return this.request<{ingredients: string}>(`/api/mealplans/${id}/export/ingredients/with-staples`);
  }

  async exportMealPlanIcs(id: string): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/api/mealplans/${id}/export.ics`);
    return response.blob();
  }

  // Profile
  async getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('/api/profile/');
  }

  async updateProfile(profile: UserProfileUpdate): Promise<UserProfile> {
    return this.request<UserProfile>('/api/profile/', {
      method: 'PATCH',
      body: JSON.stringify(profile),
    });
  }

  async addTagToCatalog(tag: string): Promise<UserProfile> {
    return this.request<UserProfile>(`/api/profile/tags/${encodeURIComponent(tag)}`, {
      method: 'POST',
    });
  }

  async removeTagFromCatalog(tag: string): Promise<UserProfile> {
    return this.request<UserProfile>(`/api/profile/tags/${encodeURIComponent(tag)}`, {
      method: 'DELETE',
    });
  }

  // AI Recipe Generation
  async generateRecipeWithAI(prompt: string): Promise<{ success: boolean; recipeData?: any; error?: string }> {
    return this.request<{ success: boolean; recipeData?: any; error?: string }>('/api/recipes/generate-ai', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  }

  async generateRecipeDescriptionWithAI(title: string, existingIngredients?: string, existingInstructions?: string): Promise<{ success: boolean; generatedText?: string; error?: string }> {
    return this.request<{ success: boolean; generatedText?: string; error?: string }>('/api/recipes/generate-ai-description', {
      method: 'POST',
      body: JSON.stringify({ 
        title,
        existing_ingredients: existingIngredients || "",
        existing_instructions: existingInstructions || ""
      }),
    });
  }

  async generateRecipeIngredientsWithAI(title: string, existingDescription?: string, existingInstructions?: string): Promise<{ success: boolean; generatedText?: string; error?: string }> {
    return this.request<{ success: boolean; generatedText?: string; error?: string }>('/api/recipes/generate-ai-ingredients', {
      method: 'POST',
      body: JSON.stringify({ 
        title,
        existing_description: existingDescription || "",
        existing_instructions: existingInstructions || ""
      }),
    });
  }

  async generateRecipeInstructionsWithAI(title: string, existingDescription?: string, existingIngredients?: string): Promise<{ success: boolean; generatedText?: string; error?: string }> {
    return this.request<{ success: boolean; generatedText?: string; error?: string }>('/api/recipes/generate-ai-instructions', {
      method: 'POST',
      body: JSON.stringify({ 
        title,
        existing_description: existingDescription || "",
        existing_ingredients: existingIngredients || ""
      }),
    });
  }

  async generateRandomRecipeWithAI(): Promise<{ success: boolean; recipeData?: any; error?: string }> {
    return this.request<{ success: boolean; recipeData?: any; error?: string }>('/api/recipes/generate-ai-random', {
      method: 'POST',
    });
  }

  async generateRecipeImage(request: RecipeAIImageGenerateRequest): Promise<RecipeAIImageGenerateResponse> {
    return this.request<RecipeAIImageGenerateResponse>('/api/recipes/ai/generate-image', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const apiClient = new ApiClient();
