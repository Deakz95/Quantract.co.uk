import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * POST /api/admin/rams/[id]/issue
 * Issue a RAMS / Safety Assessment document.
 *
 * - If status is "draft": sets status to "issued", sets issuedAt.
 * - If status is "issued": supersedes the current version and creates a new
 *   draft version (returned in the response) for further editing before re-issue.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { id } = await getRouteParams(ctx);
    const prisma = getPrisma();

    const existing = await prisma.ramsDocument.findFirst({
      where: { id, companyId: authCtx.companyId },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Document not found" }, { status: 404 });
    }

    // --- Issue a draft ---
    if (existing.status === "draft") {
      // Validate that contentJson is present
      if (!existing.contentJson) {
        return NextResponse.json(
          { ok: false, error: "Document content must be filled in before issuing" },
          { status: 400 },
        );
      }

      const document = await prisma.ramsDocument.update({
        where: { id },
        data: {
          status: "issued",
          issuedAt: new Date(),
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({ ok: true, data: document });
    }

    // --- Re-issue an already issued document ---
    if (existing.status === "issued") {
      const now = new Date();

      // Supersede the current version
      await prisma.ramsDocument.update({
        where: { id },
        data: { status: "superseded", updatedAt: now },
      });

      // Create a new draft version linked to the parent
      const newDoc = await prisma.ramsDocument.create({
        data: {
          id: randomUUID(),
          companyId: authCtx.companyId,
          createdById: authCtx.userId,
          type: existing.type,
          title: existing.title,
          status: "draft",
          version: existing.version + 1,
          parentId: existing.id,
          contentJson: existing.contentJson ?? undefined,
          jobId: existing.jobId,
          clientId: existing.clientId,
          preparedBy: existing.preparedBy,
          reviewedBy: existing.reviewedBy,
          updatedAt: now,
        },
      });

      return NextResponse.json({ ok: true, data: newDoc }, { status: 201 });
    }

    // Superseded documents cannot be issued
    return NextResponse.json(
      { ok: false, error: "Superseded documents cannot be issued. Create a new version from the latest issued document." },
      { status: 400 },
    );
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "Forbidden" }, { status: err.status });
    }
    console.error("[POST /api/admin/rams/[id]/issue]", error);
    return NextResponse.json({ ok: false, error: "Failed to issue document" }, { status: 500 });
  }
}
