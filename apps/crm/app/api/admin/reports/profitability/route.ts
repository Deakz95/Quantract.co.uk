import { NextResponse } from "next/server";
import { requireRole } from "@/lib/serverAuth";
import { withRequestLogging } from "@/lib/server/observability";
import * as repo from "@/lib/server/repo";

type ProfitabilityRepoRow = Awaited<ReturnType<typeof repo.listJobProfitability>>[number];

export const GET = withRequestLogging(async function GET(req: Request) {
  await requireRole("admin");

  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? undefined;
  const query = url.searchParams.get("query") ?? undefined;

  const onlyRisk = url.searchParams.get("onlyRisk") === "1";
  const riskThreshold = Number(url.searchParams.get("riskThreshold") ?? "0.2");

  const minMarginRaw = url.searchParams.get("minMargin");
  const maxMarginRaw = url.searchParams.get("maxMargin");
  const minMargin = minMarginRaw != null && minMarginRaw !== "" ? Number(minMarginRaw) : null;
  const maxMargin = maxMarginRaw != null && maxMarginRaw !== "" ? Number(maxMarginRaw) : null;

  const rows = await repo.listJobProfitability({ status, query });

  const filtered = (rows as ProfitabilityRepoRow[]).filter((row: ProfitabilityRepoRow) => {
    if (onlyRisk && row.summary.forecastMarginPct >= riskThreshold) return false;
    if (minMargin != null && row.summary.forecastMarginPct < minMargin) return false;
    if (maxMargin != null && row.summary.forecastMarginPct > maxMargin) return false;
    return true;
  });

  return NextResponse.json({ ok: true, rows: filtered });
});
