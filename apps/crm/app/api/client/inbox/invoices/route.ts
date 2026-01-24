import { NextResponse } from "next/server";
import { requireRoles, getUserEmail } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";

export async function GET() {
  const session = await requireRoles("client");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
  }

  const invoices = await repo.listInvoicesForClientEmail(email);
  return NextResponse.json(invoices);
}
