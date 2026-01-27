import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

type Params = { params: Promise<{ importId: string }> };

/**
 * GET /api/admin/import/[importId]/status
 * Get import job progress
 */
export const GET = withRequestLogging(async function GET(
  req: Request,
  context: Params
) {
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

  const prisma = getPrisma();

  try {
    const { importId } = await context.params;

    const importJob = await prisma.importJob.findFirst({
      where: {
        id: importId,
        companyId,
      },
      select: {
        id: true,
        entityType: true,
        fileName: true,
        status: true,
        totalRows: true,
        processedRows: true,
        successCount: true,
        errorCount: true,
        errors: true,
        createdAt: true,
        completedAt: true,
      },
    });

    if (!importJob) {
      return NextResponse.json(
        { ok: false, error: "Import job not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      importJob,
    });
  } catch (error: any) {
    console.error("[import/status] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to get import status" },
      { status: 500 }
    );
  }
});
