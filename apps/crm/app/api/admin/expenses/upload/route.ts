export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { requireCapability } from "@/lib/serverAuth";
import { rateLimit } from "@/lib/rateLimit";

function makeKey() {
  return `receipts/${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2))}`;
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = rateLimit({ key: `ocr-upload:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ ok:false, error:{ code:"RATE_LIMIT", message:"Too many uploads" }},{ status:429 });

  await requireCapability("expenses.manage");

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ ok:false, error:{ code:"BAD_REQUEST", message:"file is required" }},{ status:400 });
  }

  // NOTE: Storage provider integration comes later.
  // For now we return a stable storageKey contract the UI can use.
  const storageKey = makeKey();

  return NextResponse.json({
    ok: true,
    data: {
      storageKey,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size
    }
  });
}
