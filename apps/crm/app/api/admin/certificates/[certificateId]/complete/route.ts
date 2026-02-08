import { NextResponse } from "next/server";
import { requireRoles, requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { certificateIsReadyForCompletion } from "@/lib/certificates";
import { getRouteParams } from "@/lib/server/routeParams";
import { computeOutcome, explainOutcome } from "@/lib/server/certs";
import { isReviewBlockingCompletion } from "@quantract/shared/certificate-types";

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

  // Review blocking check (CERT-A20)
  const CRM_TYPE_TO_REGISTRY: Record<string, string> = {
    EIC: "EIC", EICR: "EICR", MWC: "MWC",
    FIRE_DESIGN: "FIRE", FIRE_INSTALLATION: "FIRE",
    FIRE_COMMISSIONING: "FIRE", FIRE_INSPECTION_SERVICING: "FIRE",
    EL_COMPLETION: "EML", EL_PERIODIC: "EML",
  };
  const registryType = CRM_TYPE_TO_REGISTRY[info.certificate.type];
  if (registryType) {
    const certData = info.certificate.data as Record<string, unknown>;
    const blocking = isReviewBlockingCompletion(
      registryType as Parameters<typeof isReviewBlockingCompletion>[0],
      certData,
    );
    if (blocking) {
      return NextResponse.json(
        { ok: false, error: "Certificate requires review approval before completion." },
        { status: 400 },
      );
    }
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

  try {
    const cert = await repo.completeCertificate(certificateId, "admin");
    if (!cert) return NextResponse.json({ ok: false, error: "Unable to complete certificate" }, { status: 400 });
    return NextResponse.json({ ok: true, certificate: cert });
  } catch (err: any) {
    const message = err?.message || "Unable to complete certificate";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
