import { NextResponse } from "next/server";
import { getUserEmail, requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { quoteTotals } from "@/lib/server/db";

export async function GET() {
  const session = await requireRoles("client");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
  }

  const quotes = await repo.listQuotesForClientEmail(email);
  return NextResponse.json({
    ok: true,
    quotes: quotes.map((q) => ({
      id: q.id,
      token: q.token,
      status: q.status,
      createdAtISO: q.createdAtISO,
      totals: quoteTotals(q),
    })),
  });
}
