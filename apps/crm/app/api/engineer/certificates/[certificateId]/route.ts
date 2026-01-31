import { NextResponse } from "next/server";
import { getUserEmail, requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { normalizeCertificateData } from "@/lib/certificates";
import { getRouteParams } from "@/lib/server/routeParams";

export async function GET(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles("engineer");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing engineer context" }, { status: 401 });
  }
  const { certificateId } = await getRouteParams(ctx);
  const out = await repo.getCertificateForEngineer(certificateId, email);
  if (!out) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...out });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles("engineer");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing engineer context" }, { status: 401 });
  }
  const { certificateId } = await getRouteParams(ctx);
  const existing = await repo.getCertificateForEngineer(certificateId, email);
  if (!existing) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (existing.certificate.status === "issued" || existing.certificate.status === "void") {
    return NextResponse.json({ ok: false, error: "Issued certificates are immutable. Create an amendment." }, { status: 409 });
  }
  const body = (await req.json().catch(() => null)) as any;
  const nextType = typeof body?.type === "string" ? body.type : existing.certificate.type;
  const normalizedData = body?.data ? normalizeCertificateData(nextType, body.data) : existing.certificate.data;
  const cert = await repo.updateCertificate(certificateId, {
    certificateNumber: typeof body?.certificateNumber === "string" ? body.certificateNumber : undefined,
    inspectorName: typeof body?.inspectorName === "string" ? body.inspectorName : undefined,
    inspectorEmail: typeof body?.inspectorEmail === "string" ? body.inspectorEmail : undefined,
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

  const out = await repo.getCertificateForEngineer(certificateId, email);
  return NextResponse.json({ ok: true, ...(out ?? { certificate: cert, testResults: [] }) });
}
