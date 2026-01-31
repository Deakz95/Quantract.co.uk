import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { normalizeCertificateData } from "@/lib/certificates";
import { getRouteParams } from "@/lib/server/routeParams";

export async function GET(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { certificateId } = await getRouteParams(ctx);
  const out = await repo.getCertificateById(certificateId);
  if (!out) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...out });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { certificateId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => null)) as any;
  const existing = await repo.getCertificateById(certificateId);
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (existing.certificate.status === "issued" || existing.certificate.status === "void") {
    return NextResponse.json({ ok: false, error: "Issued certificates are immutable. Create an amendment." }, { status: 409 });
  }
  const nextType = typeof body?.type === "string" ? body.type : existing.certificate.type;
  const normalizedData = body?.data ? normalizeCertificateData(nextType, body.data) : existing.certificate.data;
  const cert = await repo.updateCertificate(certificateId, {
    certificateNumber: typeof body?.certificateNumber === "string" ? body.certificateNumber : undefined,
    inspectorName: typeof body?.inspectorName === "string" ? body.inspectorName : undefined,
    inspectorEmail: typeof body?.inspectorEmail === "string" ? body.inspectorEmail : undefined,
    signedName: typeof body?.signedName === "string" ? body.signedName : undefined,
    type: typeof body?.type === "string" ? body.type : undefined,
    data: normalizedData,
    dataVersion: normalizedData?.version,
  } as any);
  if (!cert) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  if (Array.isArray(body?.testResults)) {
    const cleaned = body.testResults
      .filter((r: any) => r && typeof r === "object")
      .map((r: any) => ({
        circuitRef: typeof r.circuitRef === "string" ? r.circuitRef : undefined,
        data: (r.data && typeof r.data === "object" ? r.data : {}) as Record<string, unknown>,
      }));
    const rows = await repo.replaceCertificateTestResults(certificateId, cleaned);
    return NextResponse.json({ ok: true, certificate: cert, testResults: rows });
  }

  const out = await repo.getCertificateById(certificateId);
  return NextResponse.json({ ok: true, ...(out ?? { certificate: cert, testResults: [] }) });
}
