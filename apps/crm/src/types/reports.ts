// src/types/reports.ts
export type JobProfitabilityRow = {
  jobId: string;
  jobRef: string;
  clientName: string;
  status: string;
  summary: {
    actualCost: number;
    forecastCost: number;
    revenue: number;
    actualMarginPct: number;
    forecastMarginPct: number;
  };
};
