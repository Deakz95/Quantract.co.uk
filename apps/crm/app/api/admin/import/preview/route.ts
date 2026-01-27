import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { withRequestLogging } from "@/lib/server/observability";
import { readUploadBytes } from "@/lib/server/storage";
import { parseCSV } from "@/lib/server/csvParser";
import {
  validateImportData,
  type ColumnMapping,
  type EntityType,
} from "@/lib/server/importValidation";

export const runtime = "nodejs";

/**
 * POST /api/admin/import/preview
 * Validate import data with column mapping
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

  try {
    await requireCompanyId();
  } catch {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { fileKey, mapping, entityType } = body as {
      fileKey: string;
      mapping: ColumnMapping;
      entityType: EntityType;
    };

    if (!fileKey) {
      return NextResponse.json(
        { ok: false, error: "fileKey is required" },
        { status: 400 }
      );
    }

    if (!mapping || Object.keys(mapping).length === 0) {
      return NextResponse.json(
        { ok: false, error: "mapping is required" },
        { status: 400 }
      );
    }

    if (!entityType || !["contact", "client", "deal"].includes(entityType)) {
      return NextResponse.json(
        { ok: false, error: "entityType must be contact, client, or deal" },
        { status: 400 }
      );
    }

    // Read the stored file
    const fileBuffer = readUploadBytes(fileKey);
    if (!fileBuffer) {
      return NextResponse.json(
        { ok: false, error: "File not found. It may have expired. Please upload again." },
        { status: 404 }
      );
    }

    // Parse the file
    const content = fileBuffer.toString("utf-8");
    const parsed = parseCSV(content);

    // Validate the data
    const validationResult = validateImportData(
      parsed.headers,
      parsed.rows,
      mapping,
      entityType
    );

    return NextResponse.json({
      ok: true,
      ...validationResult,
    });
  } catch (error: any) {
    console.error("[import/preview] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to validate import data" },
      { status: 500 }
    );
  }
});
