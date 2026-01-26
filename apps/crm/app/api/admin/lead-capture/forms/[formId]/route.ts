import { NextResponse } from "next/server";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { getRouteParams } from "@/lib/server/routeParams";

export const runtime = "nodejs";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * GET /api/admin/lead-capture/forms/[formId]
 * Get a single form configuration.
 */
export const GET = withRequestLogging(async function GET(
  _req: Request,
  ctx: { params: Promise<{ formId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { formId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const form = await client.inboundFormConfig.findFirst({
    where: { id: formId, companyId },
    include: {
      _count: {
        select: { enquiries: true },
      },
    },
  });

  if (!form) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, form });
});

/**
 * PATCH /api/admin/lead-capture/forms/[formId]
 * Update a form configuration.
 */
export const PATCH = withRequestLogging(async function PATCH(
  req: Request,
  ctx: { params: Promise<{ formId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { formId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const existing = await client.inboundFormConfig.findFirst({
    where: { id: formId, companyId },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = { updatedAt: new Date() };

  if (typeof body.name === "string") {
    data.name = body.name.trim();
  }

  if (typeof body.slug === "string") {
    const slug = slugify(body.slug);
    if (slug && slug !== existing.slug) {
      // Check for duplicate
      const dup = await client.inboundFormConfig.findFirst({
        where: { companyId, slug, id: { not: formId } },
      });
      if (dup) {
        return NextResponse.json({ ok: false, error: "duplicate_slug" }, { status: 400 });
      }
      data.slug = slug;
    }
  }

  if (typeof body.isActive === "boolean") {
    data.isActive = body.isActive;
  }

  // Handle nullable fields
  if (body.defaultStageId !== undefined) {
    if (body.defaultStageId === null) {
      data.defaultStageId = null;
    } else {
      const stage = await client.pipelineStage.findFirst({
        where: { id: body.defaultStageId, companyId },
      });
      if (stage) {
        data.defaultStageId = stage.id;
      }
    }
  }

  if (body.defaultOwnerId !== undefined) {
    if (body.defaultOwnerId === null) {
      data.defaultOwnerId = null;
    } else {
      const user = await client.user.findFirst({
        where: { id: body.defaultOwnerId, companyId },
      });
      if (user) {
        data.defaultOwnerId = user.id;
      }
    }
  }

  if (Array.isArray(body.requiredFields)) {
    data.requiredFields = body.requiredFields;
  }

  if (Array.isArray(body.optionalFields)) {
    data.optionalFields = body.optionalFields;
  }

  if (body.thankYouMessage !== undefined) {
    data.thankYouMessage = body.thankYouMessage || null;
  }

  if (body.redirectUrl !== undefined) {
    data.redirectUrl = body.redirectUrl || null;
  }

  if (body.notifyEmails !== undefined) {
    data.notifyEmails = body.notifyEmails || null;
  }

  if (typeof body.enableCaptcha === "boolean") {
    data.enableCaptcha = body.enableCaptcha;
  }

  if (typeof body.enableHoneypot === "boolean") {
    data.enableHoneypot = body.enableHoneypot;
  }

  if (typeof body.rateLimitPerMinute === "number" && body.rateLimitPerMinute > 0) {
    data.rateLimitPerMinute = body.rateLimitPerMinute;
  }

  const form = await client.inboundFormConfig.update({
    where: { id: formId },
    data,
    include: {
      _count: {
        select: { enquiries: true },
      },
    },
  });

  return NextResponse.json({ ok: true, form });
});

/**
 * DELETE /api/admin/lead-capture/forms/[formId]
 * Delete a form configuration.
 */
export const DELETE = withRequestLogging(async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ formId: string }> }
) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const { formId } = await getRouteParams(ctx);
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const form = await client.inboundFormConfig.findFirst({
    where: { id: formId, companyId },
  });

  if (!form) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  // Check for enquiries using this form
  const enquiryCount = await client.enquiry.count({
    where: { formConfigId: formId },
  });

  if (enquiryCount > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "form_in_use",
        message: `Cannot delete: ${enquiryCount} enquiry(s) reference this form.`,
      },
      { status: 400 }
    );
  }

  await client.inboundFormConfig.delete({ where: { id: formId } });

  return NextResponse.json({ ok: true });
});
