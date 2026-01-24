import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { readUploadBytes } from "@/lib/server/storage";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ costItemId: string; attachmentId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { attachmentId, costItemId } = await getRouteParams(ctx);
  const attachment = await repo.getCostItemAttachmentById(attachmentId);
  if (!attachment || attachment.costItemId !== costItemId) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const stored = await repo.getStoredCostItemAttachment(attachmentId).catch(() => null);
  if (!stored) return NextResponse.json({ ok: false, error: "Missing file" }, { status: 404 });
  const bytes = readUploadBytes(stored.fileKey);
  if (!bytes) return NextResponse.json({ ok: false, error: "Missing file" }, { status: 404 });
  return new NextResponse(bytes, {
    headers: {
      "content-type": stored.mimeType || "application/octet-stream",
      "content-disposition": `inline; filename="${stored.name}"`,
    },
  });
}
