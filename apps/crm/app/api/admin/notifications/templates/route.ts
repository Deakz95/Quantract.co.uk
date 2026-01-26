import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import {
  EVENT_LABELS,
  DEFAULT_SMS_TEMPLATES,
  type NotificationEventKey,
} from "@/lib/server/notifications";

export const runtime = "nodejs";

/**
 * GET /api/admin/notifications/templates
 * Get notification templates for the company
 */
export const GET = withRequestLogging(async function GET() {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const templates = await client.notificationTemplate.findMany({
    where: { companyId },
    select: {
      id: true,
      channel: true,
      eventKey: true,
      subject: true,
      body: true,
      isDefault: true,
    },
  });

  // Build templates map with defaults
  const eventKeys = Object.keys(EVENT_LABELS) as NotificationEventKey[];
  const templatesMap: Record<
    string,
    { sms?: { body: string; isDefault: boolean }; email?: { subject: string; body: string; isDefault: boolean } }
  > = {};

  for (const eventKey of eventKeys) {
    templatesMap[eventKey] = {
      sms: {
        body: DEFAULT_SMS_TEMPLATES[eventKey],
        isDefault: true,
      },
    };
  }

  for (const template of templates) {
    if (templatesMap[template.eventKey]) {
      if (template.channel === "SMS") {
        templatesMap[template.eventKey].sms = {
          body: template.body,
          isDefault: template.isDefault,
        };
      } else if (template.channel === "EMAIL") {
        templatesMap[template.eventKey].email = {
          subject: template.subject || "",
          body: template.body,
          isDefault: template.isDefault,
        };
      }
    }
  }

  return NextResponse.json({
    ok: true,
    templates: templatesMap,
    rawTemplates: templates,
    defaults: DEFAULT_SMS_TEMPLATES,
  });
});

/**
 * PATCH /api/admin/notifications/templates
 * Update a notification template
 */
export const PATCH = withRequestLogging(async function PATCH(req: Request) {
  try {
    await requireRole("admin");
  } catch {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const companyId = await requireCompanyId();
  const client = getPrisma();
  if (!client) {
    return NextResponse.json({ ok: false, error: "prisma_disabled" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  const { eventKey, channel, templateBody, subject, restoreDefault } = body;

  if (!eventKey || !channel) {
    return NextResponse.json(
      { ok: false, error: "invalid_params" },
      { status: 400 }
    );
  }

  // Validate eventKey and channel
  const validEventKeys = Object.keys(EVENT_LABELS);
  const validChannels = ["SMS", "EMAIL"];

  if (!validEventKeys.includes(eventKey) || !validChannels.includes(channel)) {
    return NextResponse.json(
      { ok: false, error: "invalid_event_or_channel" },
      { status: 400 }
    );
  }

  // If restoring default, delete custom template
  if (restoreDefault) {
    await client.notificationTemplate.deleteMany({
      where: {
        companyId,
        channel: channel as "SMS" | "EMAIL",
        eventKey: eventKey as NotificationEventKey,
      },
    });

    return NextResponse.json({ ok: true, restored: true });
  }

  // Validate body
  if (typeof templateBody !== "string" || !templateBody.trim()) {
    return NextResponse.json(
      { ok: false, error: "body_required" },
      { status: 400 }
    );
  }

  // Upsert the template
  await client.notificationTemplate.upsert({
    where: {
      companyId_channel_eventKey: {
        companyId,
        channel: channel as "SMS" | "EMAIL",
        eventKey: eventKey as NotificationEventKey,
      },
    },
    create: {
      id: randomUUID(),
      companyId,
      channel: channel as "SMS" | "EMAIL",
      eventKey: eventKey as NotificationEventKey,
      body: templateBody.trim(),
      subject: channel === "EMAIL" && subject ? String(subject).trim() : null,
      isDefault: false,
      updatedAt: new Date(),
    },
    update: {
      body: templateBody.trim(),
      subject: channel === "EMAIL" && subject ? String(subject).trim() : null,
      isDefault: false,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
});
