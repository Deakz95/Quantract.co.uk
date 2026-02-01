export type TimelineItemType =
  | "job"
  | "job_completed"
  | "invoice"
  | "invoice_paid"
  | "certificate"
  | "quote";

export type TimelineItem = {
  id: string;
  type: TimelineItemType;
  ts: string;
  title: string;
  subtitle?: string;
  status?: string;
  amountPence?: number;
  currency?: "GBP";
  href?: string;
  pdfHref?: string;
  /** Certificate-specific */
  certType?: string;
  issuedDate?: string;
  expiryDate?: string;
  /** Invoice-specific */
  subtotal?: number;
  vat?: number;
  total?: number;
  /** Job-specific */
  siteName?: string;
};
