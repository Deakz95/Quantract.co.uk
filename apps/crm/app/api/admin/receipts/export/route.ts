export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { p } from "@/lib/server/prisma";

/**
 * GET /api/admin/receipts/export
 * Export expenses as CSV with optional filters.
 * Query params: status, from, to, category
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireRole("admin");
    if (!ctx?.companyId) {
      return NextResponse.json({ ok: false, error: "No company" }, { status: 400 });
    }

    const prisma = p();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const category = url.searchParams.get("category");

    const where: any = { companyId: ctx.companyId };

    if (status) {
      where.status = status;
    }
    if (category) {
      where.category = category;
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        document: { select: { id: true, originalFilename: true } },
        createdBy: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Build CSV
    const headers = [
      "ID",
      "Date",
      "Receipt Date",
      "Supplier",
      "Category",
      "Subtotal",
      "VAT",
      "Total",
      "Status",
      "Notes",
      "Job ID",
      "Created By",
      "Document",
    ];

    const rows = expenses.map((e: any) => [
      e.id,
      e.createdAt ? new Date(e.createdAt).toISOString().slice(0, 10) : "",
      e.receiptDate ? new Date(e.receiptDate).toISOString().slice(0, 10) : "",
      e.supplierName || e.supplier?.name || "",
      e.category || "",
      e.subtotal != null ? (e.subtotal / 100).toFixed(2) : "",
      e.vat != null ? (e.vat / 100).toFixed(2) : "",
      e.total != null ? (e.total / 100).toFixed(2) : "",
      e.status || "",
      (e.notes || "").replace(/"/g, '""'),
      e.jobId || "",
      e.createdBy?.name || e.createdBy?.email || "",
      e.document?.originalFilename || "",
    ]);

    const csvLines = [
      headers.join(","),
      ...rows.map((r: string[]) => r.map((v: string) => `"${v}"`).join(",")),
    ];
    const csv = csvLines.join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="expenses-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message === "Unauthorized") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (message === "Forbidden") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { ok: false, error: "Export failed" },
      { status: 500 },
    );
  }
}
