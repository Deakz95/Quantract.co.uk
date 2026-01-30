/**
 * Generates a stable, URL-safe ID from a recommendation title.
 * Used for deep-linking from weekly digest emails into the widget.
 */
export function makeRecId(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s*\[confidence:[^\]]+\]/g, "")
    .replace(/\s*\[action:[^\]]+\]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
