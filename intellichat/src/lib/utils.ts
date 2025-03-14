import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Determines if a string is AR (more than 50% characters)
 * @param text The text to analyze
 * @returns boolean indicating if text is primarily Arabic
 */
export function isPrimarilyRtl(text: string): boolean {
  if (!text || text.length === 0) return false;

  // Arabic Unicode range is U+0600 to U+06FF
  const arabicRegex = /[\u0600-\u06FF]/g;
  const arabicMatches = text.match(arabicRegex);

  const arabicCount = arabicMatches ? arabicMatches.length : 0;
  const percentage = (arabicCount / text.length) * 100;

  return percentage > 50;
}

