import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { checkCronAuth, checkIdempotency, getCompanyHeader, getIdempotencyKey } from "@/lib/server/cronAuth";
import { runInvoiceAutoChase } from "@/lib/server/repo";
import { trackCronRun } from "@/lib/server/cronTracker";

export async function POST(req: Request) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const idempotencyKey = getIdempotencyKey(req);
  const idempotency = checkIdempotency("auto-chase-overdue-invoices", idempotencyKey);
  if (!idempotency.ok) {
    return NextResponse.json({ ok: true, skipped: true, reason: "duplicate_request", idempotencyKey: idempotency.key }, { status: 202 });
  }

  const companyId = getCompanyHeader(req);
  const prisma = getPrisma();
  const usingPrisma = Boolean(prisma && process.env.QT_USE_PRISMA === "1");
  if (usingPrisma && !companyId) {
    return NextResponse.json({ ok: false, error: "missing_company_id" }, { status: 400 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") === "1" || url.searchParams.get("dryRun") === "true";

  const result = await trackCronRun("auto-chase-overdue-invoices", async () => {
    return runInvoiceAutoChase({ dryRun, companyId: companyId ?? undefined });
  });

  console.log("[cron] auto-chase-overdue-invoices", {
    companyId: companyId ?? null,
    dryRun,
    idempotencyKey,
    ...result,
  });

  return NextResponse.json(result);
}
