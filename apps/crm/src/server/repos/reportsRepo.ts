import { getPrisma } from "@/lib/server/prisma";
import type { JobProfitabilityRow } from "@/types/reports";
import type { PrismaClient } from "@prisma/client";

export async function listJobProfitability(args: {
  status?: string;
  query?: string;
}): Promise<JobProfitabilityRow[]> {
  const client = getPrisma() as PrismaClient | null;
  if (!client) return [];

  const where: any = {};
  if (args.status) where.status = args.status;

  const jobs = (await client.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { client: true },
  })) as any[];

  const q = String(args.query || "").trim().toLowerCase();
  const filtered = q
    ? jobs.filter((job) =>
        [job.id, job.ref, job.status, job.client?.name, job.client?.email]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    : jobs;

  return filtered.map((job) => ({
    jobId: job.id,
    jobRef: String(job.ref ?? job.id),
    clientName: job.client?.name ?? "",
    status: String(job.status || ""),
    summary: {
      actualCost: Number(job.actualCost ?? 0),
      forecastCost: Number(job.forecastCost ?? 0),
      revenue: Number(job.revenue ?? 0),
      actualMarginPct: Number(job.actualMarginPct ?? 0),
      forecastMarginPct: Number(job.forecastMarginPct ?? 0),
    },
  }));
}
