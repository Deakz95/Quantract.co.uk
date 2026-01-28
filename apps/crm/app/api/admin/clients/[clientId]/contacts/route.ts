import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

function jsonOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(error: unknown, status = 400) {
  const msg = error instanceof Error ? error.message : String(error || "Request failed");
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ clientId: string }> }) {
    try {
      const authCtx = await requireCompanyContext();
      const effectiveRole = getEffectiveRole(authCtx);
      if (effectiveRole !== "admin" && effectiveRole !== "office") {
        return jsonErr("forbidden", 403);
      }

      const client = getPrisma();
      if (!client) {
        return jsonErr("service_unavailable", 503);
      }

      const { clientId } = await getRouteParams(ctx);

      // Verify client belongs to this company
      const clientRecord = await client.client.findFirst({
        where: { id: clientId, companyId: authCtx.companyId },
        select: { id: true },
      });

      if (!clientRecord) {
        return jsonErr("client_not_found", 404);
      }

      const contacts = await client.contact.findMany({
        where: { companyId: authCtx.companyId, clientId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          mobile: true,
          jobTitle: true,
          isPrimary: true,
          preferredChannel: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return jsonOk({ contacts: contacts || [] });
    } catch (e) {
      const err = e as any;
      if (err?.status === 401 || err?.status === 403) {
        return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
      }
      logError(e, { route: "/api/admin/clients/[clientId]/contacts", action: "list" });
      const msg = e instanceof Error ? e.message : "";
      const status = msg.toLowerCase().includes("unauthorized") ? 401 : 400;
      return jsonErr(e, status);
    }
  }
);
