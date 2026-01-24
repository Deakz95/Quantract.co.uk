import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { createInvoice } from "@/lib/server/db";
import { clampMoney } from "@/lib/invoiceMath";

export async function GET() {
  try {
    const session = await requireRoles("admin");
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const invoices = await repo.listInvoices();
    return NextResponse.json(invoices);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRoles("admin");
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as any;

    // Create from quote (idempotent)
    const quoteId = typeof body.quoteId === "string" ? body.quoteId : undefined;
    if (quoteId) {
      const inv = await repo.ensureInvoiceForQuote(quoteId);
      if (!inv) {
        return NextResponse.json({ error: "quote_not_found" }, { status: 404 });
      }
      return NextResponse.json({ invoice: inv });
    }

    // Manual invoice
    const clientName = String(body.clientName ?? "").trim();
    const clientEmail = String(body.clientEmail ?? "").trim().toLowerCase();
    const subtotal = clampMoney(Number(body.subtotal ?? 0));
    const vat = clampMoney(Number(body.vat ?? 0));
    const total = clampMoney(Number(body.total ?? subtotal + vat));

    if (!clientName || !clientEmail) {
      return NextResponse.json({ error: "missing_client" }, { status: 400 });
    }

    const inv = createInvoice({ clientName, clientEmail, subtotal, vat, total });
    return NextResponse.json({ invoice: inv });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
