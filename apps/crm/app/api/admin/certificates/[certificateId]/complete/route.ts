import { NextResponse } from "next/server";
import { requireRoles, requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { certificateIsReadyForCompletion } from "@/lib/certificates";
import { getRouteParams } from "@/lib/server/routeParams";
import { computeOutcome, explainOutcome } from "@/lib/server/certs";

export async function POST(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { certificateId } = await getRouteParams(ctx);
  const info = await repo.getCertificateById(certificateId);
  if (!info) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (info.certificate.status === "void" || info.certificate.status === "issued") {
    return NextResponse.json({ ok: false, error: "Certificate cannot be completed." }, { status: 400 });
  }
  const readiness = certificateIsReadyForCompletion(info.certificate.data);
  if (!readiness.ok) {
    return NextResponse.json({ ok: false, error: `Missing ${readiness.missing.join(", ")}` }, { status: 400 });
  }

  // Compute and persist outcome before completing
  try {
    const authCtx = await requireCompanyContext();
    const prisma = getPrisma();
    if (prisma) {
      const [observations, checklists] = await Promise.all([
        prisma.certificateObservation.findMany({ where: { certificateId, companyId: authCtx.companyId } }),
        prisma.certificateChecklist.findMany({ where: { certificateId, companyId: authCtx.companyId } }),
      ]);

      const outcomeResult = computeOutcome(
        info.certificate.type,
        observations.map((o: any) => ({ code: o.code, location: o.location, description: o.description, resolvedAt: o.resolvedAt })),
        checklists.map((c: any) => ({ section: c.section, question: c.question, answer: c.answer })),
        info.testResults.map((t) => ({ circuitRef: t.circuitRef, data: t.data as Record<string, unknown> })),
      );

      const explanation = explainOutcome(
        outcomeResult,
        observations.map((o: any) => ({ code: o.code, location: o.location, description: o.description, resolvedAt: o.resolvedAt })),
      );

      await prisma.certificate.update({
        where: { id: certificateId },
        data: { outcome: outcomeResult.outcome, outcomeReason: explanation },
      });
    }
  } catch {
    // Non-fatal: outcome computation is best-effort for legacy certs
  }

  const cert = await repo.completeCertificate(certificateId, "admin");
  if (!cert) return NextResponse.json({ ok: false, error: "Unable to complete certificate" }, { status: 400 });
  return NextResponse.json({ ok: true, certificate: cert });
}
