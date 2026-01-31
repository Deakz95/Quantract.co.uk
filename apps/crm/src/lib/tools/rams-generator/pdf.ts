import { newDoc, drawBrandHeader, type BrandContext, DEFAULT_BRAND } from "@/lib/server/pdf";
import type { RamsContent } from "./schema";
// pdf-lib exports rgb at runtime but not in all type definitions
const rgb = (r: number, g: number, b: number) => ({ type: "RGB" as const, red: r, green: g, blue: b });

export interface RamsPdfMeta {
  title: string;
  version: number;
  status: string;
  preparedBy?: string | null;
  reviewedBy?: string | null;
  issuedAt?: string | null;
}

/**
 * Wrap a string into lines of at most `max` characters, splitting on spaces.
 */
function wrapText(text: string, max = 100): string[] {
  const safe = String(text || "");
  const lines: string[] = [];
  for (const raw of safe.split("\n")) {
    if (raw.length <= max) {
      lines.push(raw);
      continue;
    }
    const words = raw.split(" ");
    let cur = "";
    for (const w of words) {
      if (cur.length + w.length + 1 > max) {
        lines.push(cur);
        cur = w;
      } else {
        cur = cur ? `${cur} ${w}` : w;
      }
    }
    if (cur) lines.push(cur);
  }
  return lines;
}

export async function renderRamsPdf(
  content: RamsContent,
  meta: RamsPdfMeta,
  brand?: BrandContext,
): Promise<Uint8Array> {
  const { doc, font, bold } = await newDoc();
  const left = 50;
  let page = doc.addPage([595.28, 841.89]);
  let y = 800;

  const ensureSpace = (needed = 80) => {
    if (y < needed) {
      page = doc.addPage([595.28, 841.89]);
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

  const wrappedLine = (text: string, opts?: { size?: number; bold?: boolean }) => {
    for (const segment of wrapText(text, 100)) {
      line(segment, opts);
    }
  };

  const labelValue = (label: string, value?: string | null, size = 10) => {
    const trimmed = String(value || "").trim();
    if (!trimmed) return;
    line(`${label}: ${trimmed.slice(0, 100)}`, { size });
  };

  // ── Brand header ──
  y = await drawBrandHeader({ doc, page, font, bold, brand, left, y });

  // ── Draft watermark ──
  if (meta.status !== "issued") {
    page.drawText("DRAFT", {
      x: left,
      y,
      size: 24,
      font: bold,
      color: rgb(0.85, 0.1, 0.1),
    });
    y -= 34;
  }

  // ── Title ──
  line(String(meta.title || "RAMS"), { size: 14, bold: true });
  y -= 6;

  // ── Metadata ──
  labelValue("Version", String(meta.version));
  labelValue("Status", meta.status);
  if (meta.preparedBy) labelValue("Prepared by", meta.preparedBy);
  if (meta.reviewedBy) labelValue("Reviewed by", meta.reviewedBy);
  if (meta.issuedAt) labelValue("Issued", meta.issuedAt);
  y -= 10;

  // ── Project details ──
  line("Project Details", { bold: true });
  labelValue("Project", content.projectName);
  labelValue("Address", content.projectAddress);
  labelValue("Client", content.clientName);
  labelValue("Start date", content.startDate);
  labelValue("End date", content.endDate);
  y -= 10;

  // ── Scope of work ──
  line("Scope of Work", { bold: true });
  wrappedLine(content.scopeOfWork, { size: 10 });
  y -= 10;

  // ── Hazard matrix ──
  ensureSpace(100);
  line("Hazard Assessment", { size: 13, bold: true });
  y -= 4;

  const hCols = { hazard: left, risk: 170, persons: 230, controls: 320, residual: 480 };
  const drawHazardHeader = () => {
    ensureSpace(100);
    page.drawText("Hazard", { x: hCols.hazard, y, size: 9, font: bold });
    page.drawText("Risk", { x: hCols.risk, y, size: 9, font: bold });
    page.drawText("Persons", { x: hCols.persons, y, size: 9, font: bold });
    page.drawText("Controls", { x: hCols.controls, y, size: 9, font: bold });
    page.drawText("Residual", { x: hCols.residual, y, size: 9, font: bold });
    y -= 16;
  };

  drawHazardHeader();
  for (const h of content.hazards) {
    ensureSpace(100);
    page.drawText(String(h.hazard || "").slice(0, 25), { x: hCols.hazard, y, size: 9, font });
    page.drawText(String(h.risk || ""), { x: hCols.risk, y, size: 9, font });
    page.drawText(String(h.persons || "").slice(0, 15), { x: hCols.persons, y, size: 9, font });
    page.drawText(String(h.controls || "").slice(0, 35), { x: hCols.controls, y, size: 9, font });
    page.drawText(String(h.residualRisk || ""), { x: hCols.residual, y, size: 9, font });
    y -= 14;
  }
  y -= 10;

  // ── Method statements ──
  ensureSpace(100);
  line("Method Statement", { size: 13, bold: true });
  y -= 4;

  for (const step of content.methodStatements) {
    ensureSpace(100);
    line(`Step ${step.step}`, { size: 10, bold: true });
    wrappedLine(step.description, { size: 10 });
    labelValue("  Responsible", step.responsible, 9);
    labelValue("  PPE", step.ppe, 9);
    y -= 6;
  }
  y -= 6;

  // ── PPE Required ──
  ensureSpace();
  line("PPE Required", { bold: true });
  for (const item of content.ppeRequired) {
    line(`  • ${String(item || "").slice(0, 100)}`, { size: 10 });
  }
  y -= 6;

  // ── Permits ──
  if (content.permits && content.permits.length > 0) {
    ensureSpace();
    line("Permits Required", { bold: true });
    for (const p of content.permits) {
      line(`  • ${String(p || "").slice(0, 100)}`, { size: 10 });
    }
    y -= 6;
  }

  // ── Emergency Procedures ──
  ensureSpace(100);
  line("Emergency Procedures", { size: 13, bold: true });
  wrappedLine(content.emergencyProcedures, { size: 10 });
  y -= 10;

  // ── Footer ──
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    p.drawText(`RAMS v${meta.version} — Page ${i + 1} of ${pages.length}`, {
      x: 200,
      y: 30,
      size: 8,
      font,
    });
  }

  const bytes = await doc.save();
  return new Uint8Array(bytes);
}
