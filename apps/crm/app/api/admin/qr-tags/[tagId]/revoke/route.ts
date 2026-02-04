import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

export const POST = withRequestLogging(
  async function POST(_req: Request, ctx: { params: Promise<{ tagId: string }> }) {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "admin") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const { tagId } = await getRouteParams(ctx);

      const result = await prisma.$transaction(async (tx: any) => {
        const tag = await tx.qrTag.findFirst({
          where: { id: tagId, companyId: authCtx.companyId },
          include: { assignment: { select: { certificateId: true, documentId: true } } },
        });

        if (!tag) {
          return { error: "not_found" as const };
        }

        if (tag.status === "revoked") {
          return { error: "already_revoked" as const };
        }

        // Soft-revoke: update status, keep assignment for audit trail
        await tx.qrTag.update({
          where: { id: tagId },
          data: { status: "revoked" },
        });

        // Audit event
        await tx.auditEvent.create({
          data: {
            id: randomBytes(16).toString("hex"),
            companyId: authCtx.companyId,
            entityType: "qr_tag",
            entityId: tagId,
            action: "qr_tag.revoked",
            actorRole: "admin",
            meta: {
              qrCode: tag.code,
              previousStatus: tag.status,
              revokedByUserId: authCtx.userId,
              ...(tag.assignment?.certificateId ? { certificateId: tag.assignment.certificateId } : {}),
              ...(tag.assignment?.documentId ? { documentId: tag.assignment.documentId } : {}),
            },
          },
        });

        return { ok: true };
      });

      if ("error" in result) {
        const status = result.error === "not_found" ? 404 : 409;
        return NextResponse.json({ ok: false, error: result.error }, { status });
      }

      return NextResponse.json({ ok: true });
    } catch (e: any) {
      if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      console.error("POST /api/admin/qr-tags/[tagId]/revoke error:", e);
      return NextResponse.json({ ok: false, error: "revoke_failed" }, { status: 500 });
    }
  },
);
