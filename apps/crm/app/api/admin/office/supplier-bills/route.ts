export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const url = new URL(req.url);
    const status = url.searchParams.get("status") || undefined;

    const bills = await prisma.supplierBill.findMany({
      where: {
        companyId: cid,
        ...(status ? { status } : {}),
      },
      include: {
        job: { select: { id: true, title: true, jobNumber: true } },
        supplierBillLines: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ ok: true, items: bills });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/office/supplier-bills", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/** Update supplier bill status */
export const PATCH = withRequestLogging(async function PATCH(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const prisma = getPrisma();
    const cid = authCtx.companyId;
    const body = await req.json();
    const { id, status } = body as { id: string; status: string };

    if (!id || !["draft", "approved", "paid"].includes(status)) {
      return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
    }

    const bill = await prisma.supplierBill.update({
      where: { id, companyId: cid },
      data: {
        status,
        ...(status === "approved" ? { postedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ ok: true, data: bill });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/office/supplier-bills", action: "patch" });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});
