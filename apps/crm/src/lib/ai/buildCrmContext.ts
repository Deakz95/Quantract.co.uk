import { prisma } from "@/lib/server/prisma";
import type { CrmInputJson } from "./types";
import { computeBreakEven, type OverheadRow, type RateCardRow } from "@/lib/finance/breakEven";

const TRADE_INDUSTRIES = ["electrical", "plumbing", "construction", "building", "hvac", "mechanical", "trade"];

export async function buildCrmContext(companyId: string, userId: string): Promise<CrmInputJson> {
  const [
    company,
    membership,
    user,
    enquiryCount,
    quoteCount,
    invoiceCount,
    jobCount,
    clientCount,
    contactCount,
    engineerCount,
    dealCount,
    pipelineStages,
    dealStages,
    recentAudit,
    openQuotes,
    acceptedQuotes,
    activeJobs,
    unpaidInvoices,
    openEnquiries,
    draftInvoices,
    overheadRows,
    rateCardRows,
    thisMonthPayments,
  ] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, plan: true, brandName: true, createdAt: true },
    }),
    prisma.companyUser.findFirst({
      where: { companyId, userId },
      select: { role: true, createdAt: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, createdAt: true },
    }),
    prisma.enquiry.count({ where: { companyId } }),
    prisma.quote.count({ where: { companyId } }),
    prisma.invoice.count({ where: { companyId } }),
    prisma.job.count({ where: { companyId } }),
    prisma.client.count({ where: { companyId } }),
    prisma.contact.count({ where: { companyId } }),
    prisma.companyUser.count({ where: { companyId, role: "engineer" } }),
    prisma.deal.count({ where: { companyId } }),
    prisma.pipelineStage.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
      select: { name: true },
    }),
    prisma.dealStage.findMany({
      where: { companyId },
      orderBy: { sortOrder: "asc" },
      select: { name: true },
    }),
    prisma.auditEvent.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { action: true },
    }),
    prisma.quote.count({ where: { companyId, status: { in: ["draft", "sent"] } } }),
    prisma.quote.count({ where: { companyId, status: "accepted" } }),
    prisma.job.count({ where: { companyId, status: { in: ["new", "pending", "scheduled", "in_progress"] } } }),
    prisma.invoice.count({ where: { companyId, status: { in: ["sent", "unpaid"] } } }),
    prisma.enquiry.count({ where: { companyId, status: { notIn: ["won", "lost", "closed"] } } }),
    prisma.invoice.count({ where: { companyId, status: "draft" } }),
    prisma.companyOverhead.findMany({ where: { companyId } }).catch(() => []),
    prisma.rateCard.findMany({ where: { companyId } }).catch(() => []),
    prisma.invoicePayment.findMany({
      where: {
        companyId,
        receivedAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        status: "succeeded",
      },
      select: { amount: true },
    }).catch(() => []),
  ]);

  // Experience level
  const accountCreatedAt = membership?.createdAt ?? user?.createdAt ?? new Date();
  const daysSinceCreation = Math.floor((Date.now() - new Date(accountCreatedAt).getTime()) / (1000 * 60 * 60 * 24));
  const experience_level = daysSinceCreation < 7 ? "new" : daysSinceCreation < 30 ? "intermediate" : "power";

  // Role
  const role = membership?.role ?? user?.role ?? "admin";

  // Industry inference (no explicit field — derive from brand/company name)
  const nameLower = (company?.brandName ?? company?.name ?? "").toLowerCase();
  const industry = TRADE_INDUSTRIES.find((t) => nameLower.includes(t)) ?? "trade";

  // Sales cycle
  const sales_cycle = TRADE_INDUSTRIES.some((t) => nameLower.includes(t)) ? "short" : "medium";

  // Primary goal inference
  let primary_goal = "better follow-up";
  if (enquiryCount === 0 && openEnquiries === 0) {
    primary_goal = "more leads";
  } else if (draftInvoices > 3) {
    primary_goal = "better follow-up";
  } else {
    // Default — no reports-viewed signal available yet
    primary_goal = "visibility";
  }

  // Budget sensitivity from plan
  const plan = company?.plan ?? "trial";
  const budget_sensitivity = plan === "enterprise" ? "low" : plan === "pro" ? "medium" : "high";

  // Modules enabled
  const modules_enabled: string[] = [];
  if (enquiryCount > 0) modules_enabled.push("enquiries");
  if (quoteCount > 0) modules_enabled.push("quotes");
  if (invoiceCount > 0) modules_enabled.push("invoices");
  if (jobCount > 0) modules_enabled.push("jobs");
  if (clientCount > 0) modules_enabled.push("clients");
  if (contactCount > 0) modules_enabled.push("contacts");
  if (engineerCount > 0) modules_enabled.push("engineers");
  if (dealCount > 0) modules_enabled.push("deals");

  // Company size inference
  const size = engineerCount >= 20 ? "large" : engineerCount >= 5 ? "medium" : "small";

  // Break-even
  const overheads: OverheadRow[] = overheadRows.map((r: { label: string; amountPence: number; frequency: string }) => ({
    label: r.label,
    amountPence: r.amountPence,
    frequency: r.frequency as OverheadRow["frequency"],
  }));
  const rateCardsTyped: RateCardRow[] = rateCardRows.map((r: { name: string; costRatePerHour: number; chargeRatePerHour: number; isDefault: boolean }) => ({
    name: r.name,
    costRatePerHour: r.costRatePerHour,
    chargeRatePerHour: r.chargeRatePerHour,
    isDefault: r.isDefault,
  }));
  const thisMonthPence = Math.round(
    thisMonthPayments.reduce((s: number, p: { amount: number }) => s + (p.amount || 0), 0) * 100,
  );
  const be = computeBreakEven(overheads, rateCardsTyped, { thisMonthPence, lastMonthPence: 0 });

  return {
    user: { role, experience_level },
    company: { industry, size, sales_cycle, primary_goal },
    current_setup: {
      modules_enabled,
      pipeline_stages: pipelineStages.map((s: { name: string }) => s.name),
      deal_stages: dealStages.map((s: { name: string }) => s.name),
      integrations: [],
      custom_fields_count: 0,
      automations_count: 0,
    },
    signals_from_site: {
      pages_visited: [],
      recent_actions: recentAudit.map((e: { action: string }) => e.action),
      pain_points_stated: [],
      usage_metrics: {
        open_quotes: openQuotes,
        accepted_quotes: acceptedQuotes,
        active_jobs: activeJobs,
        unpaid_invoices: unpaidInvoices,
        open_enquiries: openEnquiries,
        clients: clientCount,
        contacts: contactCount,
        engineers: engineerCount,
      },
    },
    financials: {
      monthly_overhead_pounds: Math.round(be.monthlyOverheadPence / 100),
      avg_margin_percent: Math.round(be.avgMarginRatio * 100),
      break_even_revenue_pounds: Math.round(be.breakEvenRevenuePence / 100),
      earned_this_month_pounds: Math.round(be.earnedPence / 100),
      break_even_progress_percent: be.progressPercent,
      days_left_in_month: be.daysLeft,
      configured: overheadRows.length > 0,
    },
    constraints: {
      gdpr_relevant: true,
      budget_sensitivity,
      plan,
    },
    available_features: {
      automations: false,
      custom_fields: false,
      engineer_portal: engineerCount > 0,
      email_templates: false,
      reports: true,
      integrations: false,
      client_portal: clientCount > 0,
      client_portal_messaging: false,
      payments_terms: true,
    },
  };
}
