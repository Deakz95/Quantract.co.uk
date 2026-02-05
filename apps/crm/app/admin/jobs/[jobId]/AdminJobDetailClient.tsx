"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import CompactTimeline from "@/components/admin/CompactTimeline";
import NextActionPanel from "@/components/admin/NextActionPanel";
import { Navigation } from "lucide-react";

function cleanJobTitle(raw?: string | null, jobNumber?: number | null): string {
  const jNum = jobNumber ? `J-${String(jobNumber).padStart(4, "0")}` : null;
  if (!raw || /^Job from Quote\s/i.test(raw) || /^Job\s*—\s*$/i.test(raw)) {
    return jNum || "Job";
  }
  return jNum ? `${jNum}: ${raw}` : raw;
}

type JobStatus = "new" | "scheduled" | "in_progress" | "completed";
type Job = {
  id: string;
  jobNumber?: number;
  quoteId?: string;
  quoteNumber?: string;
  title?: string;
  clientName: string;
  clientEmail: string;
  siteAddress?: string;
  status: JobStatus;
  engineerId?: string;
  engineerEmail?: string;
  scheduledAtISO?: string;
  notes?: string;
  stockConsumedAt?: string;
  budgetSubtotal?: number;
  site?: {
    name?: string;
    address1?: string;
    city?: string;
    postcode?: string;
  };
};

type JobCostingSummary = {
  jobId: string;
  budgetSubtotal: number;
  actualCost: number;
  forecastCost: number;
  actualMargin: number;
  forecastMargin: number;
  actualMarginPct: number;
  forecastMarginPct: number;
};

type TimeEntry = {
  id: string;
  jobId: string;
  engineerId: string;
  engineerEmail?: string;
  startedAtISO: string;
  endedAtISO?: string;
  breakMinutes: number;
  notes?: string;
};

type CostItem = {
  id: string;
  jobId: string;
  type: "material" | "subcontractor" | "plant" | "other" | "labour";
  stageId?: string;
  source?: string;
  lockStatus?: string;
  supplier?: string;
  description: string;
  quantity: number;
  unitCost: number;
  markupPct: number;
  incurredAtISO?: string;
  totalCost: number;
  attachments?: CostItemAttachment[];
};

type CostItemAttachment = {
  id: string;
  costItemId: string;
  name: string;
  mimeType: string;
  createdAtISO: string;
};

type JobBudgetLine = {
  id: string;
  jobId: string;
  source: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  sortOrder: number;
  stockItemId?: string;
  stockQty?: number;
};

type Certificate = {
  id: string;
  jobId?: string;
  type: "EIC" | "EICR" | "MWC";
  status: "draft" | "completed" | "issued" | "void";
  certificateNumber?: string;
  issuedAtISO?: string;
  completedAtISO?: string;
  pdfKey?: string;
};

type Variation = {
  id: string;
  token?: string;
  title: string;
  status: "draft" | "sent" | "approved" | "rejected";
  stageId?: string;
  subtotal: number;
  vat: number;
  total: number;
  createdAtISO: string;
  sentAtISO?: string;
  approvedAtISO?: string;
  rejectedAtISO?: string;
};

type JobStage = {
  id: string;
  name: string;
  status: "not_started" | "in_progress" | "done";
  sortOrder?: number;
};

type SnagItem = {
  id: string;
  jobId: string;
  title: string;
  description?: string;
  status: "open" | "in_progress" | "resolved";
  resolvedAtISO?: string;
  createdAtISO: string;
  updatedAtISO: string;
};

type Invoice = {
  id: string;
  token: string;
  type?: "deposit" | "stage" | "variation" | "final";
  stageName?: string;
  variationId?: string;
  status: "draft" | "sent" | "unpaid" | "paid";
  subtotal: number;
  vat: number;
  total: number;
  createdAtISO: string;
};

