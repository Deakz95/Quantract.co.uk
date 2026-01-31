import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/server/prisma";
import { isFeatureEnabled } from "@/lib/server/featureFlags";

export const runtime = "nodejs";

/**
 * Cron endpoint: scans active maintenance rules and creates alerts
 * for assets whose nextServiceAt is due (past or within 7 days).
 * Protected by CRON_SECRET header in production.
 * Only processes companies whose plan includes maintenance_alerts.
 */
export async function GET(req: Request) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const prisma = getPrisma();
  if (!prisma) return NextResponse.json({ ok: false, error: "service_unavailable" }, { status: 503 });

  try {
    const rules = await prisma.maintenanceRule.findMany({
      where: { isActive: true },
      include: { company: { select: { plan: true } } },
    });

    let created = 0;
    let skippedCompanies = 0;

    for (const rule of rules) {
      // Skip companies without the maintenance_alerts feature
      if (!isFeatureEnabled((rule as any).company?.plan, "maintenance_alerts")) {
        skippedCompanies++;
        continue;
      }

      const now = new Date();
      const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const where: any = {
        companyId: rule.companyId,
        nextServiceAt: { lte: horizon },
      };
      if (rule.assetType) where.type = rule.assetType;

      const dueAssets = await prisma.installedAsset.findMany({ where, take: 500 });

      for (const asset of dueAssets) {
        const existing = await prisma.maintenanceAlert.findFirst({
          where: {
            companyId: rule.companyId,
            assetId: asset.id,
            ruleId: rule.id,
            status: { in: ["open", "ack"] },
          },
        });
        if (existing) continue;

        await prisma.maintenanceAlert.create({
          data: {
            companyId: rule.companyId,
            assetId: asset.id,
            ruleId: rule.id,
            status: "open",
            dueAt: asset.nextServiceAt || now,
            message: `${rule.name}: ${asset.name} is due for service`,
          },
        });
        created++;
      }
    }

    return NextResponse.json({ ok: true, alertsCreated: created, skippedCompanies });
  } catch (e: any) {
    console.error("[cron/maintenance-alerts]", e);
    return NextResponse.json({ ok: false, error: "cron_failed" }, { status: 500 });
  }
}
