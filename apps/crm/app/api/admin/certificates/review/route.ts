import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";

export async function GET(_req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "Service unavailable" }, { status: 503 });
    }

    // Fetch draft certificates (pre-completion) for this company
    const certificates = await client.certificate.findMany({
      where: {
        companyId: authCtx.companyId,
        status: "draft",
      },
      orderBy: { updatedAt: "desc" },
      include: {
        job: { select: { id: true, title: true, jobNumber: true } },
        client: { select: { id: true, name: true } },
        site: { select: { id: true, name: true, address1: true, city: true } },
      },
      take: 200,
    });

    // Filter to only those with _review.reviewStatus === "pending_review" in data blob
    const pending = (certificates || [])
      .filter((cert: any) => {
        const review = (cert.data as Record<string, unknown>)?._review as Record<string, unknown> | undefined;
        return review?.reviewStatus === "pending_review";
      })
      .map((cert: any) => {
        const review = (cert.data as Record<string, unknown>)?._review as Record<string, unknown> | undefined;
        return {
          id: cert.id,
          certificateNumber: cert.certificateNumber,
          type: cert.type,
          status: cert.status,
          inspectorName: cert.inspectorName,
          inspectorEmail: cert.inspectorEmail,
          clientName:
            cert.client?.name ||
            (cert.data as any)?.overview?.clientName ||
            undefined,
          siteAddress:
            [cert.site?.address1, cert.site?.city].filter(Boolean).join(", ") ||
            (cert.data as any)?.overview?.installationAddress ||
            undefined,
          jobNumber:
            cert.job?.jobNumber ||
            (cert.job?.title ? `J-${cert.job.id.slice(0, 8)}` : undefined),
          submittedBy: review?.submittedBy,
          submittedAtISO: review?.submittedAtISO,
          updatedAt: cert.updatedAt?.toISOString(),
        };
      });

    return NextResponse.json({ ok: true, certificates: pending });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = (err as any)?.status === 401 ? 401 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
