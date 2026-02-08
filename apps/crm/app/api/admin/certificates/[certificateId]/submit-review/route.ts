import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";
import {
  canSubmitForReview,
  submitForReview,
  deriveLifecycleState,
  fromCrmStatus,
} from "@quantract/shared/certificate-types";

/** Map CRM sub-types to shared registry base types */
const CRM_TYPE_TO_REGISTRY: Record<string, string> = {
  EIC: "EIC", EICR: "EICR", MWC: "MWC",
  FIRE_DESIGN: "FIRE", FIRE_INSTALLATION: "FIRE",
  FIRE_COMMISSIONING: "FIRE", FIRE_INSPECTION_SERVICING: "FIRE",
  EL_COMPLETION: "EML", EL_PERIODIC: "EML",
};

export async function POST(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles(["admin", "office", "engineer"]);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { certificateId } = await getRouteParams(ctx);
  const info = await repo.getCertificateById(certificateId);
  if (!info) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const certData = info.certificate.data as Record<string, unknown>;
  const crmType = info.certificate.type;
  const registryType = CRM_TYPE_TO_REGISTRY[crmType] || crmType;

  // Derive lifecycle state
  const lifecycleState = deriveLifecycleState(
    info.certificate.status,
    registryType as Parameters<typeof deriveLifecycleState>[1],
    certData,
  );

  // Guard
  const check = canSubmitForReview(
    lifecycleState,
    registryType as Parameters<typeof canSubmitForReview>[1],
    certData,
  );
  if (!check.allowed) {
    return NextResponse.json({ ok: false, error: check.reason }, { status: 400 });
  }

  const submittedBy = session.email || session.role;
  const updatedData = submitForReview(certData, submittedBy);

  try {
    const updated = await repo.updateCertificate(certificateId, { data: updatedData as any });
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Unable to update certificate" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, certificate: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to submit for review";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
