import { NextResponse } from "next/server";
import { requireRoles, getCompanyId } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { issueCertificate as issueCertificateV2 } from "@/lib/server/certs/issue";
import { sendCertificateIssuedEmail, absoluteUrl } from "@/lib/server/email";
import { certificateIsReadyForCompletion } from "@/lib/certificates";
import { getRouteParams } from "@/lib/server/routeParams";

export async function POST(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "Missing company context" }, { status: 401 });
  }
  const { certificateId } = await getRouteParams(ctx);
  const info = await repo.getCertificateById(certificateId);
  if (!info) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (info.certificate.status !== "completed") {
    return NextResponse.json({ ok: false, error: "Certificate must be completed before issuing." }, { status: 400 });
  }
  const readiness = certificateIsReadyForCompletion(info.certificate.data);
  if (!readiness.ok) {
    return NextResponse.json({ ok: false, error: `Missing ${readiness.missing.join(", ")}` }, { status: 400 });
  }

  // Use v2 issuance service — creates immutable revision with signingHash + PDF
  try {
    const result = await issueCertificateV2({
      companyId,
      certificateId,
      issuedByUserId: (session as any).userId ?? undefined,
    });

    // Re-fetch the updated certificate for the response
    const updated = await repo.getCertificateById(certificateId);
    const c = updated?.certificate ?? info.certificate;

    // Optional: email client if we have their email
    try {
      if (c.clientId) {
        const client = await repo.getClientById(c.clientId);
        if (client?.email) {
          await sendCertificateIssuedEmail({
            companyId,
            to: client.email,
            clientName: client.name,
            certificateId: c.id,
            certType: c.type,
            pdfLink: absoluteUrl(`/api/admin/certificates/${c.id}/pdf`),
          });
        }
      }
    } catch {
      // non-fatal
    }

    return NextResponse.json({
      ok: true,
      certificate: c,
      revision: result.revision,
      signingHash: result.signingHash,
      pdfKey: result.pdfKey,
    });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ ok: false, error: err?.message || "Issue failed" }, { status });
  }
}
