import { NextResponse } from "next/server";
import { getUserEmail, requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { writeUploadBytes } from "@/lib/server/storage";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { rateLimitEngineerWrite, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

export const runtime = "nodejs";

export const POST = withRequestLogging(async function POST(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  await requireRole("engineer");
  const email = await getUserEmail();
  if (!email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Rate limit by authenticated user
  const rl = rateLimitEngineerWrite(email);
  if (!rl.ok) return createRateLimitResponse({ error: rl.error!, resetAt: rl.resetAt! });

  const { jobId } = await getRouteParams(ctx);
  const job = await repo.getJobForEngineer(jobId, email);
  if (!job) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "bad_form" }, { status: 400 });

  const title = String(form.get("title") || "").trim();
  const notes = String(form.get("notes") || "").trim();
  const stageId = String(form.get("stageId") || "").trim();
  const files = form.getAll("photos").filter((f): f is File => f instanceof File);
  if (!title) return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
  if (files.some((f) => f.type && !f.type.startsWith("image/"))) {
    return NextResponse.json({ ok: false, error: "unsupported_file" }, { status: 400 });
  }

  const variation = await repo.createVariationForJob({
    jobId,
    title,
    notes: notes || undefined,
    stageId: stageId || undefined,
    items: [{ description: "", qty: 1, unitPrice: 0 }],
    actorRole: "engineer",
    actor: email,
  });
  if (!variation) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });

  const attachments: Array<{
    id: string;
    variationId: string;
    name: string;
    mimeType: string;
    createdAtISO: string;
  }> = [];
  for (const [idx, file] of files.entries()) {
    const buf = Buffer.from(await file.arrayBuffer());
    const extRaw = file.name?.split(".").pop() || file.type?.split("/")[1] || "bin";
    const ext = extRaw.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
    const key = writeUploadBytes(buf, { ext, prefix: "variation_photos" });
    const name = file.name || `photo-${idx + 1}.${ext}`;
    const att = await repo.addVariationAttachment({
      variationId: variation.id,
      name,
      fileKey: key,
      mimeType: file.type || "application/octet-stream",
    });
    if (att) {
      attachments.push({
        id: att.id,
        variationId: att.variationId,
        name: att.name,
        mimeType: att.mimeType,
        createdAtISO: att.createdAtISO,
      });
    }
  }

  return NextResponse.json({ ok: true, variation, attachments });
});
