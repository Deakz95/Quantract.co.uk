import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin" && effectiveRole !== "office") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const engineers = await client.engineer.findMany({
      where: { companyId: authCtx.companyId },
      orderBy: { createdAt: "desc" },
    });

    const mapped = (engineers || []).map((e: any) => ({
      ...e,
      name: e.name || e.email?.split("@")[0] || "Unknown",
      createdAtISO: e.createdAt ? new Date(e.createdAt).toISOString() : new Date().toISOString(),
      updatedAtISO: e.updatedAt ? new Date(e.updatedAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ ok: true, engineers: mapped });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error?.status === 403) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/engineers", action: "list" });
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/engineers", action: "list" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);

    if (effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = (await req.json().catch(() => null)) as any;
    if (!body) {
      return NextResponse.json({ ok: false, error: "invalid_request_body" }, { status: 400 });
    }

    const email = String(body.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "email_required" }, { status: 400 });
    }

    const name = body.name ? String(body.name).trim() : null;
    const phone = body.phone ? String(body.phone).trim() : null;

    const engineer = await client.engineer.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        email,
        name: name || email.split("@")[0],
        phone,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, engineer });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/engineers", action: "create" });
      if (error.code === "P2002") {
        return NextResponse.json({ ok: false, error: "duplicate_email" }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    logError(error, { route: "/api/admin/engineers", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
