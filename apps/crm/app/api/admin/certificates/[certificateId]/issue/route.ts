import { NextResponse } from "next/server";
import { requireRoles, getCompanyId } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { sendCertificateIssuedEmail, absoluteUrl } from "@/lib/server/email";
import { certificateIsReadyForCompletion } from "@/lib/certificates";
import { getRouteParams } from "@/lib/server/routeParams";

export async function POST(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const companyId = await getCompanyId();
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
  const c = await repo.issueCertificate(certificateId);
  if (!c) return NextResponse.json({ ok: false, error: "Unable to issue certificate" }, { status: 400 });

  // Optional: email client if we have their email
  try {
    if (c.clientId) {
      const client = await repo.getClientById(c.clientId);
      if (client?.email) {
        await sendCertificateIssuedEmail({
          companyId: companyId || undefined,
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

  return NextResponse.json({ ok: true, certificate: c });
}
