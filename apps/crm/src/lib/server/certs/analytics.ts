/**
 * Certificate analytics service.
 *
 * Provides KPI counts and observation statistics for admin dashboards.
 * All queries are company-scoped and consider only issued certificates.
 */

import { getPrisma } from "@/lib/server/prisma";

// ── Types ──

export type CertAnalyticsInput = {
  companyId: string;
  from: Date;
  to: Date;
};

export type ObservationStat = {
  code: string;
  count: number;
  percentage: number; // 0-100, relative to total issued certs in range
};

export type CertAnalyticsResult = {
  totals: {
    issued: number;
    unsatisfactory: number;
    fi: number;
    amendments: number;
  };
  observationStats: ObservationStat[];
};

// ── Main ──

export async function getCertAnalytics(input: CertAnalyticsInput): Promise<CertAnalyticsResult> {
  const prisma = getPrisma();
  if (!prisma) throw new Error("Database unavailable");

  const { companyId, from, to } = input;

  // Issued certs in date range (using certificate.issuedAt for simplicity)
  const issuedCerts = await prisma.certificate.findMany({
    where: {
      companyId,
      status: "issued",
      currentRevision: { gt: 0 },
      issuedAt: { gte: from, lte: to },
    },
    select: {
      id: true,
      outcome: true,
    },
  });

  const issued = issuedCerts.length;
  const unsatisfactory = issuedCerts.filter((c: any) => c.outcome === "unsatisfactory").length;
  const fi = issuedCerts.filter((c: any) => c.outcome === "further_investigation").length;

  // Amendments created in date range
  const amendments = await prisma.certificate.count({
    where: {
      companyId,
      amendsCertificateId: { not: null },
      createdAt: { gte: from, lte: to },
    },
  });

  // Observation stats — group by code for issued certs in range
  const certIds = issuedCerts.map((c: any) => c.id);

  let observationStats: ObservationStat[] = [];

  if (certIds.length > 0) {
    const obsGroups = await prisma.certificateObservation.groupBy({
      by: ["code"],
      where: {
        companyId,
        certificateId: { in: certIds },
      },
      _count: { code: true },
      orderBy: { _count: { code: "desc" } },
      take: 5,
    });

    observationStats = obsGroups.map((g: any) => ({
      code: g.code,
      count: g._count.code,
      percentage: issued > 0 ? Math.round((g._count.code / issued) * 100) : 0,
    }));
  }

  return {
    totals: { issued, unsatisfactory, fi, amendments },
    observationStats,
  };
}
