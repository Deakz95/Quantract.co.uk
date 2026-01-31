import { newDoc, drawBrandHeader, type BrandContext, DEFAULT_BRAND } from "@/lib/server/pdf";
// pdf-lib exports rgb at runtime but not in all type definitions
const rgb = (r: number, g: number, b: number) => ({ type: "RGB" as const, red: r, green: g, blue: b });
import type { SafetyAssessmentContent } from "./schema";

export interface SafetyPdfMeta {
  title: string;
  version: number;
  status: string;
  issuedAt?: string | null;
}

export async function renderSafetyAssessmentPdf(
  content: SafetyAssessmentContent,
  meta: SafetyPdfMeta,
  brand?: BrandContext,
): Promise<Uint8Array> {
  const { doc, font, bold } = await newDoc();

  const WIDTH = 595.28;
  const HEIGHT = 841.89;
  const left = 50;

  let page = doc.addPage([WIDTH, HEIGHT]);
  let y = 800;

  y = await drawBrandHeader({ doc, page, font, bold, brand: brand ?? DEFAULT_BRAND, left, y });

  const ensureSpace = (needed = 80) => {
    if (y < needed) {
      page = doc.addPage([WIDTH, HEIGHT]);
      y = 800;
    }
  };

  const line = (text: string, opts?: { size?: number; bold?: boolean }) => {
    ensureSpace();
    const size = opts?.size ?? 11;
    const used = opts?.bold ? bold : font;
    page.drawText(String(text || ""), { x: left, y, size, font: used });
    y -= size + 6;
  };

  // Draft watermark
  if (meta.status !== "issued") {
    page.drawText("DRAFT", {
      x: left,
      y,
      size: 24,
      font: bold,
      color: rgb(0.9, 0.1, 0.1),
    });
    y -= 34;
  }

  // Title
  line(String(meta.title || "Safety Assessment"), { size: 14, bold: true });
  y -= 4;

  // Metadata
  line(`Version: ${meta.version}`);
  if (meta.issuedAt) line(`Issued: ${meta.issuedAt}`);
  y -= 6;

  // Site details
  line("Site Details", { size: 12, bold: true });
  line(`Site Name: ${String(content.siteName || "")}`);
  line(`Site Address: ${String(content.siteAddress || "")}`);
  line(`Assessor: ${String(content.assessorName || "")}`);
  line(`Date: ${String(content.date || "")}`);
  y -= 6;

  // Categories and checks
  for (const cat of content.categories ?? []) {
    ensureSpace(100);
    line(String(cat.category || ""), { size: 12, bold: true });

    for (const check of cat.checks ?? []) {
      ensureSpace();
      const statusLabel = check.status === "pass" ? "Pass" : check.status === "fail" ? "Fail" : "N/A";
      const marker = check.status === "fail" ? " [FAIL]" : check.status === "na" ? " [N/A]" : "";
      line(`${String(check.item || "")} — ${statusLabel}${marker}`);

      if (check.status === "fail" && check.notes) {
        ensureSpace();
        page.drawText(`Notes: ${String(check.notes || "")}`, { x: left + 20, y, size: 10, font });
        y -= 16;
      }
    }
    y -= 4;
  }

  // Overall rating
  ensureSpace(100);
  y -= 6;
  line("Overall Rating", { size: 12, bold: true });
  const ratingLabel = content.overallRating === "safe" ? "Safe"
    : content.overallRating === "conditional" ? "Conditional"
    : content.overallRating === "unsafe" ? "Unsafe"
    : String(content.overallRating || "");
  line(ratingLabel, { size: 13, bold: true });
  y -= 6;

  // Recommendations
  if (content.recommendations && content.recommendations.length > 0) {
    ensureSpace(80);
    line("Recommendations", { size: 12, bold: true });
    content.recommendations.forEach((rec, i) => {
      ensureSpace();
      line(`${i + 1}. ${String(rec || "")}`);
    });
  }

  // Footer
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    pages[i].drawText(`Safety Assessment v${meta.version} — Page ${i + 1} of ${pages.length}`, {
      x: 180,
      y: 30,
      size: 8,
      font,
    });
  }

  const bytes = await doc.save();
  return new Uint8Array(bytes);
}
