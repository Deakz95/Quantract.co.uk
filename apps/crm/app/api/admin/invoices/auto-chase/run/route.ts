import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
export const runtime = "nodejs";
export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    await requireRole("admin");
    const body = (await req.json().catch(() => ({}))) as any;
    const dryRun = Boolean(body?.dryRun);
    const result = await repo.runInvoiceAutoChase({
      dryRun
    });
    return NextResponse.json(result);
  } catch (e: any) {
    const msg = e?.message || "run_failed";
    const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
    return NextResponse.json({
      ok: false,
      error: msg
    }, {
      status
    });
  }
});
