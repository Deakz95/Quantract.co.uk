import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireRole, requireCompanyId } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import { withRequestLogging } from "@/lib/server/observability";
import { EVENT_LABELS, type NotificationEventKey } from "@/lib/server/notifications";

export const runtime = "nodejs";

/**
 * GET /api/admin/notifications/rules
 * Get notification rules for the company
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

  const rules = await client.notificationRule.findMany({
    where: { companyId },
    select: {
      id: true,
      channel: true,
      eventKey: true,
      enabled: true,
    },
  });

  // Build a map of all events with their rules
  const eventKeys = Object.keys(EVENT_LABELS) as NotificationEventKey[];
  const channels = ["SMS", "EMAIL"] as const;

  const rulesMap: Record<string, { sms: boolean; email: boolean }> = {};

  for (const eventKey of eventKeys) {
    rulesMap[eventKey] = { sms: true, email: true }; // Default to enabled
  }

  for (const rule of rules) {
    if (rulesMap[rule.eventKey]) {
      if (rule.channel === "SMS") {
        rulesMap[rule.eventKey].sms = rule.enabled;
      } else if (rule.channel === "EMAIL") {
        rulesMap[rule.eventKey].email = rule.enabled;
      }
    }
  }

  return NextResponse.json({ ok: true, rules: rulesMap, rawRules: rules });
});

/**
 * PATCH /api/admin/notifications/rules
 * Update notification rules
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

  const { eventKey, channel, enabled } = body;

  if (!eventKey || !channel || typeof enabled !== "boolean") {
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

  // Upsert the rule
  await client.notificationRule.upsert({
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
      enabled,
      updatedAt: new Date(),
    },
    update: {
      enabled,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true });
});
