import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

/** GET: list all revisions for a certificate */
export async function GET(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const { certificateId } = await getRouteParams(ctx);

    // Verify certificate belongs to company
    const cert = await prisma.certificate.findFirst({ where: { id: certificateId, companyId: authCtx.companyId } });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const revisions = await prisma.certificateRevision.findMany({
      where: { certificateId, companyId: authCtx.companyId },
      orderBy: { revision: "desc" },
      select: {
        id: true,
        revision: true,
        signingHash: true,
        pdfKey: true,
        pdfChecksum: true,
        pdfGeneratedAt: true,
        issuedAt: true,
        issuedBy: true,
        templateVersionId: true,
        templateVersion: {
          select: {
            version: true,
            template: { select: { name: true, docType: true } },
          },
        },
        createdAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      revisions: revisions.map((r: any) => ({
        id: r.id,
        revision: r.revision,
        signingHashShort: r.signingHash ? r.signingHash.slice(0, 12) : null,
        signingHash: r.signingHash,
        pdfKey: r.pdfKey,
        pdfChecksum: r.pdfChecksum,
        pdfGeneratedAt: r.pdfGeneratedAt?.toISOString() ?? null,
        issuedAt: r.issuedAt?.toISOString() ?? null,
        issuedBy: r.issuedBy,
        templateVersionId: r.templateVersionId ?? null,
        templateName: r.templateVersion?.template?.name ?? null,
        templateVersion: r.templateVersion?.version ?? null,
        createdAt: r.createdAt?.toISOString() ?? null,
      })),
    });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
