import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import * as repo from "@/lib/server/repo";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

export const runtime = "nodejs";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function pickDefined<T extends Record<string, any>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ contactId: string }> }) {
    try {
      const authCtx = await getAuthContext();
      if (!authCtx) {
        return jsonErr("unauthenticated", 401);
      }

      if (authCtx.role !== "admin") {
        return jsonErr("forbidden", 403);
      }

      if (!authCtx.companyId) {
        return jsonErr("no_company", 401);
      }

      const client = getPrisma();
      if (!client) {
        return jsonErr("service_unavailable", 503);
      }

      const { contactId } = await getRouteParams(ctx);

      const contact = await client.contact.findFirst({
        where: { id: contactId, companyId: authCtx.companyId },
        include: {
          client: {
            select: { id: true, name: true, email: true },
          },
          deals: {
            select: { id: true, title: true, value: true, stage: { select: { name: true, color: true } } },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
          activities: {
            select: { id: true, type: true, subject: true, occurredAt: true },
            orderBy: { occurredAt: "desc" },
            take: 10,
          },
        },
      });

      if (!contact) {
        return jsonErr("not_found", 404);
      }

      return jsonOk({ contact });
    } catch (e) {
      logError(e, { route: "/api/admin/contacts/[contactId]", action: "get" });
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);

export const PATCH = withRequestLogging(
  async function PATCH(req: Request, ctx: { params: Promise<{ contactId: string }> }) {
    try {
      const authCtx = await getAuthContext();
      if (!authCtx) {
        return jsonErr("unauthenticated", 401);
      }

      if (authCtx.role !== "admin") {
        return jsonErr("forbidden", 403);
      }

      if (!authCtx.companyId) {
        return jsonErr("no_company", 401);
      }

      const client = getPrisma();
      if (!client) {
        return jsonErr("service_unavailable", 503);
      }

      const { contactId } = await getRouteParams(ctx);
      const body = (await req.json().catch(() => ({}))) as any;

      // Check contact exists and belongs to this company
      const existing = await client.contact.findFirst({
        where: { id: contactId, companyId: authCtx.companyId },
      });

      if (!existing) {
        return jsonErr("not_found", 404);
      }

      // Check for duplicate email if changing email
      if (body?.email && body.email !== existing.email) {
        const emailExists = await client.contact.findFirst({
          where: {
            companyId: authCtx.companyId,
            email: body.email.toLowerCase(),
            id: { not: contactId },
          },
        });
        if (emailExists) {
          return jsonErr("email_already_exists", 409);
        }
      }

      // If setting as primary, unset other primary contacts for the same client
      const targetClientId = body?.clientId !== undefined ? body.clientId : existing.clientId;
      if (body?.isPrimary && targetClientId) {
        await client.contact.updateMany({
          where: {
            companyId: authCtx.companyId,
            clientId: targetClientId,
            isPrimary: true,
            id: { not: contactId },
          },
          data: { isPrimary: false },
        });
      }

      const patch = pickDefined({
        firstName: body?.firstName,
        lastName: body?.lastName,
        email: body?.email ? body.email.toLowerCase() : undefined,
        phone: body?.phone,
        mobile: body?.mobile,
        jobTitle: body?.jobTitle,
        isPrimary: body?.isPrimary,
        preferredChannel: body?.preferredChannel,
        notes: body?.notes,
        clientId: body?.clientId,
      });

      const updated = await client.contact.update({
        where: { id: contactId },
        data: { ...patch, updatedAt: new Date() },
        include: {
          client: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Audit event
      await repo.recordAuditEvent({
        entityType: "contact",
        entityId: contactId,
        action: "contact.updated",
        actorRole: "admin",
        actor: authCtx.email,
        meta: { changes: patch },
      });

      return jsonOk({ contact: updated });
    } catch (e) {
      logError(e, { route: "/api/admin/contacts/[contactId]", action: "update" });
      if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
        return jsonErr("email_already_exists", 409);
      }
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);

export const DELETE = withRequestLogging(
  async function DELETE(_req: Request, ctx: { params: Promise<{ contactId: string }> }) {
    try {
      const authCtx = await getAuthContext();
      if (!authCtx) {
        return jsonErr("unauthenticated", 401);
      }

      if (authCtx.role !== "admin") {
        return jsonErr("forbidden", 403);
      }

      if (!authCtx.companyId) {
        return jsonErr("no_company", 401);
      }

      const client = getPrisma();
      if (!client) {
        return jsonErr("service_unavailable", 503);
      }

      const { contactId } = await getRouteParams(ctx);

      // Get contact details before deletion for audit
      const contact = await client.contact.findFirst({
        where: { id: contactId, companyId: authCtx.companyId },
      });

      if (!contact) {
        return jsonErr("not_found", 404);
      }

      await client.contact.delete({
        where: { id: contactId },
      });

      // Audit event
      await repo.recordAuditEvent({
        entityType: "contact",
        entityId: contactId,
        action: "contact.deleted",
        actorRole: "admin",
        actor: authCtx.email,
        meta: {
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
        },
      });

      return jsonOk({ deleted: true });
    } catch (e) {
      logError(e, { route: "/api/admin/contacts/[contactId]", action: "delete" });
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);
