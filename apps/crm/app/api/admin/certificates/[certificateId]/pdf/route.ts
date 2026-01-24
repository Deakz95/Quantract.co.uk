import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import { readUploadBytes } from "@/lib/server/storage";
import { getRouteParams } from "@/lib/server/routeParams";

export async function GET(_req: Request, ctx: { params: Promise<{ certificateId: string }> }) {
  const session = await requireRoles("admin");
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { certificateId } = await getRouteParams(ctx);
  const info = await repo.getCertificateById(certificateId);
  if (!info) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const key = info.certificate.pdfKey;
  if (!key) return NextResponse.json({ ok: false, error: "No PDF" }, { status: 404 });
  const bytes = readUploadBytes(key);
  if (!bytes) return NextResponse.json({ ok: false, error: "PDF missing on disk" }, { status: 404 });
  return new NextResponse(bytes, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename=certificate-${certificateId}.pdf`,
    },
  });
}
