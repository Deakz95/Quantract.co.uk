import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";

export async function GET(req: Request) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const jobId = String(url.searchParams.get("jobId") ?? "").trim();
  if (!jobId) return NextResponse.json({ ok: true, certificates: [] });
  const certificates = await repo.listCertificatesForJob(jobId);
  return NextResponse.json({ ok: true, certificates });
}

export async function POST(req: Request) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as any;
  const jobId = String(body?.jobId ?? "").trim();
  const type = String(body?.type ?? "").trim();
  if (!jobId) return NextResponse.json({ ok: false, error: "Missing jobId" }, { status: 400 });
  if (!type) return NextResponse.json({ ok: false, error: "Missing type" }, { status: 400 });
  const cert = await repo.createCertificate({ jobId, type: type as any });
  if (!cert) return NextResponse.json({ ok: false, error: "Could not create certificate" }, { status: 500 });
  return NextResponse.json({ ok: true, certificate: cert });
}
