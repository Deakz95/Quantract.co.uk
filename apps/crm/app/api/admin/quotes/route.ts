import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import { quoteTotals } from "@/lib/server/db";
import * as repo from "@/lib/server/repo";

export async function GET() {
  try {
    const session = await requireRoles("admin");
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const quotes = (await repo.listQuotes()).map((q) => ({
      ...q,
      totals: quoteTotals(q),
      shareUrl: `/client/quotes/${q.token}`,
    }));

    return NextResponse.json({ ok: true, quotes });
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRoles("admin");
    if (!session) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as any;

    const clientName = String(body?.clientName ?? "").trim();
    const clientEmail = String(body?.clientEmail ?? "").trim();

    if (!clientName) {
      return NextResponse.json({ ok: false, error: "missing_client_name" }, { status: 400 });
    }
    if (!clientEmail || !clientEmail.includes("@")) {
      return NextResponse.json({ ok: false, error: "invalid_client_email" }, { status: 400 });
    }

    const q = await repo.createQuote({
      clientId: typeof body?.clientId === "string" ? body.clientId : undefined,
      clientName,
      clientEmail,
      siteId: typeof body?.siteId === "string" ? body.siteId : undefined,
      siteAddress: body?.siteAddress,
      notes: body?.notes,
      vatRate: typeof body?.vatRate === "number" ? body.vatRate : 0.2,
      items: Array.isArray(body?.items) ? body.items : [],
    });

    return NextResponse.json({
      ok: true,
      quote: {
        ...q,
        totals: quoteTotals(q),
        shareUrl: `/client/quotes/${q.token}`,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
}
