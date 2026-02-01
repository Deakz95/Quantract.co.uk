/**
 * Build a human-readable, filesystem-safe PDF filename.
 *
 * Examples:
 *   pdfFilename("invoice", "INV-000046", "J. Smith")  → "invoice-INV-000046-j-smith.pdf"
 *   pdfFilename("quote", "QUO-000028", "Run3 Spine")  → "quote-QUO-000028-run3-spine.pdf"
 *   pdfFilename("certificate", "EICR-000012", null)    → "certificate-EICR-000012.pdf"
 */
export function pdfFilename(
  docType: string,
  docNumber: string | null | undefined,
  clientName: string | null | undefined,
): string {
  const parts: string[] = [slugify(docType)];

  if (docNumber) {
    parts.push(slugify(docNumber));
  }

  if (clientName) {
    const slug = slugify(clientName);
    if (slug) parts.push(slug);
  }

  return parts.join("-") + ".pdf";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
