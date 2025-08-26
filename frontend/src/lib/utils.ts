import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Ingredient } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Ingredient helper functions
export function getIngredientText(ingredient: Ingredient | string): string {
  return typeof ingredient === 'string' ? ingredient : ingredient.text;
}

export function getIngredientShoppingFlag(ingredient: Ingredient | string): boolean {
  // Legacy string ingredients default to included for backward compatibility
  return typeof ingredient === 'string' ? true : ingredient.includeInShoppingList;
}

export function createIngredientFromText(text: string, includeInShoppingList: boolean = true): Ingredient {
  return {
    text: text.trim(),
    includeInShoppingList
  };
}

export function normalizeIngredient(ingredient: Ingredient | string): Ingredient {
  if (typeof ingredient === 'string') {
    return createIngredientFromText(ingredient, true);
  }
  return ingredient;
}

export function normalizeIngredients(ingredients: (Ingredient | string)[]): Ingredient[] {
  return ingredients.map(normalizeIngredient);
}

export function getIngredientsForShoppingList(ingredients: (Ingredient | string)[]): string[] {
  return ingredients
    .filter(ingredient => getIngredientShoppingFlag(ingredient))
    .map(ingredient => getIngredientText(ingredient));
}

export function getAllIngredientTexts(ingredients: (Ingredient | string)[]): string[] {
  return ingredients.map(ingredient => getIngredientText(ingredient));
}

export function filterValidIngredients(ingredients: (Ingredient | string)[]): (Ingredient | string)[] {
  return ingredients.filter(ingredient => {
    const text = getIngredientText(ingredient);
    return text && text.trim().length > 0;
  });
}

export function convertStringArrayToIngredients(strings: string[]): Ingredient[] {
  return strings
    .filter(s => s && s.trim().length > 0)
    .map(s => createIngredientFromText(s.trim(), true));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString();
}

export function formatTime(minutes?: number): string {
  if (!minutes) return "";
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

/**
 * Parse bulk text into an array of strings, splitting by line breaks and filtering out empty lines
 * @param text - The bulk text to parse
 * @returns Array of trimmed non-empty strings
 */
export function parseBulkText(text: string): string[] {
  if (!text) return [];
  
  return text
    .split('\n')
    .map(line => cleanRecipeText(line.trim()))
    .filter(line => line.length > 0);
}

/**
 * Clean text by removing unwanted characters commonly found in copy-pasted recipe content
 * @param text - The text to clean
 * @returns Cleaned text
 */
export function cleanRecipeText(text: string): string {
  if (!text) return text;
  
  // Characters to remove (common in recipe websites)
  const unwantedChars = [
    '▢',  // Checkbox character
    '☐',  // Empty checkbox
    '☑',  // Checked checkbox
    '✓',  // Checkmark
    '✔',  // Heavy checkmark
    '•',  // Bullet point (sometimes we want to keep these, but often they're unwanted)
    '◦',  // White bullet
    '▪',  // Black small square
    '▫',  // White small square
    '→',  // Right arrow
    '⭐',  // Star
    '★',  // Black star
    '☆',  // White star
  ];
  
  // Remove unwanted characters
  let cleaned = text;
  for (const char of unwantedChars) {
    cleaned = cleaned.replace(new RegExp(char, 'g'), '');
  }
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');
  
  // Remove leading/trailing dashes or asterisks that might be left over
  cleaned = cleaned.replace(/^[-*\s]+|[-*\s]+$/g, '');
  
  return cleaned.trim();
}

/**
 * Convert an array of strings or ingredients to bulk text (joined by line breaks)
 * @param items - Array of strings or ingredients to join
 * @returns Single string with items separated by newlines
 */
export function arrayToBulkText(items: (string | Ingredient)[]): string {
  const texts = items.map(item => 
    typeof item === 'string' ? item : item.text
  ).filter(text => text && text.trim().length > 0);
  return texts.join('\n');
}

/**
 * Merge bulk text and individual items, with bulk text taking precedence
 * @param bulkText - Bulk text to parse
 * @param individualItems - Individual items array
 * @returns Combined array with bulk text items first, then individual items
 */
export function mergeBulkAndIndividual(bulkText?: string, individualItems?: string[]): string[] {
  const bulkItems = bulkText ? parseBulkText(bulkText) : [];
  const individual = individualItems || [];
  
  // If we have bulk text, use that exclusively
  if (bulkItems.length > 0) {
    return bulkItems;
  }
  
  // Otherwise fall back to individual items
  return individual;
}

export function getProteinTypeColor(proteinType?: string): string {
  const colors: Record<string, string> = {
    beef: "bg-red-100 text-red-800",
    chicken: "bg-yellow-100 text-yellow-800",
    pork: "bg-pink-100 text-pink-800",
    fish: "bg-blue-100 text-blue-800",
    seafood: "bg-teal-100 text-teal-800",
    vegetarian: "bg-green-100 text-green-800",
    vegan: "bg-emerald-100 text-emerald-800",
    other: "bg-gray-100 text-gray-800",
  };
  
  return colors[proteinType || "other"] || colors.other;
}

export function getTagColor(index: number): string {
  const colors = [
    "bg-blue-100 text-blue-800",
    "bg-purple-100 text-purple-800",
    "bg-green-100 text-green-800",
    "bg-yellow-100 text-yellow-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
  ];
  
  return colors[index % colors.length];
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getStartOfWeek(date: Date, startWeekOn: 'monday' | 'sunday' = 'monday'): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = startWeekOn === 'monday' 
    ? (day === 0 ? -6 : 1 - day)
    : -day;
  
  d.setDate(d.getDate() + diff);
  return d;
}

export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

// Recipe AI image generation helpers
export function isRecipeReadyForAIImageGeneration(
  title: string,
  description: string,
  ingredients: (Ingredient | string)[],
  steps: string[]
): boolean {
  // Check if all required fields are populated
  const hasTitle = title && title.trim().length > 0;
  const hasDescription = description && description.trim().length > 0;
  const hasValidIngredients = ingredients && ingredients.length > 0 && 
    ingredients.some(ing => getIngredientText(ing).trim().length > 0);
  const hasValidSteps = steps && steps.length > 0 && 
    steps.some(step => step.trim().length > 0);

  return hasTitle && hasDescription && hasValidIngredients && hasValidSteps;
}

export function getAIImageGenerationDisabledReason(
  title: string,
  description: string,
  ingredients: (Ingredient | string)[],
  steps: string[]
): string | null {
  if (!title || title.trim().length === 0) {
    return "Recipe title is required for AI image generation";
  }
  
  if (!description || description.trim().length === 0) {
    return "Recipe description is required for AI image generation";
  }
  
  if (!ingredients || ingredients.length === 0 || !ingredients.some(ing => getIngredientText(ing).trim().length > 0)) {
    return "At least one ingredient is required for AI image generation";
  }
  
  if (!steps || steps.length === 0 || !steps.some(step => step.trim().length > 0)) {
    return "At least one recipe step is required for AI image generation";
  }
  
  return null; // All requirements met
}

export function prepareAIImageGenerationRequest(
  title: string,
  description: string,
  ingredients: (Ingredient | string)[],
  steps: string[]
): { title: string; description: string; ingredients: string[]; steps: string[] } {
  return {
    title: title.trim(),
    description: description.trim(),
    ingredients: ingredients
      .map(ing => getIngredientText(ing).trim())
      .filter(text => text.length > 0),
    steps: steps
      .map(step => step.trim())
      .filter(text => text.length > 0)
  };
}
