import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { createDocument, StorageLimitError } from "@/lib/server/documents";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ costItemId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { costItemId } = await getRouteParams(ctx);
  const attachments = await repo.listCostItemAttachments(costItemId);
  return NextResponse.json({ ok: true, attachments });
}

export async function POST(req: Request, ctx: { params: Promise<{ costItemId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const companyId = await requireCompanyId();
  const { costItemId } = await getRouteParams(ctx);
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, error: "bad_form" }, { status: 400 });
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (!files.length) return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
  const attachments: NonNullable<Awaited<ReturnType<typeof repo.addCostItemAttachment>>>[] = [];
  for (const [idx, file] of files.entries()) {
    const buf = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/octet-stream";
    const name = file.name || `attachment-${idx + 1}.bin`;

    let doc;
    try {
      doc = await createDocument({
        companyId,
        type: "cost_item_attachment",
        mimeType,
        bytes: buf,
        originalFilename: name,
        storageKey: undefined,
      });
    } catch (err) {
      if (err instanceof StorageLimitError) {
        return NextResponse.json({ ok: false, error: "storage_limit_exceeded" }, { status: 413 });
      }
      throw err;
    }

    const att = await repo.addCostItemAttachment({
      costItemId,
      name,
      fileKey: doc.storageKey,
      mimeType,
    });
    if (att) attachments.push(att);
  }
  return NextResponse.json({ ok: true, attachments });
}
