import { NextResponse } from "next/server";
import { requireRoles } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";

export async function GET() {
  try {
    const session = await requireRoles("admin");
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    // IMPORTANT: return the array directly (UI + Playwright expect an array)
    const jobs = await repo.listJobs();
    return NextResponse.json(jobs);
  } catch (error: any) {
    // Log the actual error for debugging
    console.error("[GET /api/admin/jobs] Error:", error);
    // Return 401 for auth errors, 500 for others
    if (error?.status === 401 || error?.status === 403) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || "internal_server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRoles("admin");
    if (!session) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as {
      quoteId?: string;
      manual?: boolean;
      clientId?: string;
      siteId?: string;
      title?: string;
      description?: string;
    };

    // Manual job creation
    if (body?.manual) {
      const clientId = String(body?.clientId ?? "").trim();
      const siteId = String(body?.siteId ?? "").trim();
      const title = String(body?.title ?? "").trim();

      if (!clientId) {
        return NextResponse.json({ ok: false, error: "missing_client_id" }, { status: 400 });
      }
      if (!siteId) {
        return NextResponse.json({ ok: false, error: "missing_site_id" }, { status: 400 });
      }
      if (!title) {
        return NextResponse.json({ ok: false, error: "missing_title" }, { status: 400 });
      }

      const job = await repo.createManualJob({
        clientId,
        siteId,
        title,
        description: body?.description,
      });

      if (!job) {
        return NextResponse.json({ ok: false, error: "failed_to_create_job" }, { status: 500 });
      }

      return NextResponse.json({ ok: true, job });
    }

    // From quote
    const quoteId = String(body?.quoteId ?? "").trim();

    if (!quoteId) {
      return NextResponse.json({ ok: false, error: "missing_quote_id" }, { status: 400 });
    }

    const job = await repo.ensureJobForQuote(quoteId);
    if (!job) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, job });
  } catch (err: any) {
    // Surface invariant violations
    if (err?.message?.includes("must have a site")) {
      return NextResponse.json({ ok: false, error: "quote_missing_site" }, { status: 400 });
    }
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: err.status });
    }
    console.error("[POST /api/admin/jobs] Error:", err);
    return NextResponse.json({ ok: false, error: "internal_server_error" }, { status: 500 });
  }
}
