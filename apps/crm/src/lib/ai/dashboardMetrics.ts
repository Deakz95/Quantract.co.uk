import { getPrisma } from "@/lib/server/prisma";

const DIGEST_ACTIONS = [
  "ai_weekly_digest_sent",
  "ai_weekly_digest_attrib_session_started",
  "ai_apply_attributed",
] as const;

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface DigestKpis {
  digestsSent: number;
  deepLinksOpened: number;
  appliesAttributed: number;
  openRate: number | null;
  applyRateFromOpens: number | null;
  applyRateFromSent: number | null;
  medianMinutesToApply: number | null;
}

export interface TopAction {
  actionId: string;
  applies: number;
  uniqueUsers: number;
  lastAppliedAt: Date;
}

export interface WeekRow {
  weekStart: string;
  sent: number;
  opened: number;
  applied: number;
}

export interface DigestDashboardData {
  kpis: DigestKpis;
  topActions: TopAction[];
  weeklyTrend: WeekRow[];
}

function safeDiv(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : Math.round(sorted[mid]);
}

export async function getDigestDashboard(companyId: string): Promise<DigestDashboardData> {
  const prisma = getPrisma();
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const events = await prisma.auditEvent.findMany({
    where: {
      companyId,
      action: { in: [...DIGEST_ACTIONS] },
      createdAt: { gte: since },
    },
    select: {
      action: true,
      actor: true,
      meta: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Count by action
  let digestsSent = 0;
  let deepLinksOpened = 0;
  let appliesAttributed = 0;
  const applyDeltas: number[] = [];
  const actionMap = new Map<string, { applies: number; users: Set<string>; lastAt: Date }>();

  for (const evt of events) {
    switch (evt.action) {
      case "ai_weekly_digest_sent":
        digestsSent++;
        break;
      case "ai_weekly_digest_attrib_session_started":
        deepLinksOpened++;
        break;
      case "ai_apply_attributed": {
        appliesAttributed++;
        const meta = (evt.meta ?? {}) as Record<string, unknown>;

        // Median time-to-apply
        const appliedAt = typeof meta.appliedAt === "number" ? meta.appliedAt : evt.createdAt.getTime();
        const startedAt = typeof meta.startedAt === "number" ? meta.startedAt : null;
        if (startedAt !== null && appliedAt > startedAt) {
          applyDeltas.push((appliedAt - startedAt) / 60_000);
        }

        // Top actions
        const actionId = typeof meta.actionId === "string" ? meta.actionId : "unknown";
        const actor = evt.actor ?? "unknown";
        let entry = actionMap.get(actionId);
        if (!entry) {
          entry = { applies: 0, users: new Set(), lastAt: evt.createdAt };
          actionMap.set(actionId, entry);
        }
        entry.applies++;
        entry.users.add(actor);
        if (evt.createdAt > entry.lastAt) entry.lastAt = evt.createdAt;
        break;
      }
    }
  }

  const kpis: DigestKpis = {
    digestsSent,
    deepLinksOpened,
    appliesAttributed,
    openRate: safeDiv(deepLinksOpened, digestsSent),
    applyRateFromOpens: safeDiv(appliesAttributed, deepLinksOpened),
    applyRateFromSent: safeDiv(appliesAttributed, digestsSent),
    medianMinutesToApply: median(applyDeltas),
  };

  const topActions: TopAction[] = Array.from(actionMap.entries())
    .map(([actionId, v]) => ({
      actionId,
      applies: v.applies,
      uniqueUsers: v.users.size,
      lastAppliedAt: v.lastAt,
    }))
    .sort((a, b) => b.applies - a.applies)
    .slice(0, 10);

  // Weekly trend (last 4 weeks)
  const weeklyTrend: WeekRow[] = [];
  const now = Date.now();
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(now - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now - w * 7 * 24 * 60 * 60 * 1000);
    let sent = 0;
    let opened = 0;
    let applied = 0;
    for (const evt of events) {
      if (evt.createdAt >= weekStart && evt.createdAt < weekEnd) {
        if (evt.action === "ai_weekly_digest_sent") sent++;
        else if (evt.action === "ai_weekly_digest_attrib_session_started") opened++;
        else if (evt.action === "ai_apply_attributed") applied++;
      }
    }
    weeklyTrend.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      sent,
      opened,
      applied,
    });
  }

  return { kpis, topActions, weeklyTrend };
}
