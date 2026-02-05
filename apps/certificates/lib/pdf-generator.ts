import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { CertificateData, EICCertificate, EICRCertificate, MWCCertificate } from "./certificate-types";
import { CERTIFICATE_INFO } from "./certificate-types";
import type { LayoutElement } from "../components/TemplateEditor";

// ── Brand context (mirrors CRM BrandContext) ──

export type BrandContext = {
  name: string;
  tagline?: string | null;
  logoPngBytes?: Uint8Array | null;
  primaryColor?: string | null;
  accentColor?: string | null;
  footerLine1?: string | null;
  footerLine2?: string | null;
  contactDetails?: string | null;
};

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return rgb(r, g, b);
}

const COLORS = {
  primary: rgb(0.231, 0.51, 0.965), // #3b82f6
  text: rgb(0.1, 0.1, 0.1),
  muted: rgb(0.4, 0.4, 0.4),
  border: rgb(0.8, 0.8, 0.8),
  success: rgb(0.063, 0.725, 0.506), // #10b981
  error: rgb(0.937, 0.267, 0.267), // #ef4444
};

const FONT_SIZES = {
  title: 24,
  heading: 14,
  normal: 10,
  small: 8,
};

export type GeneratePDFOptions = {
  brand?: BrandContext;
  templateLayout?: LayoutElement[];
  photos?: Record<string, Uint8Array>;
  signatures?: Record<string, string>; // role -> data URI
};

