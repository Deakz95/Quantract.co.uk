import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

/** Title-case a display name: "john smith" → "John Smith" */
export function toTitleCase(s: string | undefined | null): string {
  if (!s) return "";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
