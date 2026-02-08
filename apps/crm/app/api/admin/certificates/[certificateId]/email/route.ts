import { NextResponse } from "next/server";
import { requireRoles, requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { getRouteParams } from "@/lib/server/routeParams";
import { sendCertificateIssuedEmail, absoluteUrl } from "@/lib/server/email";
import { recordAuditEvent } from "@/lib/server/repo";

export const runtime = "nodejs";

/** POST: email the certificate PDF link to the client */
export async function POST(req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const authCtx = await requireCompanyContext();
  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

  const { certificateId } = await getRouteParams(ctx);
  const body = await req.json().catch(() => ({}));
  const overrideTo: string | undefined = typeof body?.to === "string" ? body.to.trim() : undefined;
  const overrideName: string | undefined = typeof body?.clientName === "string" ? body.clientName.trim() : undefined;

  const cert = await prisma.certificate.findFirst({
    where: { id: certificateId, companyId: authCtx.companyId },
    select: { id: true, status: true, type: true, data: true, clientId: true },
  });
  if (!cert) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (cert.status !== "completed" && cert.status !== "issued") {
    return NextResponse.json(
      { ok: false, error: "Certificate must be completed or issued before emailing." },
      { status: 400 },
    );
  }

  // Resolve recipient email: body override > cert data overview fields
  const certData = (cert.data ?? {}) as Record<string, any>;
  const overview = certData.overview ?? certData?.data?.overview ?? {};
  const clientEmail =
    overrideTo ||
    overview.clientEmail ||
    (certData.data as any)?.overview?.clientEmail ||
    undefined;

  if (!clientEmail) {
    return NextResponse.json({ ok: false, error: "No client email available." }, { status: 400 });
  }

  const clientName = overrideName || overview.clientName || "there";

  const pdfLink = absoluteUrl(`/api/admin/certificates/${certificateId}/pdf`);

  try {
    await sendCertificateIssuedEmail({
      companyId: authCtx.companyId,
      to: clientEmail,
      clientName,
      certificateId,
      certType: cert.type,
      pdfLink,
    });

    // Log distribution event (CERT-A24)
    await recordAuditEvent({
      entityType: "certificate",
      entityId: certificateId,
      action: "certificate.emailed" as any,
      actorRole: "admin",
      meta: { recipientEmail: clientEmail, recipientName: clientName },
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Failed to send email" }, { status: 500 });
  }
}
