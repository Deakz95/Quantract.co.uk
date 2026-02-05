import { NextResponse } from "next/server";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging, logError } from "@/lib/server/observability";
import { createSignedUrl } from "@/lib/server/documents";

export const runtime = "nodejs";

/** Resolve the engineer record for the logged-in user. */
async function resolveEngineer(prisma: any, userId: string, email: string, companyId: string) {
  return prisma.engineer.findFirst({
    where: {
      OR: [
        { users: { some: { id: userId } } },
        { email },
      ],
      companyId,
    },
  });
}

/**
 * GET /api/engineer/profile
 * Returns the logged-in engineer's profile + avatar + qualifications.
 */
export const GET = withRequestLogging(async function GET() {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "engineer" && effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const user = await client.user.findUnique({
      where: { id: authCtx.userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
    });
    if (!user) {
      return NextResponse.json({ ok: false, error: "user_not_found" }, { status: 404 });
    }

    let engineer = null;
    let avatarUrl: string | null = null;
    let qualifications: any[] = [];

    if (authCtx.companyId) {
      const eng = await client.engineer.findFirst({
        where: {
          OR: [
            { users: { some: { id: authCtx.userId } } },
            { email: authCtx.email },
          ],
          companyId: authCtx.companyId,
        },
        include: {
          qualifications: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: { document: { select: { id: true, mimeType: true, originalFilename: true, sizeBytes: true } } },
          },
        },
      });

      if (eng) {
        avatarUrl = eng.avatarDocumentId ? createSignedUrl(eng.avatarDocumentId, 3600) : null;
        qualifications = eng.qualifications.map((q: any) => ({
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
            ? { id: q.document.id, mimeType: q.document.mimeType, originalFilename: q.document.originalFilename, sizeBytes: q.document.sizeBytes, url: createSignedUrl(q.document.id, 3600) }
            : null,
        }));
        engineer = {
          id: eng.id,
          name: eng.name,
          email: eng.email,
          phone: eng.phone,
          address1: eng.address1,
          address2: eng.address2,
          city: eng.city,
          county: eng.county,
          postcode: eng.postcode,
          country: eng.country,
          emergencyName: eng.emergencyName,
          emergencyPhone: eng.emergencyPhone,
          emergencyRelationship: eng.emergencyRelationship,
          isActive: eng.isActive,
          avatarUrl,
          createdAt: eng.createdAt.toISOString(),
        };
      }
    }

    return NextResponse.json({
      ok: true,
      profile: {
        user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt },
        engineer,
        qualifications,
      },
    });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/engineer/profile", action: "get" });
    return NextResponse.json({ ok: false, error: "load_failed" }, { status: 500 });
  }
});

/**
 * PATCH /api/engineer/profile
 * Update the logged-in engineer's profile (phone, address, emergency contact).
 */
export const PATCH = withRequestLogging(async function PATCH(req: Request) {
  try {
    const authCtx = await requireCompanyContext();
    const effectiveRole = getEffectiveRole(authCtx);
    if (effectiveRole !== "engineer" && effectiveRole !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const client = getPrisma();
    if (!client) {
      return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));

    // Update user name if provided
    if (body.name !== undefined) {
      await client.user.update({
        where: { id: authCtx.userId },
        data: { name: body.name ? String(body.name).trim() : undefined, updatedAt: new Date() },
      });
    }

    // Update engineer record if linked
    if (authCtx.companyId) {
      const eng = await resolveEngineer(client, authCtx.userId, authCtx.email, authCtx.companyId);
      if (eng) {
        const allowedFields = [
          "phone", "address1", "address2", "city", "county", "postcode", "country",
          "emergencyName", "emergencyPhone", "emergencyRelationship",
        ] as const;

        const data: Record<string, string | null> = {};
        for (const field of allowedFields) {
          if (field in body) {
            data[field] = typeof body[field] === "string" ? body[field] : null;
          }
        }
        // Also allow name update on engineer
        if ("name" in body) {
          data.name = typeof body.name === "string" ? body.name : null;
        }

        if (Object.keys(data).length > 0) {
          await client.engineer.update({ where: { id: eng.id }, data });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as any;
    if (err?.status === 401 || err?.status === 403) {
      return NextResponse.json({ ok: false, error: err.message || "forbidden" }, { status: err.status });
    }
    logError(error, { route: "/api/engineer/profile", action: "update" });
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
});
