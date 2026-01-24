import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { readUploadBytes } from "@/lib/server/storage";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ variationId: string; attachmentId: string }> }) {
  await requireRole("admin");
  const { variationId, attachmentId } = await getRouteParams(ctx);
  const att = await repo.getVariationAttachmentById(attachmentId);
  if (!att || att.variationId !== variationId || !att.fileKey) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  const bytes = readUploadBytes(att.fileKey);
  if (!bytes) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  return new NextResponse(bytes, {
    headers: {
      "content-type": att.mimeType || "application/octet-stream",
      "content-disposition": `inline; filename="${encodeURIComponent(att.name || "attachment")}"`,
    },
  });
});
