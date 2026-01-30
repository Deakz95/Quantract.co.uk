import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { getRouteParams } from "@/lib/server/routeParams";

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await getRouteParams(ctx);
  const certificates = await repo.listCertificatesForJob(jobId);
  return NextResponse.json({ ok: true, certificates });
}

export async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await getRouteParams(ctx);
  const body = (await req.json().catch(() => null)) as any;
  const type = String(body?.type ?? "").trim();
  if (!type) return NextResponse.json({ ok: false, error: "Missing type" }, { status: 400 });

  try {
    const cert = await repo.createCertificate({ jobId, type: type as any });
    if (!cert) return NextResponse.json({ ok: false, error: "Create failed" }, { status: 500 });
    return NextResponse.json({ ok: true, certificate: cert });
  } catch (err: any) {
    console.error("[POST certificates] error:", err?.message ?? err, err?.stack);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
