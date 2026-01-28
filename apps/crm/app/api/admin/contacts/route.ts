import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export const GET = withRequestLogging(async function GET(req: Request) {
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

    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId");
    const search = url.searchParams.get("search");

    const where: any = { companyId: authCtx.companyId };

    if (clientId) {
      where.clientId = clientId;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
      ];
    }

    const contacts = await client.contact.findMany({
      where,
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ ok: true, contacts: contacts || [] });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/contacts", action: "list" });

    // Check for missing table errors (migration not applied)
    const errMsg = error instanceof Error ? error.message.toLowerCase() : "";
    if (errMsg.includes("does not exist") || errMsg.includes("table") || errMsg.includes("relation")) {
      return NextResponse.json({ ok: false, error: "Database setup in progress. Please try again later.", contacts: [] }, { status: 503 });
    }

    if (error instanceof PrismaClientKnownRequestError) {
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

export const POST = withRequestLogging(async function POST(req: Request) {
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

    const body = (await req.json().catch(() => null)) as any;
    const firstName = String(body?.firstName ?? "").trim();
    const lastName = String(body?.lastName ?? "").trim();

    if (!firstName || !lastName) {
      return NextResponse.json(
        { ok: false, error: "first_name_and_last_name_required" },
        { status: 400 }
      );
    }

    const email = body?.email ? String(body.email).trim().toLowerCase() : null;

    // Check for duplicate email within company
    if (email) {
      const existing = await client.contact.findFirst({
        where: { companyId: authCtx.companyId, email },
      });
      if (existing) {
        return NextResponse.json(
          { ok: false, error: "email_already_exists" },
          { status: 409 }
        );
      }
    }

    // If setting as primary, unset other primary contacts for the same client
    if (body?.isPrimary && body?.clientId) {
      await client.contact.updateMany({
        where: { companyId: authCtx.companyId, clientId: body.clientId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const created = await client.contact.create({
      data: {
        id: randomUUID(),
        companyId: authCtx.companyId,
        clientId: body?.clientId || null,
        firstName,
        lastName,
        email,
        phone: body?.phone ? String(body.phone).trim() : null,
        mobile: body?.mobile ? String(body.mobile).trim() : null,
        jobTitle: body?.jobTitle ? String(body.jobTitle).trim() : null,
        isPrimary: Boolean(body?.isPrimary),
        preferredChannel: body?.preferredChannel || "email",
        notes: body?.notes ? String(body.notes).trim() : null,
        updatedAt: new Date(),
      },
      include: {
        client: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Audit event
    await repo.recordAuditEvent({
      entityType: "contact",
      entityId: created.id,
      action: "contact.created",
      actorRole: "admin",
      actor: authCtx.email,
      meta: { firstName, lastName, email },
    });

    return NextResponse.json({ ok: true, contact: created });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      logError(error, { route: "/api/admin/contacts", action: "create" });
      if (error.code === "P2002") {
        return NextResponse.json({ ok: false, error: "email_already_exists" }, { status: 409 });
      }
      return NextResponse.json({ ok: false, error: "database_error", code: error.code }, { status: 409 });
    }
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/admin/contacts", action: "create" });
    return NextResponse.json({ ok: false, error: "create_failed" }, { status: 500 });
  }
});