export async function generateCertificatePDF(
  data: CertificateData,
  options?: GeneratePDFOptions,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4 width in points
  const pageHeight = 841.89; // A4 height in points
  const margin = 50;
  const contentWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawText = (text: string, x: number, yPos: number, options: { font?: typeof helvetica; size?: number; color?: typeof COLORS.text } = {}) => {
    const { font = helvetica, size = FONT_SIZES.normal, color = COLORS.text } = options;
    page.drawText(text, { x, y: yPos, font, size, color });
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number, thickness = 0.5) => {
    page.drawLine({
      start: { x: x1, y: y1 },
      end: { x: x2, y: y2 },
      thickness,
      color: COLORS.border,
    });
  };

  const drawSection = (title: string): number => {
    y -= 25;
    if (y < 100) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    drawText(title, margin, y, { font: helveticaBold, size: FONT_SIZES.heading, color: COLORS.primary });
    drawLine(margin, y - 5, pageWidth - margin, y - 5);
    y -= 20;
    return y;
  };

  const drawField = (label: string, value: string, x: number, width: number): void => {
    drawText(label + ":", x, y, { size: FONT_SIZES.small, color: COLORS.muted });
    y -= 12;
    drawText(value || "—", x, y, { size: FONT_SIZES.normal });
    y -= 18;
  };

  const drawFieldRow = (fields: { label: string; value: string }[]): void => {
    const fieldWidth = contentWidth / fields.length;
    fields.forEach((field, i) => {
      const x = margin + i * fieldWidth;
      drawText(field.label + ":", x, y, { size: FONT_SIZES.small, color: COLORS.muted });
    });
    y -= 12;
    fields.forEach((field, i) => {
      const x = margin + i * fieldWidth;
      drawText(field.value || "—", x, y, { size: FONT_SIZES.normal });
    });
    y -= 18;
  };

  // Header — use brand context if provided
  const certInfo = CERTIFICATE_INFO[data.type];
  const brand = options?.brand;
  const brandPrimary = brand?.primaryColor ? hexToRgb(brand.primaryColor) ?? COLORS.primary : COLORS.primary;

  if (brand?.logoPngBytes && brand.logoPngBytes.length > 0) {
    try {
      const logoImg = await pdfDoc.embedPng(brand.logoPngBytes);
      const logoW = 120;
      const logoH = (logoImg.height / logoImg.width) * logoW;
      page.drawImage(logoImg, { x: margin, y: y - logoH + 10, width: logoW, height: logoH });
      y -= logoH + 6;
    } catch {
      // logo embed failure — fall through to text
    }
  }

  const headerName = brand?.name || "QUANTRACT";
  drawText(headerName.toUpperCase(), margin, y, { font: helveticaBold, size: 18, color: brandPrimary });
  const taglineText = brand?.tagline || "Electrical Certificates";
  drawText(taglineText, margin + headerName.length * 11 + 10, y, { size: 12, color: COLORS.muted });
  y -= 40;

  drawText(certInfo.name, margin, y, { font: helveticaBold, size: FONT_SIZES.title });
  y -= 20;
  drawText(certInfo.description, margin, y, { size: FONT_SIZES.normal, color: COLORS.muted });
  y -= 10;

  // Overview section
  drawSection("Installation Details");
  const overview = data.overview;
  drawFieldRow([
    { label: "Reference", value: overview.jobReference || "" },
    { label: "Date", value: overview.dateOfInspection || "" },
  ]);
  drawField("Client Name", overview.clientName || "", margin, contentWidth);
  drawField("Site Name", overview.siteName || "", margin, contentWidth);
  drawField("Installation Address", overview.installationAddress || "", margin, contentWidth);
  if (overview.occupier) {
    drawField("Occupier", overview.occupier, margin, contentWidth);
  }
  drawField("Description of Work", overview.jobDescription || "", margin, contentWidth);

  // Type-specific sections
  if (data.type === "EIC" || data.type === "EICR") {
    const typedData = data as EICCertificate | EICRCertificate;

    // Supply Characteristics
    drawSection("Supply Characteristics");
    const supply = typedData.supplyCharacteristics;
    drawFieldRow([
      { label: "System Type", value: supply.systemType || "" },
      { label: "Supply Voltage", value: supply.supplyVoltage ? `${supply.supplyVoltage}V` : "" },
      { label: "Frequency", value: supply.frequency ? `${supply.frequency}Hz` : "" },
    ]);
    drawFieldRow([
      { label: "Prospective Fault Current (kA)", value: supply.prospectiveFaultCurrent || "" },
      { label: "External Ze (Ω)", value: supply.externalLoopImpedance || "" },
    ]);
    drawFieldRow([
      { label: "Supply Protective Device", value: supply.supplyProtectiveDevice || "" },
      { label: "Rated Current (A)", value: supply.ratedCurrent || "" },
    ]);

    // Earthing Arrangements
    drawSection("Earthing Arrangements");
    const earthing = typedData.earthingArrangements;
    drawFieldRow([
      { label: "Earth Electrode Type", value: earthing.earthElectrode ? "Yes" : "No" },
      { label: "Electrode Resistance (Ω)", value: earthing.earthElectrodeResistance || "" },
    ]);
    drawFieldRow([
      { label: "Earthing Conductor", value: `${earthing.earthingConductorType || ""} ${earthing.earthingConductorSize ? earthing.earthingConductorSize + "mm²" : ""}`.trim() },
      { label: "Main Bonding", value: `${earthing.mainProtectiveBondingType || ""} ${earthing.mainProtectiveBondingSize ? earthing.mainProtectiveBondingSize + "mm²" : ""}`.trim() },
    ]);

    // Test Results
    drawSection("Test Results Summary");
    const tests = typedData.testResults;
    drawFieldRow([
      { label: "Continuity (Ω)", value: tests.continuityOfProtectiveConductors || "" },
      { label: "Insulation (MΩ)", value: tests.insulationResistance || "" },
      { label: "Polarity", value: tests.polarityConfirmed ? "Confirmed ✓" : "—" },
    ]);
    drawFieldRow([
      { label: "Zs (Ω)", value: tests.earthFaultLoopImpedance || "" },
      { label: "RCD Time (ms)", value: tests.rcdOperatingTime || "" },
      { label: "RCD Current (mA)", value: tests.rcdOperatingCurrent || "" },
    ]);
  }

  if (data.type === "MWC") {
    const mwc = data as MWCCertificate;

    // Work Description
    drawSection("Work Carried Out");
    drawField("Description", mwc.workDescription || "", margin, contentWidth);

    // Circuit Details
    drawSection("Circuit Details");
    const circuit = mwc.circuitDetails;
    drawFieldRow([
      { label: "Circuit Affected", value: circuit?.circuitAffected || "" },
      { label: "Location", value: circuit?.location || "" },
    ]);
    drawFieldRow([
      { label: "Protective Device", value: circuit?.protectiveDevice || "" },
      { label: "Rating (A)", value: circuit?.rating || "" },
    ]);

    // Test Results
    drawSection("Test Results");
    const tests = mwc.testResults;
    drawFieldRow([
      { label: "Continuity (Ω)", value: tests?.continuity || "" },
      { label: "Insulation (MΩ)", value: tests?.insulationResistance || "" },
    ]);
    drawFieldRow([
      { label: "Polarity", value: tests?.polarityConfirmed ? "Confirmed ✓" : "—" },
      { label: "Zs (Ω)", value: tests?.earthFaultLoopImpedance || "" },
      { label: "RCD Time (ms)", value: tests?.rcdOperatingTime || "" },
    ]);
  }

  // EICR specific - Overall condition
  if (data.type === "EICR") {
    const eicr = data as EICRCertificate;
    drawSection("Overall Assessment");
    const conditionText = eicr.overallCondition === "satisfactory" ? "SATISFACTORY" : eicr.overallCondition === "unsatisfactory" ? "UNSATISFACTORY" : "—";
    const conditionColor = eicr.overallCondition === "satisfactory" ? COLORS.success : eicr.overallCondition === "unsatisfactory" ? COLORS.error : COLORS.muted;
    drawText("Overall Condition:", margin, y, { size: FONT_SIZES.normal, color: COLORS.muted });
    drawText(conditionText, margin + 120, y, { font: helveticaBold, size: 14, color: conditionColor });
    y -= 20;
    if (eicr.recommendedRetestDate) {
      drawField("Recommended Retest Date", eicr.recommendedRetestDate, margin, contentWidth);
    }
  }

  // Observations
  if ("observations" in data && data.observations) {
    drawSection("Observations & Recommendations");
    if (typeof data.observations === "string") {
      drawText(data.observations || "None", margin, y, { size: FONT_SIZES.normal });
      y -= 15;
    } else if (Array.isArray(data.observations)) {
      (data.observations as { code: string; observation: string; recommendation: string }[]).forEach((obs, i) => {
        if (y < 100) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        drawText(`${i + 1}. [${obs.code || "—"}] ${obs.observation || ""}`, margin, y, { size: FONT_SIZES.normal });
        y -= 12;
        if (obs.recommendation) {
          drawText(`   Recommendation: ${obs.recommendation}`, margin, y, { size: FONT_SIZES.small, color: COLORS.muted });
          y -= 15;
        }
      });
    }
  }

  // Declaration
  if (y < 150) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  }
  drawSection("Declaration");
  drawText("I/We certify that this installation has been designed, constructed, inspected, and tested", margin, y, { size: FONT_SIZES.normal });
  y -= 12;
  drawText("in accordance with BS 7671 (IET Wiring Regulations).", margin, y, { size: FONT_SIZES.normal });
  y -= 30;

  const declaration = (data as any).declaration || {};

  if (declaration.designerSignature || declaration.installerSignature || declaration.inspectorSignature) {
    const signatures = [
      { label: "Designer", sig: declaration.designerSignature },
      { label: "Installer", sig: declaration.installerSignature },
      { label: "Inspector", sig: declaration.inspectorSignature },
    ].filter((s) => s.sig?.name || s.sig?.signedAtISO);

    signatures.forEach((s) => {
      drawText(`${s.label}: ${s.sig?.name || "—"}`, margin, y, { size: FONT_SIZES.normal });
      if (s.sig?.signedAtISO) {
        drawText(`Signed: ${new Date(s.sig.signedAtISO).toLocaleDateString()}`, margin + 200, y, { size: FONT_SIZES.small, color: COLORS.muted });
      }
      y -= 20;
    });
  } else {
    drawLine(margin, y, margin + 200, y);
    drawText("Signature", margin, y - 12, { size: FONT_SIZES.small, color: COLORS.muted });
    drawLine(margin + 250, y, margin + 400, y);
    drawText("Date", margin + 250, y - 12, { size: FONT_SIZES.small, color: COLORS.muted });
  }

  // Footer — use brand footer lines if provided
  y = 40;
  drawLine(margin, y + 10, pageWidth - margin, y + 10);

  if (brand?.footerLine1 || brand?.footerLine2 || brand?.contactDetails) {
    const footerLines: string[] = [];
    if (brand.footerLine1) footerLines.push(brand.footerLine1);
    if (brand.footerLine2) footerLines.push(brand.footerLine2);
    if (brand.contactDetails) {
      for (const seg of brand.contactDetails.split("\n")) {
        const trimmed = seg.trim();
        if (trimmed) footerLines.push(trimmed);
      }
    }
    let footerY = y;
    for (const line of footerLines) {
      drawText(line, margin, footerY, { size: FONT_SIZES.small, color: COLORS.muted });
      footerY -= 10;
    }
  } else {
    drawText(`Generated by ${brand?.name || "Quantract Certificates"}`, margin, y, { size: FONT_SIZES.small, color: COLORS.muted });
    drawText(`certificates.quantract.co.uk • ${new Date().toLocaleDateString()}`, pageWidth - margin - 180, y, { size: FONT_SIZES.small, color: COLORS.muted });
  }

  return pdfDoc.save();
}
