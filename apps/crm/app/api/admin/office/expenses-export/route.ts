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
    const status = url.searchParams.get("status") || "CONFIRMED"; // default to confirmed expenses

    const expenses = await prisma.expense.findMany({
      where: {
        companyId: cid,
        status: status as any,
      },
      include: {
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build CSV
    const rows: string[] = [];
    rows.push("Date,Supplier,Category,Subtotal (ex VAT),VAT,Total,Job ID,Notes");

    for (const exp of expenses) {
      const date = exp.receiptDate
        ? new Date(exp.receiptDate).toISOString().slice(0, 10)
        : exp.expenseDate
        ? new Date(exp.expenseDate).toISOString().slice(0, 10)
        : new Date(exp.createdAt).toISOString().slice(0, 10);
      const supplier = (exp.supplierName || exp.supplier?.name || "Unknown").replace(/,/g, " ");
      const category = (exp.category || "Uncategorised").replace(/,/g, " ");
      const subtotal = exp.subtotal != null ? (exp.subtotal / 100).toFixed(2) : "";
      const vat = exp.vat != null ? (exp.vat / 100).toFixed(2) : "";
      const total = exp.total != null ? (exp.total / 100).toFixed(2) : exp.amount != null ? (exp.amount / 100).toFixed(2) : "";
      const jobId = exp.jobId || "";
      const notes = (exp.notes || "").replace(/,/g, " ").replace(/\r?\n/g, " ");

      rows.push(`${date},${supplier},${category},${subtotal},${vat},${total},${jobId},"${notes}"`);
    }

    const csv = rows.join("\r\n");
    const filename = `expenses-export-${new Date().toISOString().slice(0, 10)}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    logError(error, { route: "/api/admin/office/expenses-export", action: "get" });
    return NextResponse.json({ ok: false, error: "export_failed" }, { status: 500 });
  }
});
