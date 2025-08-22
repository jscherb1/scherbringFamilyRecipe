import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
 * Convert an array of strings to bulk text (joined by line breaks)
 * @param items - Array of strings to join
 * @returns Single string with items separated by newlines
 */
export function arrayToBulkText(items: string[]): string {
  return items.join('\n');
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
