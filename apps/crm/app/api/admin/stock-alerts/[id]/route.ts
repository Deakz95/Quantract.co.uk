import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";

export const runtime = "nodejs";

/** PATCH: update stock alert status */
export const PATCH = withRequestLogging(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authCtx = await requireCompanyContext();
    const role = getEffectiveRole(authCtx);
    if (role !== "admin" && role !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

    const body = await req.json().catch(() => null);
    const VALID_STATUSES = ["open", "resolved"];
    if (!body?.status || !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "status must be one of: open, resolved" }, { status: 400 });
    }

    // Verify company ownership
    const existing = await prisma.stockAlert.findFirst({
      where: { id, companyId: authCtx.companyId },
    });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const alert = await prisma.stockAlert.update({
      where: { id },
      data: { status: body.status },
    });

    return NextResponse.json({ ok: true, data: alert });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    console.error("[PATCH /api/admin/stock-alerts/[id]]", e);
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});
