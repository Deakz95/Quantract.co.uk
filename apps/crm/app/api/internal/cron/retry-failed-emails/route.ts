import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { checkCronAuth, checkIdempotency, getCompanyHeader, getIdempotencyKey } from "@/lib/server/cronAuth";
import { listFailedEmailAttempts } from "@/lib/server/repo";
import { sendCertificateIssuedEmail, sendInvoiceEmail, sendInvoiceReminder, sendQuoteEmail, sendVariationEmail } from "@/lib/server/email";

type FailedEmailMeta = {
  kind?: "quote" | "variation" | "invoice" | "invoice_reminder" | "certificate";
  payload?: Record<string, any>;
  error?: string;
};

export async function POST(req: Request) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const idempotencyKey = getIdempotencyKey(req);
  const idempotency = checkIdempotency("retry-failed-emails", idempotencyKey);
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
  const limitParam = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(500, limitParam)) : 100;

  const failures = await listFailedEmailAttempts({ companyId: companyId ?? undefined, limit });
  let attempted = 0;
  let sent = 0;
  let skipped = 0;

  for (const failure of failures) {
    const meta = (failure.meta || {}) as FailedEmailMeta;
    const payload = meta.payload || {};
    const kind = meta.kind;
    if (!kind || !payload) {
      skipped++;
      continue;
    }

    const scopedCompanyId = payload.companyId ?? companyId ?? undefined;
    attempted++;
    try {
      if (kind === "quote") {
        await sendQuoteEmail({ ...(payload as any), companyId: scopedCompanyId });
      } else if (kind === "variation") {
        await sendVariationEmail({ ...(payload as any), companyId: scopedCompanyId });
      } else if (kind === "invoice") {
        await sendInvoiceEmail({ ...(payload as any), companyId: scopedCompanyId });
      } else if (kind === "invoice_reminder") {
        await sendInvoiceReminder({ ...(payload as any), companyId: scopedCompanyId });
      } else if (kind === "certificate") {
        await sendCertificateIssuedEmail({ ...(payload as any), companyId: scopedCompanyId });
      } else {
        skipped++;
        continue;
      }
      sent++;
    } catch {
      // failure already recorded by email sender
    }
  }

  const result = { ok: true, attempted, sent, skipped, found: failures.length };
  console.log("[cron] retry-failed-emails", {
    companyId: companyId ?? null,
    idempotencyKey,
    ...result,
  });

  return NextResponse.json(result);
}
