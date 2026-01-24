import { NextResponse } from "next/server";
import * as repo from "@/lib/server/repo";
import { readUploadBytes } from "@/lib/server/storage";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ token: string; attachmentId: string }> }) {
    const { token, attachmentId } = await getRouteParams(ctx);
    const invoice = await repo.getInvoiceByToken(token);
    if (!invoice) return NextResponse.json({
      error: "not_found"
    }, {
      status: 404
    });
    const attachments = await repo.listInvoiceAttachments(invoice.id);
    const att = attachments.find(a => a.id === attachmentId);
    if (!att) return NextResponse.json({
      error: "not_found"
    }, {
      status: 404
    });
    const bytes = readUploadBytes(att.fileKey);
    if (!bytes) return NextResponse.json({
      error: "not_found"
    }, {
      status: 404
    });
    return new NextResponse(bytes, {
      headers: {
        "content-type": att.mimeType || "application/octet-stream",
        "content-disposition": `inline; filename="${encodeURIComponent(att.name || "attachment")}.pdf"`
      }
    });
  }
);
