import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";
import {
  canReview,
  approveReview,
  rejectReview,
} from "@quantract/shared/certificate-types";

export async function POST(req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles(["admin", "office"]);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { certificateId } = await getRouteParams(ctx);
  const info = await repo.getCertificateById(certificateId);
  if (!info) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.action || !["approve", "reject"].includes(body.action)) {
    return NextResponse.json({ ok: false, error: "Invalid action. Must be 'approve' or 'reject'." }, { status: 400 });
  }

  if (body.action === "reject" && !body.notes?.trim()) {
    return NextResponse.json({ ok: false, error: "Notes are required when requesting changes." }, { status: 400 });
  }

  const certData = info.certificate.data as Record<string, unknown>;
  const certType = info.certificate.type as Parameters<typeof canReview>[0];

  // Guard: check actor can review
  const check = canReview(certType, certData, session.role as Parameters<typeof canReview>[2]);
  if (!check.allowed) {
    return NextResponse.json({ ok: false, error: check.reason }, { status: 403 });
  }

  const reviewedBy = session.email || session.role;
  const updatedData = body.action === "approve"
    ? approveReview(certData, reviewedBy, body.notes?.trim())
    : rejectReview(certData, reviewedBy, body.notes.trim());

  try {
    const updated = await repo.updateCertificate(certificateId, { data: updatedData as any });
    if (!updated) {
      return NextResponse.json({ ok: false, error: "Unable to update certificate" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, certificate: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to update certificate";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