function pounds(n: number) {
  const v = Number(n || 0);
  return `£${v.toFixed(2)}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

type Props = {
  jobId: string;
};

export default function AdminJobDetail({ jobId }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [costing, setCosting] = useState<JobCostingSummary | null>(null);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [budgetLines, setBudgetLines] = useState<JobBudgetLine[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [stages, setStages] = useState<JobStage[]>([]);
  const [snagItems, setSnagItems] = useState<SnagItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [budgetBusy, setBudgetBusy] = useState(false);
  const [snagBusy, setSnagBusy] = useState(false);
  const [snagTitle, setSnagTitle] = useState("");
  const [snagDescription, setSnagDescription] = useState("");
  const [consumingStock, setConsumingStock] = useState(false);
  const [snagUpdatingId, setSnagUpdatingId] = useState<string | null>(null);

  // Variation quick-create (creates a draft then you edit line items in the variation editor)
  const [varTitle, setVarTitle] = useState("");
  const [varReason, setVarReason] = useState("");
  const [varStageId, setVarStageId] = useState("");

  const nextActions = useMemo(() => {
    const stageInvoiceNames = new Set(
      invoices
        .filter((i) => i.type === "stage" && i.stageName)
        .map((i) => String(i.stageName || "").trim().toLowerCase())
        .filter(Boolean)
    );
    const doneStages = stages.filter((s) => s.status === "done" && s.name);
    const missingStageInvoices = doneStages.filter((s) => !stageInvoiceNames.has(String(s.name).trim().toLowerCase()));
    const hasIssuedCert = certs.some((c) => c.status === "issued");
    const testCertDone = doneStages.some((s) => /test|cert/i.test(s.name));
    return {
      missingStageInvoices,
      shouldNudgeCert: (testCertDone || job?.status === "completed") && !hasIssuedCert,
    };
  }, [invoices, stages, certs, job]);

  // Invoice quick-create
  const [invoiceType, setInvoiceType] = useState<Invoice["type"]>("stage");
  const [invoiceStageName, setInvoiceStageName] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [selectedCertIds, setSelectedCertIds] = useState<string[]>([]);

  const profitability = useMemo(() => {
    if (!costing) return null;
    return {
      ...costing,
      actualMarginText: `${Math.round((costing.actualMarginPct || 0) * 100)}%`,
      forecastMarginText: `${Math.round((costing.forecastMarginPct || 0) * 100)}%`,
    };
  }, [costing]);

  const stageLookup = useMemo(() => new Map(stages.map((stage) => [stage.id, stage.name])), [stages]);
  const billedVariationIds = useMemo(() => new Set(invoices.filter((inv) => inv.variationId).map((inv) => inv.variationId as string)), [invoices]);

  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => {
    const name = job?.title || job?.clientName;
    const jobLabel = name ? `Job: ${name}` : "Job";
    return [
      { label: "Dashboard", href: "/admin" },
      { label: "Jobs", href: "/admin/jobs" },
      { label: jobLabel },
    ];
  }, [jobId, job?.title, job?.clientName]);

  async function refresh() {
    setLoading(true);
    try {
      const [j, c, t, ci, bl, ce, v, s, inv, sn] = await Promise.all([
        fetch(`/api/admin/jobs/${jobId}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/jobs/${jobId}/costing`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/jobs/${jobId}/time-entries`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/jobs/${jobId}/cost-items`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/jobs/${jobId}/budget-lines`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/jobs/${jobId}/certificates`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/jobs/${jobId}/variations`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/jobs/${jobId}/stages`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/jobs/${jobId}/invoices`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/jobs/${jobId}/snag-items`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      if (j.ok) setJob(j.job);
      if (c.ok) setCosting(c.costing);
      if (t.ok) setTimeEntries(Array.isArray(t.timeEntries) ? t.timeEntries : []);
      if (ci.ok) setCostItems(Array.isArray(ci.costItems) ? ci.costItems : []);
      if (bl.ok) setBudgetLines(Array.isArray(bl.lines) ? bl.lines : []);
      if (ce.ok) setCerts(Array.isArray(ce.certificates) ? ce.certificates : []);
      if (v.ok) setVariations(Array.isArray(v.variations) ? v.variations : []);
      if (s.ok) setStages(Array.isArray(s.stages) ? s.stages : []);
      if (inv.ok) setInvoices(Array.isArray(inv.invoices) ? inv.invoices : []);
      if (sn.ok) setSnagItems(Array.isArray(sn.snagItems) ? sn.snagItems : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!jobId) {
      setLoading(false);
      setJob(null);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function ensureStages(template: "reactive" | "install") {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/jobs/${jobId}/stages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ template }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.ok) throw new Error(d.error || "Failed");
      setStages(Array.isArray(d.stages) ? d.stages : []);
      toast({ title: "Stages ready", description: `Template: ${template}`, variant: "success" });
    } catch (error: unknown) {
      toast({ title: "Could not create stages", description: getErrorMessage(error, "Unknown error"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function setStageStatus(stageId: string, status: JobStage["status"]) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/stages/${stageId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.ok) throw new Error(d.error || "Failed");
      await refresh();
    } catch (error: unknown) {
      toast({ title: "Could not update stage", description: getErrorMessage(error, "Unknown error"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function createVariation() {
    if (!varTitle.trim()) {
      toast({ title: "Missing title", description: "Enter a short title for the variation.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/jobs/${jobId}/variations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: varTitle,
          reason: varReason,
          stageId: varStageId || undefined,
          // Start with an empty draft; items are edited in the variation page.
          items: [{ description: "", qty: 1, unitPrice: 0 }],
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.ok) throw new Error(d.error || "Failed");
      setVarTitle("");
      setVarReason("");
      setVarStageId("");
      await refresh();
      toast({ title: "Variation created", description: "Opening editor…", variant: "success" });
      // Push straight to the editor so multi-line items can be added.
      if (d.variation?.id) router.push(`/admin/variations/${d.variation.id}`);
    } catch (error: unknown) {
      toast({ title: "Could not create variation", description: getErrorMessage(error, "Unknown error"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function createSnag() {
    if (!snagTitle.trim()) {
      toast({ title: "Missing title", description: "Enter a short snag title.", variant: "destructive" });
      return;
    }
    setSnagBusy(true);
    try {
      const r = await fetch(`/api/admin/jobs/${jobId}/snag-items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: snagTitle.trim(), description: snagDescription.trim() || undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.ok) throw new Error(d.error || "Failed");
      setSnagTitle("");
      setSnagDescription("");
      setSnagItems((prev) => [d.snagItem, ...prev]);
      toast({ title: "Snag logged", description: "Item added to the job.", variant: "success" });
    } catch (error: unknown) {
      toast({ title: "Could not add snag", description: getErrorMessage(error, "Unknown error"), variant: "destructive" });
    } finally {
      setSnagBusy(false);
    }
  }

  async function updateSnagStatus(id: string, status: SnagItem["status"]) {
    setSnagUpdatingId(id);
    try {
      const r = await fetch(`/api/admin/snag-items/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.ok) throw new Error(d.error || "Failed");
      setSnagItems((prev) => prev.map((item) => (item.id === id ? d.snagItem : item)));
    } catch (error: unknown) {
      toast({ title: "Could not update snag", description: getErrorMessage(error, "Unknown error"), variant: "destructive" });
    } finally {
      setSnagUpdatingId(null);
    }
  }

  async function sendVariation(variationId: string) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/variations/${variationId}/send`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!d.ok) throw new Error(d.error || "Failed");
      await refresh();
      toast({ title: "Variation sent", description: `Client link: ${d.clientLink}`, variant: "success" });
    } catch (error: unknown) {
      toast({ title: "Could not send", description: getErrorMessage(error, "Unknown error"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function createVariationInvoice(variation: Variation) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/jobs/${jobId}/invoices`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "variation", variationId: variation.id, subtotal: variation.subtotal }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.ok) throw new Error(d.error || "Failed");
      await refresh();
      toast({ title: "Invoice created", description: "Variation invoice ready.", variant: "success" });
    } catch (error: unknown) {
      toast({ title: "Could not create invoice", description: getErrorMessage(error, "Unknown error"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function createInvoice() {
    const subtotal = Number(invoiceAmount || 0);
    if (!subtotal || subtotal <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive subtotal (ex VAT).", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/jobs/${jobId}/invoices`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: invoiceType, stageName: invoiceStageName || undefined, subtotal, certificateIds: selectedCertIds.length > 0 ? selectedCertIds : undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!d.ok) throw new Error(d.error || "Failed");
      setInvoiceAmount("");
      setInvoiceStageName("");
      setSelectedCertIds([]);
      await refresh();
      toast({ title: "Invoice created", variant: "success" });
    } catch (error: unknown) {
      toast({ title: "Could not create invoice", description: getErrorMessage(error, "Unknown error"), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function addCostItem(form: HTMLFormElement) {
    const fd = new FormData(form);
    const description = String(fd.get("description") || "").trim();
    const unitCost = Number(fd.get("unitCost") || 0);
    const quantity = Number(fd.get("quantity") || 1);
    const supplier = String(fd.get("supplier") || "").trim();
    const type = String(fd.get("type") || "material");
    const stageId = String(fd.get("stageId") || "").trim();
    const incurredAtRaw = String(fd.get("incurredAt") || "").trim();
    const incurredAtISO = incurredAtRaw ? new Date(`${incurredAtRaw}T00:00:00`).toISOString() : undefined;
    if (!description) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/jobs/${jobId}/cost-items`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          description,
          supplier: supplier || undefined,
          unitCost,
          quantity,
          markupPct: 0,
          stageId: stageId || undefined,
          incurredAtISO,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "failed");
      toast({ title: "Added", description: "Cost item added.", variant: "success" });
      form.reset();
      refresh();
    } catch {
      toast({ title: "Error", description: "Could not add cost item.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function addTime(form: HTMLFormElement) {
    const fd = new FormData(form);
    const engineerEmail = String(fd.get("engineerEmail") || "").trim();
    const startedAtISO = new Date(String(fd.get("startedAt") || "")).toISOString();
    const endedRaw = String(fd.get("endedAt") || "").trim();
    const endedAtISO = endedRaw ? new Date(endedRaw).toISOString() : undefined;
    if (!engineerEmail) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/jobs/${jobId}/time-entries`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ engineerEmail, startedAtISO, endedAtISO, breakMinutes: 0 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "failed");
      toast({ title: "Added", description: "Time entry added.", variant: "success" });
      form.reset();
      refresh();
    } catch {
      toast({ title: "Error", description: "Could not add time entry.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const hasStockMappedLines = budgetLines.some((l) => l.stockItemId);

  async function consumeStock() {
    if (!job?.engineerId) {
      toast({ title: "No engineer assigned", description: "Assign an engineer to this job before consuming stock.", variant: "destructive" });
      return;
    }
    if (!confirm("Consume stock for this job? This will deduct mapped quantities from the engineer's truck stock.")) return;
    setConsumingStock(true);
    try {
      const r = await fetch(`/api/admin/jobs/${jobId}/consume-stock`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ engineerId: job.engineerId }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d?.error || "failed");
      if (d.alreadyConsumed) {
        toast({ title: "Already consumed", description: "Stock was already consumed for this job.", variant: "default" });
      } else {
        const consumedCount = d.consumed?.length ?? 0;
        const insufficientCount = d.insufficient?.length ?? 0;
        const parts = [`${consumedCount} item(s) consumed`];
        if (insufficientCount > 0) parts.push(`${insufficientCount} insufficient`);
        toast({ title: "Stock consumed", description: parts.join(", "), variant: insufficientCount > 0 ? "destructive" : "success" });
      }
      refresh();
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not consume stock."), variant: "destructive" });
    } finally {
      setConsumingStock(false);
    }
  }

  async function saveBudgetLines() {
    setBudgetBusy(true);
    try {
      const r = await fetch(`/api/admin/jobs/${jobId}/budget-lines`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: budgetLines }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d?.error || "failed");
      setBudgetLines(Array.isArray(d.lines) ? d.lines : []);
      toast({ title: "Budget saved", description: "Budget lines updated.", variant: "success" });
      refresh();
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not update budget lines."), variant: "destructive" });
    } finally {
      setBudgetBusy(false);
    }
  }

  async function resetBudgetLines() {
    setBudgetBusy(true);
    try {
      const r = await fetch(`/api/admin/jobs/${jobId}/budget-lines`, { method: "POST" });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d?.error || "failed");
      setBudgetLines(Array.isArray(d.lines) ? d.lines : []);
      toast({ title: "Budget reset", description: "Budget lines reset to quote.", variant: "success" });
      refresh();
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not reset budget lines."), variant: "destructive" });
    } finally {
      setBudgetBusy(false);
    }
  }

  async function uploadCostItemAttachments(costItemId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const form = new FormData();
    Array.from(files).forEach((file) => form.append("files", file));
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/cost-items/${costItemId}/attachments`, { method: "POST", body: form });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d?.error || "failed");
      toast({ title: "Uploaded", description: "Attachment added.", variant: "success" });
      refresh();
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not upload attachment."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function createCert(type: Certificate["type"]) {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/jobs/${jobId}/certificates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "failed");
      toast({ title: "Created", description: "Certificate created.", variant: "success" });
      refresh();
    } catch {
      toast({ title: "Error", description: "Could not create certificate.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--foreground)]">{cleanJobTitle(job?.title, job?.jobNumber) || job?.clientName || "Job"}</div>
          {job ? (
            <div className="mt-1 space-y-0.5">
              <div className="text-xs text-[var(--muted-foreground)]">
                {job.clientName} • {job.clientEmail}{job.quoteId ? ` • Quote: ${job.quoteNumber || "Linked"}` : ""}
              </div>
              {(job.siteAddress || job.site?.address1 || job.site?.name) && (
                <div className="text-xs text-[var(--muted-foreground)]">
                  📍 {job.siteAddress || [job.site?.address1, job.site?.city, job.site?.postcode].filter(Boolean).join(", ") || job.site?.name}
                </div>
              )}
              {/* Quick action: navigate to site */}
              {(() => {
                const addr = job.siteAddress || [job.site?.address1, job.site?.city, job.site?.postcode].filter(Boolean).join(", ");
                return addr ? (
                  <div className="mt-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--primary)]/10 transition-colors min-h-10 touch-manipulation"
                    >
                      <Navigation size={14} />
                      Navigate to site
                    </a>
                  </div>
                ) : null;
              })()}
            </div>
          ) : null}
        </div>
        <Button type="button" variant="secondary" className="min-h-12 px-4 touch-manipulation" onClick={refresh} disabled={busy}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
      ) : !job ? (
        <div className="text-sm text-[var(--muted-foreground)]">Not found.</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <CompactTimeline jobId={jobId} />
            </CardContent>
          </Card>

          {(() => {
            const hasInvoices = invoices.length > 0;
            const hasCerts = certs.length > 0;
            const allPaid = hasInvoices && invoices.every((i) => i.status === "paid");
            switch (job.status) {
              case "new":
                return (
                  <NextActionPanel
                    headline="Next step: schedule this job"
                    body="Assign an engineer and set a start date to move this job forward."
                  />
                );
              case "scheduled":
                return (
                  <NextActionPanel
                    headline="Job is scheduled"
                    body={`Waiting for work to begin.${job.engineerEmail ? ` Assigned to ${job.engineerEmail}.` : ""}`}
                  />
                );
              case "in_progress":
                return (
                  <NextActionPanel
                    headline="Work in progress"
                    body="Mark the job as complete when all work is finished, or raise a variation for scope changes."
                  />
                );
              case "completed":
                if (!hasCerts && !hasInvoices) {
                  return (
                    <NextActionPanel
                      headline="Job complete — issue certificate or invoice"
                      body="This job is finished. Create a compliance certificate or a final invoice."
                    />
                  );
                }
                if (!hasCerts) {
                  return (
                    <NextActionPanel
                      headline="Job complete — certificate needed"
                      body="An invoice exists but no certificate has been issued yet."
                    />
                  );
                }
                if (!hasInvoices) {
                  return (
                    <NextActionPanel
                      headline="Job complete — invoice needed"
                      body="A certificate has been issued. Create a final invoice to bill the client."
                    />
                  );
                }
                if (!allPaid) {
                  return (
                    <NextActionPanel
                      headline="Awaiting payment"
                      body="Job is complete and invoiced. Follow up with the client if payment is overdue."
                    />
                  );
                }
                return (
                  <NextActionPanel
                    headline="All done"
                    body="Job complete, certificate issued, and all invoices paid."
                  />
                );
              default:
                return null;
            }
          })()}

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Profitability</CardTitle>
                <Badge>{job.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {profitability ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Budget (ex VAT)</div>
                    <div className="mt-1 text-lg font-bold text-[var(--foreground)]">{pounds(profitability.budgetSubtotal)}</div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Actual cost (locked)</div>
                    <div className="mt-1 text-lg font-bold text-[var(--foreground)]">{pounds(profitability.actualCost)}</div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">Margin {pounds(profitability.actualMargin)} • {profitability.actualMarginText}</div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Forecast cost</div>
                    <div className="mt-1 text-lg font-bold text-[var(--foreground)]">{pounds(profitability.forecastCost)}</div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">Includes open items</div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Cost to complete</div>
                    <div className="mt-1 text-lg font-bold text-[var(--foreground)]">
                      {pounds(Math.max(0, profitability.forecastCost - profitability.actualCost))}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">Forecast cost minus actual cost.</div>
                  </div>
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Forecast margin</div>
                    <div className="mt-1 text-lg font-bold text-[var(--foreground)]">{pounds(profitability.forecastMargin)}</div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">{profitability.forecastMarginText}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[var(--muted-foreground)]">No costing yet.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Budget lines</CardTitle>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="secondary" className="min-h-12 px-4 touch-manipulation" disabled={budgetBusy} onClick={resetBudgetLines}>
                    Reset to quote
                  </Button>
                  <Button type="button" className="min-h-12 px-4 touch-manipulation" disabled={budgetBusy} onClick={saveBudgetLines}>
                    Save overrides
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {budgetLines.length === 0 ? (
                <div className="text-sm text-[var(--muted-foreground)]">No budget lines yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-[var(--muted-foreground)]">
                        <th className="py-2">Description</th>
                        <th className="py-2">Qty</th>
                        <th className="py-2">Unit price</th>
                        <th className="py-2">Total</th>
                        <th className="py-2">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetLines.map((line, idx) => (
                        <tr key={line.id} className="border-t border-[var(--border)]">
                          <td className="py-2 pr-2">
                            <input
                              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation"
                              value={line.description}
                              onChange={(event) => {
                                const next = [...budgetLines];
                                next[idx] = { ...line, description: event.target.value, source: "override" };
                                setBudgetLines(next);
                              }}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              step="0.01"
                              className="w-24 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation"
                              value={line.quantity}
                              onChange={(event) => {
                                const quantity = Number(event.target.value || 0);
                                const next = [...budgetLines];
                                next[idx] = { ...line, quantity, total: quantity * line.unitPrice, source: "override" };
                                setBudgetLines(next);
                              }}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              step="0.01"
                              className="w-32 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation"
                              value={line.unitPrice}
                              onChange={(event) => {
                                const unitPrice = Number(event.target.value || 0);
                                const next = [...budgetLines];
                                next[idx] = { ...line, unitPrice, total: unitPrice * line.quantity, source: "override" };
                                setBudgetLines(next);
                              }}
                            />
                          </td>
                          <td className="py-2 pr-2 text-sm font-semibold text-[var(--foreground)]">{pounds(line.total)}</td>
                          <td className="py-2 text-xs text-[var(--muted-foreground)]">{line.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Consume stock button */}
              {hasStockMappedLines && (
                <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center gap-3">
                  {job?.stockConsumedAt ? (
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Stock consumed &#10003;</span>
                  ) : (
                    <Button size="sm" onClick={consumeStock} disabled={consumingStock}>
                      {consumingStock ? "Consuming..." : "Consume Stock"}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Time entries</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void addTime(event.currentTarget);
                }}
                className="flex flex-wrap items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3"
              >
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Engineer email</span>
                  <input name="engineerEmail" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation placeholder:text-[var(--muted-foreground)]" placeholder="engineer@example.com" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Start</span>
                  <input name="startedAt" type="datetime-local" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">End</span>
                  <input name="endedAt" type="datetime-local" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation" />
                </label>
                <Button type="submit" disabled={busy}>
                  Add
                </Button>
              </form>

              {timeEntries.length === 0 ? (
                <div className="mt-3 text-sm text-[var(--muted-foreground)]">No time logged yet.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {timeEntries.map((t) => (
                    <div key={t.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-[var(--foreground)]">{t.engineerEmail || "Engineer"}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {new Date(t.startedAtISO).toLocaleString("en-GB")} → {t.endedAtISO ? new Date(t.endedAtISO).toLocaleString("en-GB") : "(running)"}
                        </div>
                      </div>
                      {t.notes ? <div className="mt-1 text-xs text-[var(--muted-foreground)]">{t.notes}</div> : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost items</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void addCostItem(event.currentTarget);
                }}
                className="flex flex-wrap items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3"
              >
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Type</span>
                  <select name="type" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation">
                    <option value="material">Material</option>
                    <option value="subcontractor">Subcontractor</option>
                    <option value="plant">Plant</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Description</span>
                  <input name="description" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation placeholder:text-[var(--muted-foreground)]" placeholder="e.g. Cable, fittings" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Supplier</span>
                  <input name="supplier" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation placeholder:text-[var(--muted-foreground)]" placeholder="Optional" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Quantity</span>
                  <input name="quantity" type="number" step="0.01" defaultValue="1" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Unit cost (ex VAT)</span>
                  <input name="unitCost" type="number" step="0.01" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation" />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Stage</span>
                  <select name="stageId" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation">
                    <option value="">Unassigned</option>
                    {stages.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Incurred date</span>
                  <input name="incurredAt" type="date" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm min-h-12 touch-manipulation" />
                </label>
                <Button type="submit" className="min-h-12 px-4 touch-manipulation" disabled={busy}>
                  Add
                </Button>
              </form>

              {costItems.length === 0 ? (
                <div className="mt-3 text-sm text-[var(--muted-foreground)]">No costs logged yet.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {costItems.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-[var(--foreground)]">{c.description}</div>
                          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {c.supplier ? `${c.supplier} • ` : ""}
                            {c.incurredAtISO ? `Incurred ${new Date(c.incurredAtISO).toLocaleDateString("en-GB")} • ` : ""}
                            {c.stageId ? `Stage ${stageLookup.get(c.stageId) || c.stageId} • ` : ""}
                            {c.source ? `Source ${c.source}` : ""}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge>{c.type}</Badge>
                          {c.lockStatus ? <Badge>{c.lockStatus}</Badge> : null}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Qty {c.quantity} • Unit {pounds(c.unitCost)} • Total {pounds(c.totalCost || c.quantity * c.unitCost)}
                      </div>
                      {c.type === "subcontractor" ? (
                        <div className="mt-2">
                          <div className="text-xs font-semibold text-[var(--muted-foreground)]">Attachments</div>
                          {c.attachments && c.attachments.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-2 text-xs">
                              {c.attachments.map((att) => (
                                <a
                                  key={att.id}
                                  className="rounded-full border border-[var(--border)] px-3 py-1 text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                                  href={`/api/admin/cost-items/${c.id}/attachments/${att.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {att.name}
                                </a>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-[var(--muted-foreground)]">No attachments yet.</div>
                          )}
                          <div className="mt-2">
                            <input
                              type="file"
                              className="text-xs"
                              multiple
                              onChange={(event) => uploadCostItemAttachments(c.id, event.currentTarget.files)}
                            />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Job stages</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => ensureStages("reactive")}>Reactive template</Button>
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => ensureStages("install")}>Install template</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {stages.length === 0 ? (
                <div className="text-sm text-[var(--muted-foreground)]">No stages yet. Choose a template above.</div>
              ) : (
                <div className="space-y-2">
                  {stages.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[var(--foreground)]">{s.name}</div>
                        <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">{s.status}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="secondary" disabled={busy} onClick={() => setStageStatus(s.id, "not_started")}>Not started</Button>
                        <Button type="button" variant="secondary" disabled={busy} onClick={() => setStageStatus(s.id, "in_progress")}>In progress</Button>
                        <Button type="button" disabled={busy} onClick={() => setStageStatus(s.id, "done")}>Done</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Snag items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Title</span>
                    <input
                      value={snagTitle}
                      onChange={(e) => setSnagTitle(e.target.value)}
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)]"
                      placeholder="e.g. Replace cracked socket"
                      disabled={snagBusy}
                    />
                  </label>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Details</span>
                    <textarea
                      value={snagDescription}
                      onChange={(e) => setSnagDescription(e.target.value)}
                      className="min-h-[90px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)]"
                      placeholder="Location, parts needed, or any notes."
                      disabled={snagBusy}
                    />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-[var(--muted-foreground)]">Track site issues to close out before handover.</div>
                  <Button type="button" onClick={createSnag} disabled={snagBusy}>Add snag</Button>
                </div>
              </div>

              {snagItems.length === 0 ? (
                <div className="mt-3 text-sm text-[var(--muted-foreground)]">No snag items yet.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {snagItems.map((item) => (
                    <div key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-[var(--foreground)]">{item.title}</div>
                          <Badge>{item.status.replace("_", " ")}</Badge>
                        </div>
                        {item.description ? (
                          <div className="mt-1 text-xs text-[var(--muted-foreground)]">{item.description}</div>
                        ) : null}
                        <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                          Logged {new Date(item.createdAtISO).toLocaleString("en-GB")}
                          {item.resolvedAtISO ? ` • Resolved ${new Date(item.resolvedAtISO).toLocaleString("en-GB")}` : ""}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs"
                          value={item.status}
                          disabled={snagUpdatingId === item.id}
                          onChange={(event) => updateSnagStatus(item.id, event.target.value as SnagItem["status"])}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Variations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="grid gap-2 sm:grid-cols-4">
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Title</span>
                    <input value={varTitle} onChange={(e) => setVarTitle(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)]" placeholder="e.g. Extra sockets" />
                  </label>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Stage (optional)</span>
                    <select value={varStageId} onChange={(e) => setVarStageId(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
                      <option value="">Unassigned</option>
                      {stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>{stage.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Reason (optional)</span>
                    <input value={varReason} onChange={(e) => setVarReason(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)]" placeholder="Client requested change" />
                  </label>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs text-[var(--muted-foreground)]">Creates a draft variation then opens the multi-line editor.</div>
                  <Button type="button" onClick={createVariation} disabled={busy}>Create draft & edit</Button>
                </div>
              </div>

              {variations.length === 0 ? (
                <div className="mt-3 text-sm text-[var(--muted-foreground)]">No variations yet.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {variations.map((v) => {
                    const stageName = v.stageId ? stageLookup.get(v.stageId) : undefined;
                    const billed = billedVariationIds.has(v.id);
                    return (
                      <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-sm font-semibold text-[var(--foreground)]">{v.title}</div>
                            <Badge>{v.status}</Badge>
                            {stageName ? <Badge>{stageName}</Badge> : null}
                            <Badge>{pounds(v.total)}</Badge>
                          </div>
                          <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                            Created {new Date(v.createdAtISO).toLocaleString("en-GB")}
                            {v.sentAtISO ? ` • Sent ${new Date(v.sentAtISO).toLocaleString("en-GB")}` : ""}
                            {v.approvedAtISO ? ` • Approved ${new Date(v.approvedAtISO).toLocaleString("en-GB")}` : ""}
                            {v.rejectedAtISO ? ` • Rejected ${new Date(v.rejectedAtISO).toLocaleString("en-GB")}` : ""}
                          </div>
                          {v.status === "approved" && !billed ? (
                            <div className="mt-1 text-xs font-semibold text-emerald-700">Approved • ready to invoice</div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link className="text-sm font-semibold text-[var(--foreground)] hover:underline" href={`/admin/variations/${v.id}`}>Open</Link>
                          <a className="text-sm font-semibold text-[var(--foreground)] hover:underline" href={`/api/admin/variations/${v.id}/pdf`} target="_blank" rel="noreferrer">PDF</a>
                          {v.status === "draft" ? (
                            <Button type="button" variant="secondary" disabled={busy} onClick={() => sendVariation(v.id)}>Send to client</Button>
                          ) : null}
                          {v.status === "approved" && !billed ? (
                            <Button type="button" disabled={busy} onClick={() => createVariationInvoice(v)}>Create invoice</Button>
                          ) : null}
                          {v.status === "approved" && billed ? (
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Invoiced</Badge>
                          ) : null}
                          {v.token ? (
                            <Link className="text-sm font-semibold text-[var(--foreground)] hover:underline" href={`/client/variations/${v.token}`} target="_blank">
                              Client link
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {(nextActions.missingStageInvoices.length > 0 || nextActions.shouldNudgeCert) ? (
            <Card>
              <CardHeader>
                <CardTitle>Next actions (stage triggers)</CardTitle>
              </CardHeader>
              <CardContent>
                {nextActions.missingStageInvoices.length > 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm">
                    <div className="font-semibold text-amber-900">Stage invoice recommended</div>
                    <div className="mt-1 text-amber-900">
                      Done stages with no stage invoice: {nextActions.missingStageInvoices.map((s) => s.name).join(", ")}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {nextActions.missingStageInvoices.slice(0, 3).map((s) => (
                        <Button
                          key={s.id}
                          type="button"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            setInvoiceType("stage");
                            setInvoiceStageName(s.name);
                          }}
                        >
                          Prefill invoice: {s.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {nextActions.shouldNudgeCert ? (
                  <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm">
                    <div className="font-semibold text-[var(--foreground)]">Certificate recommended</div>
                    <div className="mt-1 text-[var(--muted-foreground)]">A test/cert stage is done (or the job is completed) but no issued certificate exists yet.</div>
                    <div className="mt-2">
                      <Button type="button" variant="secondary" disabled={busy} onClick={() => createCert("EICR")}>Create EICR (prefill)</Button>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Invoices (stages / final)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                <div className="grid gap-2 sm:grid-cols-4">
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Type</span>
                    <select value={invoiceType || "stage"} onChange={(e) => setInvoiceType(e.target.value as Invoice["type"])} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
                      <option value="stage">Stage</option>
                      <option value="deposit">Deposit</option>
                      <option value="final">Final</option>
                      <option value="variation">Variation</option>
                    </select>
                  </label>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Stage name (optional)</span>
                    <input value={invoiceStageName} onChange={(e) => setInvoiceStageName(e.target.value)} className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)]" placeholder="e.g. First Fix" />
                  </label>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Subtotal (ex VAT)</span>
                    <input value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} type="number" step="0.01" className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm" />
                  </label>
                </div>
                {certs.filter((c) => c.status === "issued").length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">Link certificates</div>
                    <div className="flex flex-wrap gap-2">
                      {certs.filter((c) => c.status === "issued").map((c) => (
                        <label key={c.id} className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-2.5 py-1.5 text-xs cursor-pointer hover:bg-[var(--muted)] transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedCertIds.includes(c.id)}
                            onChange={(e) => {
                              setSelectedCertIds((prev) =>
                                e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id),
                              );
                            }}
                            className="w-3.5 h-3.5 accent-[var(--primary)]"
                          />
                          <span className="font-medium text-[var(--foreground)]">{c.type}{c.certificateNumber ? ` ${c.certificateNumber}` : ""}</span>
                          {c.issuedAtISO && <span className="text-[var(--muted-foreground)]">{new Date(c.issuedAtISO).toLocaleDateString("en-GB")}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3">
                  <Button type="button" onClick={createInvoice} disabled={busy}>Create invoice</Button>
                </div>
              </div>

              {invoices.length === 0 ? (
                <div className="mt-3 text-sm text-[var(--muted-foreground)]">No invoices yet.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold text-[var(--foreground)]">{inv.type || "stage"}{inv.stageName ? ` • ${inv.stageName}` : ""}</div>
                          <Badge>{inv.status}</Badge>
                          <Badge>{pounds(inv.total)}</Badge>
                        </div>
                        <div className="mt-0.5 text-xs text-[var(--muted-foreground)]">Created {new Date(inv.createdAtISO).toLocaleString("en-GB")}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link className="text-sm font-semibold text-[var(--foreground)] hover:underline" href={`/admin/invoices/${inv.id}`}>Open</Link>
                        <Link className="text-sm font-semibold text-[var(--foreground)] hover:underline" href={`/client/invoices/${inv.token}`} target="_blank">Client</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Certificates</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => createCert("MWC")}>MWC</Button>
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => createCert("EIC")}>EIC</Button>
                  <Button type="button" variant="secondary" disabled={busy} onClick={() => createCert("EICR")}>EICR</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {certs.length === 0 ? (
                <div className="text-sm text-[var(--muted-foreground)]">No certificates yet.</div>
              ) : (
                <div className="space-y-2">
                  {certs.map((c) => (
                    <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link href={`/admin/certificates/${c.id}`} className="text-sm font-semibold text-[var(--foreground)] hover:underline">
                            {c.type}{c.certificateNumber ? ` • ${c.certificateNumber}` : ""}
                          </Link>
                          <Badge>{c.status}</Badge>
                          {c.certificateNumber ? <Badge>{c.certificateNumber}</Badge> : null}
                        </div>
                        {c.issuedAtISO ? (
                          <div className="mt-1 text-xs text-[var(--muted-foreground)]">Issued {new Date(c.issuedAtISO).toLocaleString("en-GB")}</div>
                        ) : c.completedAtISO ? (
                          <div className="mt-1 text-xs text-[var(--muted-foreground)]">Completed {new Date(c.completedAtISO).toLocaleString("en-GB")}</div>
                        ) : null}
                      </div>
                      {c.pdfKey ? (
                        <a className="text-sm font-semibold text-[var(--foreground)] hover:underline" href={`/api/admin/certificates/${c.id}/pdf`} target="_blank" rel="noreferrer">
                          PDF
                        </a>
                      ) : (
                        <span className="text-xs text-[var(--muted-foreground)]">No PDF yet (issue to generate)</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
