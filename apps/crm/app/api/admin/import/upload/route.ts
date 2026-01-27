import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { withRequestLogging } from "@/lib/server/observability";
import { parseCSV, parseExcel, getPreviewData } from "@/lib/server/csvParser";
import { writeUploadBytes } from "@/lib/server/storage";

export const runtime = "nodejs";

/**
 * POST /api/admin/import/upload
 * Upload CSV/Excel file for import preview
 */
export const POST = withRequestLogging(async function POST(req: Request) {
  // RBAC guard
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Check file type
    const fileName = file.name.toLowerCase();
    const isCSV = fileName.endsWith(".csv");
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { ok: false, error: "File must be CSV or Excel format" },
        { status: 400 }
      );
    }

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse file
    let parsed;
    try {
      if (isCSV) {
        const content = buffer.toString("utf-8");
        parsed = parseCSV(content);
      } else {
        // For Excel files, treat as CSV for now
        // In production, use xlsx library
        parsed = parseExcel(buffer);
      }
    } catch (parseError) {
      return NextResponse.json(
        { ok: false, error: "Failed to parse file. Ensure it is a valid CSV or Excel file." },
        { status: 400 }
      );
    }

    if (parsed.headers.length === 0) {
      return NextResponse.json(
        { ok: false, error: "File appears to be empty or has no headers" },
        { status: 400 }
      );
    }

    // Store file temporarily
    const ext = isCSV ? "csv" : "xlsx";
    const fileKey = writeUploadBytes(buffer, {
      ext,
      prefix: `imports/${companyId}`,
    });

    // Get preview data
    const preview = getPreviewData(parsed, 5);

    return NextResponse.json({
      ok: true,
      fileKey,
      fileName: file.name,
      headers: preview.headers,
      previewRows: preview.previewRows,
      totalRows: parsed.rows.length,
    });
  } catch (error: any) {
    console.error("[import/upload] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to process file" },
      { status: 500 }
    );
  }
});
