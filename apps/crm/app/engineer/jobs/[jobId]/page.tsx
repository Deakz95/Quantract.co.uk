// app/engineer/jobs/[jobId]/page.tsx

import { notFound } from "next/navigation";
import { requireCompanyContext, getEffectiveRole } from "@/lib/serverAuth";
import * as repo from "@/lib/server/repo";
import EngineerJobDetail from "@/components/engineer/EngineerJobDetail";

type Props = {
  params: Promise<{ jobId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params }: Props) {
  const { jobId } = await params;
  if (!jobId) throw new Error("Missing jobId");

  const authCtx = await requireCompanyContext();
  const role = getEffectiveRole(authCtx);
  if (role !== "engineer" && role !== "admin") notFound();
  const email = authCtx.email;
  if (!email) notFound();

  const job = await repo.getJobForEngineer(jobId, email);
  if (!job) notFound();
  const quote = job.quoteId ? await repo.getQuoteById(job.quoteId) : null;
  const agreement = job.quoteId ? await repo.getAgreementForQuote(job.quoteId) : null;
  const stages = await repo.listJobStages(jobId);
  const variations = await repo.listVariationsForJob(jobId);
  const certs = await repo.listCertificatesForJob(jobId);
  const budgetLines = await repo.listJobBudgetLines(jobId);

  return (
    <EngineerJobDetail
      job={{
        id: job.id,
        title: job.title,
        status: job.status,
        clientName: job.clientName,
        clientEmail: job.clientEmail,
        siteName: job.siteName,
        siteAddress: job.siteAddress,
        scheduledAtISO: job.scheduledAtISO,
        notes: job.notes,
        quoteId: job.quoteId,
        stockConsumedAt: (job as any).stockConsumedAt ? new Date((job as any).stockConsumedAt).toISOString() : undefined,
      }}
      quote={quote ? {
        token: quote.token,
        notes: quote.notes,
        items: quote.items.map((i) => ({ id: i.id, description: i.description, qty: i.qty, unitPrice: i.unitPrice })),
      } : null}
      agreement={agreement ? { token: (agreement as any).token, status: agreement.status } : null}
      stages={stages.map((s) => ({ id: s.id, name: s.name, status: s.status }))}
      variations={variations.map((v) => ({ id: v.id, title: v.title, stageName: v.stageName, status: v.status, total: v.total }))}
      certs={certs.map((c) => ({ id: c.id, type: c.type, status: c.status, certificateNumber: c.certificateNumber, completedAtISO: c.completedAtISO }))}
      budgetLines={budgetLines.filter((bl) => bl.stockItemId).map((bl) => ({
        id: bl.id,
        description: bl.description,
        stockItemId: bl.stockItemId!,
        stockQty: bl.stockQty ?? 0,
      }))}
    />
  );
}
