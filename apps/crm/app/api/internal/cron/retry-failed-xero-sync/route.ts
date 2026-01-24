import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { checkCronAuth, checkIdempotency, getCompanyHeader, getIdempotencyKey } from "@/lib/server/cronAuth";
import { retryFailedXeroSync } from "@/lib/server/repo";

export async function POST(req: Request) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const idempotencyKey = getIdempotencyKey(req);
  const idempotency = checkIdempotency("retry-failed-xero-sync", idempotencyKey);
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
  const limitParam = Number(url.searchParams.get("limit") ?? "200");
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(500, limitParam)) : 200;

  const result = await retryFailedXeroSync({ companyId: companyId ?? undefined, dryRun, limit });
  console.log("[cron] retry-failed-xero-sync", {
    companyId: companyId ?? null,
    dryRun,
    idempotencyKey,
    ...result,
  });

  return NextResponse.json(result);
}
