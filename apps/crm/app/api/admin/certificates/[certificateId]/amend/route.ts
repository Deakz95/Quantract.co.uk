import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getRouteParams } from "@/lib/server/routeParams";
import { createCertificateAmendment } from "@/lib/server/certs/amend";

export async function POST(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { certificateId } = await getRouteParams(ctx);

  try {
    const result = await createCertificateAmendment({
      companyId,
      certificateId,
    });
    return NextResponse.json({ ok: true, amendmentId: result.amendmentId });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json(
      { ok: false, error: err?.message || "Amendment failed" },
      { status },
    );
  }
}
