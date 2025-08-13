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
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
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
