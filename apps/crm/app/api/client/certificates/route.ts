import { NextResponse } from "next/server";
import * as repo from "@/lib/server/repo";
import { withRequestLogging } from "@/lib/server/observability";
import { requireClientOrPortalSession } from "@/lib/server/portalAuth";

/**
 * GET /api/client/certificates
 *
 * Returns issued certificates for the authenticated client.
 * Supports both full client sessions and read-only portal sessions.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const ctx = await requireClientOrPortalSession();
    const certificates = await repo.listIssuedCertificatesForClientEmail(ctx.clientEmail);
    return NextResponse.json({ ok: true, certificates });
  } catch (e: any) {
    if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    console.error("[client/certificates] Error:", e);
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});
