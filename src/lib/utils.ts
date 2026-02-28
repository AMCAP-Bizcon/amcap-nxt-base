import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility to merge Tailwind CSS classes cleanly.
 * Uses `clsx` for conditional class joining and `twMerge` to resolve Tailwind
 * utility conflicts (e.g., ensuring `px-4 px-2` results in `px-2`).
 * 
 * @param {...ClassValue[]} inputs - Class names or conditional class objects
 * @returns {string} The cleanly merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
