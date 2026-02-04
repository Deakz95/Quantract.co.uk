import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { rateLimitByIp, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

export const runtime = "nodejs";

const ASSIGN_RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 }; // 30 per minute per IP

export const POST = withRequestLogging(
  async function POST(req: NextRequest) {
    try {
      // Rate limit to prevent brute-force code guessing
      const rl = rateLimitByIp(req, ASSIGN_RATE_LIMIT, "qr:assign:ip");
      if (!rl.ok) {
        return createRateLimitResponse({
          error: "Too many QR tag assignment requests. Please slow down.",
          resetAt: rl.resetAt,
        });
      }

      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "engineer" && role !== "admin") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const body = await req.json().catch(() => ({}));
      const code = typeof body.code === "string" ? body.code.trim() : "";
      const certificateId = typeof body.certificateId === "string" ? body.certificateId : undefined;
      const documentId = typeof body.documentId === "string" ? body.documentId : undefined;
      const note = typeof body.note === "string" ? body.note.trim() : undefined;

      if (!code) {
        return NextResponse.json({ ok: false, error: "missing_code" }, { status: 400 });
      }
      if (!certificateId && !documentId) {
        return NextResponse.json({ ok: false, error: "missing_target" }, { status: 400 });
      }

      // Use a transaction with conditional update to prevent race conditions
      const result = await prisma.$transaction(async (tx: any) => {
        // Validate certificate is issued and has a PDF before assigning QR
        if (certificateId) {
          const cert = await tx.certificate.findFirst({
            where: { id: certificateId, companyId: authCtx.companyId },
            select: { id: true, status: true, pdfKey: true },
          });
          if (!cert) {
            return { error: "certificate_not_found" as const, reason: "Certificate not found" };
          }
          if (cert.status !== "issued") {
            return {
              error: "certificate_not_issued" as const,
              reason: `Certificate status is '${cert.status}'. Only issued certificates can have QR tags assigned.`,
              certificateId,
            };
          }
          if (!cert.pdfKey) {
            return {
              error: "certificate_no_pdf" as const,
              reason: "Certificate does not have a generated PDF. Please re-issue.",
              certificateId,
            };
          }
        }

        // Find tag by code + companyId, verify it's available
        const tag = await tx.qrTag.findFirst({
          where: { code, companyId: authCtx.companyId, status: "available" },
        });

        if (!tag) {
          return { error: "tag_not_found_or_unavailable" as const };
        }

        // Create assignment
        const assignment = await tx.qrAssignment.create({
          data: {
            companyId: authCtx.companyId,
            qrTagId: tag.id,
            certificateId: certificateId || null,
            documentId: documentId || null,
            assignedByUserId: authCtx.userId,
            note: note || null,
          },
        });

        // Update tag status
        await tx.qrTag.update({
          where: { id: tag.id },
          data: { status: "assigned" },
        });

        // Audit event for QR assignment traceability
        await tx.auditEvent.create({
          data: {
            id: randomBytes(16).toString("hex"),
            companyId: authCtx.companyId,
            entityType: certificateId ? "certificate" : "document",
            entityId: certificateId || documentId!,
            action: "qr_tag.assigned",
            actorRole: role,
            meta: {
              qrTagId: tag.id,
              qrCode: code,
              assignedByUserId: authCtx.userId,
              ...(certificateId ? { certificateId } : {}),
              ...(documentId ? { documentId } : {}),
              ...(note ? { note } : {}),
            },
          },
        });

        return { assignment };
      });

      if ("error" in result) {
        const status =
          result.error === "tag_not_found_or_unavailable" || result.error === "certificate_not_found"
            ? 404
            : 422;
        return NextResponse.json({
          ok: false,
          error: result.error,
          ...(result.reason ? { reason: result.reason } : {}),
          ...(result.certificateId ? { certificateId: result.certificateId } : {}),
        }, { status });
      }

      return NextResponse.json({ ok: true, assignment: result.assignment });
    } catch (e: any) {
      if (e?.status === 401) return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      if (e?.status === 403) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      // Handle unique constraint violation (concurrent double-assign attempt)
      if (e?.code === "P2002") {
        return NextResponse.json({ ok: false, error: "tag_already_assigned" }, { status: 409 });
      }
      logError(e, { route: "/api/engineer/qr-tags/assign", action: "post" });
      return NextResponse.json({ ok: false, error: "assign_failed" }, { status: 500 });
    }
  },
);
