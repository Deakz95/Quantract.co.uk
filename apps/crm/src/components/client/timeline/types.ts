export type TimelineItem = {
  id: string;
  type: "job" | "invoice" | "certificate";
  ts: string;
  title: string;
  subtitle?: string;
  status?: string;
  amountPence?: number;
  currency?: "GBP";
  href?: string;
  pdfHref?: string;
};
