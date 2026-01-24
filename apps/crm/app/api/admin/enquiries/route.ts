import { NextResponse } from "next/server";
import { requireRoles, requireCompanyId } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";

export async function GET() {
  try {
    // Explicit auth checks - throws on failure
    await requireRoles("admin");
    await requireCompanyId();

    const enquiries = await repo.listEnquiries();
    return NextResponse.json({ ok: true, enquiries });
  } catch (err: any) {
    // Preserve error status for auth failures
    if (err?.status === 401) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (err?.status === 403) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    console.error("[GET /api/admin/enquiries] Error:", err);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // Explicit auth checks - throws on failure
    const authCtx = await requireRoles("admin");
    await requireCompanyId();

    const body = (await req.json().catch(() => null)) as {
      stageId?: string;
      ownerId?: string;
      name?: string;
      email?: string;
      phone?: string;
      notes?: string;
      valueEstimate?: number;
    };

    if (!body?.stageId) {
      return NextResponse.json({ ok: false, error: "missing_stage_id" }, { status: 400 });
    }

    const enquiry = await repo.createEnquiry({
      stageId: body.stageId,
      ownerId: body.ownerId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      notes: body.notes,
      valueEstimate: body.valueEstimate,
    });

    if (!enquiry) {
      return NextResponse.json({ ok: false, error: "failed_to_create_enquiry" }, { status: 500 });
    }

    // Audit event for enquiry creation
    await repo.recordAuditEvent({
      entityType: "enquiry",
      entityId: enquiry.id,
      action: "enquiry.created",
      actorRole: "admin",
      actor: authCtx.email,
      meta: {
        stageId: body.stageId,
        ownerId: body.ownerId,
        valueEstimate: body.valueEstimate,
      },
    });

    return NextResponse.json({ ok: true, enquiry });
  } catch (err: any) {
    // Preserve error status for auth failures
    if (err?.status === 401) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (err?.status === 403) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    // Invalid JSON or validation errors
    if (err?.name === "SyntaxError") {
      return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }
    console.error("[POST /api/admin/enquiries] Error:", err);
    return NextResponse.json({ ok: false, error: "internal_server_error" }, { status: 500 });
  }
}
