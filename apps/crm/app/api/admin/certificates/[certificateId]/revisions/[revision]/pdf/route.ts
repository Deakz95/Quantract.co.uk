import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { readUploadBytes } from "@/lib/server/storage";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

/** GET: stream PDF bytes for a specific revision */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ certificateId: string; revision: string }> },
) {
  try {
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const params = await getRouteParams(ctx);
    const certificateId = params.certificateId;
    const revisionNum = parseInt(params.revision, 10);
    if (isNaN(revisionNum) || revisionNum < 1) {
      return NextResponse.json({ ok: false, error: "invalid_revision" }, { status: 400 });
    }

    // Verify certificate + revision belong to company
    const cert = await prisma.certificate.findFirst({
      where: { id: certificateId, companyId: authCtx.companyId },
      select: { certificateNumber: true },
    });
    if (!cert) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

    const revision = await prisma.certificateRevision.findFirst({
      where: { certificateId, companyId: authCtx.companyId, revision: revisionNum },
      select: { pdfKey: true },
    });
    if (!revision) return NextResponse.json({ ok: false, error: "revision_not_found" }, { status: 404 });
    if (!revision.pdfKey) return NextResponse.json({ ok: false, error: "pdf_not_generated" }, { status: 404 });

    const bytes = readUploadBytes(revision.pdfKey);
    if (!bytes) return NextResponse.json({ ok: false, error: "pdf_missing_on_disk" }, { status: 404 });

    const certNum = cert.certificateNumber || certificateId.slice(0, 8);
    const filename = `certificate-${certNum}-rev${revisionNum}.pdf`;

    return new NextResponse(bytes, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename}"`,
        "cache-control": "private, max-age=86400", // immutable revision — cache OK
      },
    });
  } catch (err: any) {
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: err.status });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
}
