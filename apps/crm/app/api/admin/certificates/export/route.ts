/**
 * POST /api/admin/certificates/export
 *
 * Generates a regulator-ready ZIP bundle of issued certificate revisions.
 * Suitable for NICEIC / NAPIT audit workflows.
 *
 * Body: { issuedFrom: "yyyy-mm-dd", issuedTo: "yyyy-mm-dd", includeAllRevisions?: boolean, types?: string[] }
 *
 * The export schemaVersion is "1.0.0". Changes to the JSON/manifest shape that
 * remove or rename fields should bump the major version. Additive fields bump
 * the minor version. Consumers should check schemaVersion before parsing.
 */

import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { withRequestLogging } from "@/lib/server/observability";
import { exportCertificatesZip, type ExportFilters } from "@/lib/server/certs/export";
import { rateLimit, getClientIp } from "@/lib/server/rateLimit";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const POST = withRequestLogging(async function POST(req: Request) {
  // Rate limit: 10 exports per minute per IP
  const ip = getClientIp(req);
  const rl = rateLimit({ key: `cert_export:${ip}`, limit: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many export requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as any;

  const issuedFrom = typeof body.issuedFrom === "string" ? body.issuedFrom.trim() : "";
  const issuedTo = typeof body.issuedTo === "string" ? body.issuedTo.trim() : "";

  if (!ISO_DATE_RE.test(issuedFrom) || !ISO_DATE_RE.test(issuedTo)) {
    return NextResponse.json(
      { ok: false, error: "issuedFrom and issuedTo must be valid dates in yyyy-mm-dd format" },
      { status: 400 },
    );
  }

  const filters: ExportFilters = {
    issuedFrom,
    issuedTo,
    includeAllRevisions: body.includeAllRevisions === true,
    types: Array.isArray(body.types) ? body.types.filter((t: unknown) => typeof t === "string") : undefined,
  };

  try {
    const result = await exportCertificatesZip({
      companyId,
      filters,
      requestedByUserId: undefined, // could pass user id if needed for audit
    });

    return new Response(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": String(result.bytes.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json(
      { ok: false, error: err?.message || "Export failed" },
      { status },
    );
  }
});
