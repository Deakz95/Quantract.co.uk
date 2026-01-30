import { NextResponse } from "next/server";
import { checkCronAuth, checkIdempotency, getIdempotencyKey } from "@/lib/server/cronAuth";
import { runWeeklyCrmDigest } from "@/lib/ai/weeklyDigest";

export async function POST(req: Request) {
  const auth = checkCronAuth(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  }

  const idempotencyKey = getIdempotencyKey(req);
  const idempotency = checkIdempotency("weekly-ai-digest", idempotencyKey);
  if (!idempotency.ok) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: "duplicate_request", idempotencyKey: idempotency.key },
      { status: 202 },
    );
  }

  const result = await runWeeklyCrmDigest();
  console.log("[cron] weekly-ai-digest", { idempotencyKey, ...result });

  return NextResponse.json({ ok: true, ...result });
}
