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
  const entries = await repo.listTimeEntries(jobId);
  return NextResponse.json({ ok: true, entries });
}

export async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { jobId } = await getRouteParams(ctx);
  try {
    const body = (await req.json().catch(() => null)) as any;
    const engineerEmail = String(body?.engineerEmail ?? "").trim();
    const startedAtISO = String(body?.startedAtISO ?? "").trim();
    const endedAtISO = typeof body?.endedAtISO === "string" ? body.endedAtISO : undefined;
    if (!engineerEmail || !engineerEmail.includes("@")) return NextResponse.json({ ok: false, error: "Missing engineerEmail" }, { status: 400 });
    if (!startedAtISO) return NextResponse.json({ ok: false, error: "Missing startedAtISO" }, { status: 400 });
    const entry = await repo.addTimeEntry({
      jobId,
      engineerEmail,
      startedAtISO,
      endedAtISO,
      breakMinutes: typeof body?.breakMinutes === "number" ? body.breakMinutes : undefined,
      notes: typeof body?.notes === "string" ? body.notes : undefined,
    });
    if (!entry) return NextResponse.json({ ok: false, error: "Could not create time entry" }, { status: 500 });
    return NextResponse.json({ ok: true, entry });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Could not create time entry" }, { status: 400 });
  }
}
