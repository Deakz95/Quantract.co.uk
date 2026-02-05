import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { createDocument } from "@/lib/server/documents";
import { withRequestLogging } from "@/lib/server/observability";
export const runtime = "nodejs";
export const PUT = withRequestLogging(async function PUT(req: Request) {
  await requireRole("admin");
  const companyId = await requireCompanyId();
  const client = getPrisma();
  if (!client) return NextResponse.json({
    ok: false,
    error: "prisma_disabled"
  }, {
    status: 400
  });
  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("image/png")) {
    return NextResponse.json({
      ok: false,
      error: "logo_must_be_png"
    }, {
      status: 400
    });
  }
  const buf = Buffer.from(await req.arrayBuffer());
  if (buf.length > 2_000_000) {
    return NextResponse.json({
      ok: false,
      error: "logo_too_large"
    }, {
      status: 400
    });
  }
  const doc = await createDocument({
    companyId,
    type: "company_logo",
    mimeType: "image/png",
    bytes: buf,
    originalFilename: "logo.png",
    skipStorageCap: true,
  });
  await client.company.update({
    where: {
      id: companyId
    },
    data: {
      logoKey: doc.storageKey
    }
  }).catch(() => null);
  return NextResponse.json({
    ok: true,
    logoKey: doc.storageKey
  });
});
