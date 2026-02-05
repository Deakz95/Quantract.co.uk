import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";
import { createSignedUrl } from "@/lib/server/documents";

export const runtime = "nodejs";

/**
 * GET /api/admin/engineers/[engineerId]/profile
 * Returns full engineer record + qualifications + avatar signed URL.
 */
export const GET = withRequestLogging(
  async function GET(_req: Request, ctx: { params: Promise<{ engineerId: string }> }) {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "admin" && role !== "office") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const { engineerId } = await getRouteParams(ctx);
      const cid = authCtx.companyId;
      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const engineer = await prisma.engineer.findFirst({
        where: { id: engineerId, companyId: cid },
        include: {
          qualifications: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: { document: { select: { id: true, mimeType: true, originalFilename: true, sizeBytes: true } } },
          },
          avatarDocument: { select: { id: true, mimeType: true } },
          rateCard: { select: { id: true, name: true, costRatePerHour: true, chargeRatePerHour: true } },
        },
      });

      if (!engineer) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }

      const avatarUrl = engineer.avatarDocumentId
        ? createSignedUrl(engineer.avatarDocumentId, 3600)
        : null;

      const qualifications = engineer.qualifications.map((q: any) => ({
        id: q.id,
        name: q.name,
        type: q.type,
        issuer: q.issuer,
        certificateNumber: q.certificateNumber,
        issueDate: q.issueDate?.toISOString() ?? null,
        expiryDate: q.expiryDate?.toISOString() ?? null,
        notes: q.notes,
        createdAt: q.createdAt.toISOString(),
        document: q.document
          ? {
              id: q.document.id,
              mimeType: q.document.mimeType,
              originalFilename: q.document.originalFilename,
              sizeBytes: q.document.sizeBytes,
              url: createSignedUrl(q.document.id, 3600),
            }
          : null,
      }));

      return NextResponse.json({
        ok: true,
        engineer: {
          id: engineer.id,
          companyId: engineer.companyId,
          email: engineer.email,
          name: engineer.name,
          phone: engineer.phone,
          address1: engineer.address1,
          address2: engineer.address2,
          city: engineer.city,
          county: engineer.county,
          postcode: engineer.postcode,
          country: engineer.country,
          emergencyName: engineer.emergencyName,
          emergencyPhone: engineer.emergencyPhone,
          emergencyRelationship: engineer.emergencyRelationship,
          isActive: engineer.isActive,
          avatarUrl,
          avatarDocumentId: engineer.avatarDocumentId,
          rateCard: engineer.rateCard,
          createdAt: engineer.createdAt.toISOString(),
          updatedAt: engineer.updatedAt.toISOString(),
        },
        qualifications,
      });
    } catch (error: any) {
      if (error?.status === 401) {
        return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      }
      logError(error, { route: "/api/admin/engineers/[engineerId]/profile", action: "get" });
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
  },
);

/**
 * PATCH /api/admin/engineers/[engineerId]/profile
 * Update engineer profile fields (name, phone, address, emergency contact).
 */
export const PATCH = withRequestLogging(
  async function PATCH(req: Request, ctx: { params: Promise<{ engineerId: string }> }) {
    try {
      const authCtx = await requireCompanyContext();
      const role = getEffectiveRole(authCtx);
      if (role !== "admin" && role !== "office") {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }

      const { engineerId } = await getRouteParams(ctx);
      const cid = authCtx.companyId;
      const prisma = getPrisma();
      if (!prisma) {
        return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
      }

      const existing = await prisma.engineer.findFirst({
        where: { id: engineerId, companyId: cid },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
      }

      const body = await req.json().catch(() => null);
      if (!body) {
        return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
      }

      // Whitelist of updatable fields
      const allowedFields = [
        "name", "phone",
        "address1", "address2", "city", "county", "postcode", "country",
        "emergencyName", "emergencyPhone", "emergencyRelationship",
      ] as const;

      const data: Record<string, string | null> = {};
      for (const field of allowedFields) {
        if (field in body) {
          const val = body[field];
          data[field] = typeof val === "string" ? val : null;
        }
      }

      if (Object.keys(data).length === 0) {
        return NextResponse.json({ ok: false, error: "no_fields_to_update" }, { status: 400 });
      }

      const updated = await prisma.engineer.update({
        where: { id: engineerId },
        data,
      });

      return NextResponse.json({
        ok: true,
        engineer: {
          id: updated.id,
          name: updated.name,
          phone: updated.phone,
          address1: updated.address1,
          address2: updated.address2,
          city: updated.city,
          county: updated.county,
          postcode: updated.postcode,
          country: updated.country,
          emergencyName: updated.emergencyName,
          emergencyPhone: updated.emergencyPhone,
          emergencyRelationship: updated.emergencyRelationship,
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      if (error?.status === 401) {
        return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
      }
      logError(error, { route: "/api/admin/engineers/[engineerId]/profile", action: "patch" });
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }
  },
);
