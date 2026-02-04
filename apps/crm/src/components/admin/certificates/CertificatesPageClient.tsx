"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage, requireOk } from "@/lib/apiClient";
import { getStatusBadgeProps } from "@/lib/statusConfig";
import { BadgeCheck, Plus, ExternalLink, FileText, Briefcase, Download, BarChart3, AlertTriangle } from "lucide-react";
import { CERTIFICATE_TYPES } from "@/lib/certificates";

type Job = {
  id: string;
  jobNumber?: string;
  clientName: string;
  status: string;
  siteAddress?: string;
  name?: string;
  client?: { id: string; name: string };
  site?: { id: string; name: string; address1?: string };
};

type Certificate = {
  id: string;
  jobId?: string;
  type: "EIC" | "EICR" | "MWC";
  status: "draft" | "completed" | "issued" | "void";
  certificateNumber?: string;
  issuedAtISO?: string;
  completedAtISO?: string;
};

export default function CertificatesPageClient() {
  const { toast } = useToast();
  const loadedRef = useRef(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [jobId, setJobId] = useState("");
  const [type, setType] = useState<Certificate["type"]>("MWC");
  const [loading, setLoading] = useState(true);
  const [certLoading, setCertLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Export state
  const [exportFrom, setExportFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportAllRevisions, setExportAllRevisions] = useState(false);
  const [exportTypes, setExportTypes] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Analytics state
  type AnalyticsData = {
    totals: { issued: number; unsatisfactory: number; fi: number; amendments: number };
    observationStats: Array<{ code: string; count: number; percentage: number }>;
  };
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"7" | "30" | "90">("30");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Fetch analytics
  useEffect(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - Number(analyticsPeriod));
    const fromStr = from.toISOString().slice(0, 10);
    const toStr = to.toISOString().slice(0, 10);

    setAnalyticsLoading(true);
    fetch(`/api/admin/certificates/analytics?from=${fromStr}&to=${toStr}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setAnalytics({ totals: d.totals, observationStats: d.observationStats });
      })
      .catch(() => {})
      .finally(() => setAnalyticsLoading(false));
  }, [analyticsPeriod]);

  const exportDatesValid = Boolean(exportFrom && exportTo && exportFrom <= exportTo);

  async function downloadExport() {
    if (!exportDatesValid) return;
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/admin/certificates/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          issuedFrom: exportFrom,
          issuedTo: exportTo,
          includeAllRevisions: exportAllRevisions,
          types: exportTypes.length > 0 ? exportTypes : undefined,
          status: ["completed", "issued"],
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("content-disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] || "certificates_export.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Export downloaded", variant: "success" });
    } catch (error) {
      const msg = getApiErrorMessage(error);
      setExportError(msg);
      toast({ title: "Export failed", description: msg, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  // Load jobs - no toast dependency to avoid infinite loop
  const loadJobs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiRequest<Job[] | { ok: boolean; jobs: Job[]; error?: string }>("/api/admin/jobs", { cache: "no-store" });
      // Handle both array response and { ok, jobs } response
      const jobList = Array.isArray(data) ? data : (data.ok ? data.jobs : []);
      setJobs(Array.isArray(jobList) ? jobList : []);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to load jobs");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load certificates for selected job
  const loadCertificates = useCallback(async (selectedJobId: string) => {
    if (!selectedJobId) {
      setCerts([]);
      return;
    }
    setCertLoading(true);
    try {
      const data = await apiRequest<{ ok: boolean; certificates: Certificate[]; error?: string }>(
        `/api/admin/certificates?jobId=${encodeURIComponent(selectedJobId)}`,
        { cache: "no-store" }
      );
      requireOk(data);
      setCerts(Array.isArray(data.certificates) ? data.certificates : []);
    } catch (error) {
      console.error("Failed to load certificates:", error);
      setCerts([]);
    } finally {
      setCertLoading(false);
    }
  }, []);

  // Load jobs only once on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadJobs();
  }, [loadJobs]);

  // Load certificates when jobId changes (not dependent on callback)
  useEffect(() => {
    if (jobId) {
      loadCertificates(jobId);
    } else {
      setCerts([]);
    }
  }, [jobId, loadCertificates]);

  async function createCertificate() {
    if (!jobId) {
      toast({ title: "Choose a job", description: "Select a job before creating a certificate.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest<{ ok: boolean; certificate?: Certificate; error?: string }>("/api/admin/certificates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId, type }),
      });
      requireOk(data);
      toast({ title: "Certificate created", variant: "success" });
      await loadCertificates(jobId);
    } catch (error) {
      toast({ title: "Could not create certificate", description: getApiErrorMessage(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  const selectedJob = useMemo(() => jobs.find((j) => j.id === jobId) ?? null, [jobs, jobId]);

  // Show loading state
  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>Certificates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <LoadingSkeleton className="h-4 w-40" />
                    <LoadingSkeleton className="mt-2 h-3 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <LoadingSkeleton className="h-10 w-full" />
              <LoadingSkeleton className="mt-3 h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error state for database/API errors
  if (loadError) {
    const isDbError = loadError.toLowerCase().includes("database") ||
                      loadError.toLowerCase().includes("table") ||
                      loadError.toLowerCase().includes("does not exist") ||
                      loadError.toLowerCase().includes("prisma");
    return (
      <ErrorState
        title="Unable to load certificates"
        description={isDbError
          ? "This feature requires database configuration. The certificates and jobs tables may not be set up yet."
          : loadError
        }
        helpText="Contact support if this persists: support@quantract.co.uk"
        onRetry={loadJobs}
        showSupport={true}
        action={
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/admin/jobs">
              <Button variant="secondary" type="button">
                <Briefcase className="w-4 h-4 mr-2" />
                Go to Jobs
              </Button>
            </Link>
            <a
              href="https://certificates.quantract.co.uk"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" type="button">
                <ExternalLink className="w-4 h-4 mr-2" />
                Use Standalone Tool
              </Button>
            </a>
          </div>
        }
      />
    );
  }

  // Show empty state when no jobs exist
  if (jobs.length === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Card>
            <CardContent className="pt-6">
              <EmptyState
                icon={BadgeCheck}
                title="No jobs to attach certificates to"
                description="Create a job first, then you can generate and attach BS 7671 certificates (EIC, EICR, MWC) to it. Certificates are stored with the job for easy access."
                features={[
                  "Generate EIC, EICR, and Minor Works certificates",
                  "Link certificates directly to jobs for compliance tracking",
                  "Export professional PDF certificates for clients"
                ]}
                primaryAction={{
                  label: "Create a Job",
                  href: "/admin/jobs"
                }}
                secondaryAction={{
                  label: "Use standalone certificate tool",
                  href: "https://certificates.quantract.co.uk",
                  external: true
                }}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Quick Generate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Need a certificate right now? Use our free standalone tool - no job required.
              </p>
              <a
                href="https://certificates.quantract.co.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button variant="secondary" className="w-full justify-between group">
                  <span className="flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4" />
                    Open Certificate Generator
                  </span>
                  <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Certificate Analytics
            </CardTitle>
            <div className="flex items-center gap-1">
              {(["7", "30", "90"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAnalyticsPeriod(p)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    analyticsPeriod === p
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {p}d
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {analyticsLoading && !analytics ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-[var(--border)] p-4">
                  <LoadingSkeleton className="h-3 w-20 mb-2" />
                  <LoadingSkeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          ) : analytics ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Certificates Issued" value={analytics.totals.issued} />
                <KpiCard
                  label="Unsatisfactory Rate"
                  value={analytics.totals.issued > 0 ? `${Math.round((analytics.totals.unsatisfactory / analytics.totals.issued) * 100)}%` : "—"}
                  sub={analytics.totals.unsatisfactory > 0 ? `${analytics.totals.unsatisfactory} cert${analytics.totals.unsatisfactory !== 1 ? "s" : ""}` : undefined}
                  warn={analytics.totals.unsatisfactory > 0}
                />
                <KpiCard
                  label="FI Outstanding"
                  value={analytics.totals.fi}
                  warn={analytics.totals.fi > 0}
                />
                <KpiCard label="Amendments Created" value={analytics.totals.amendments} />
              </div>

              {analytics.observationStats.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-[var(--muted-foreground)] mb-2">Top Observation Codes</h3>
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--accent)]">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--muted-foreground)]">Code</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted-foreground)]">Count</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted-foreground)]">% of Issued</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.observationStats.map((s) => (
                          <tr key={s.code} className="border-b border-[var(--border)] last:border-0">
                            <td className="px-3 py-2">
                              <Badge variant={s.code === "C1" || s.code === "C2" ? "destructive" : "secondary"}>
                                {s.code}
                              </Badge>
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{s.count}</td>
                            <td className="px-3 py-2 text-right text-[var(--muted-foreground)]">{s.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)]">Unable to load analytics.</p>
          )}
        </CardContent>
      </Card>

    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Certificates</CardTitle>
              <div className="flex items-center gap-2">
                <a
                  href="https://certificates.quantract.co.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="sm" type="button">
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Standalone Tool
                  </Button>
                </a>
                <Button variant="secondary" type="button" onClick={loadJobs} disabled={loading}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Controls row */}
              <div className="flex flex-wrap items-end gap-3">
                <label className="grid gap-1 min-w-[200px] flex-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Choose job</span>
                  <select
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm truncate"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                  >
                    <option value="">Select job...</option>
                    {jobs.map((j) => {
                      const label = j.client?.name || j.clientName || "Unnamed";
                      const site = j.site?.name || j.siteAddress || "";
                      const ref = j.jobNumber || `J-${j.id.slice(0, 8)}`;
                      return (
                        <option key={j.id} value={j.id}>
                          {ref} — {label}{site ? ` — ${site}` : ""} — {j.status}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="grid gap-1 min-w-[140px]">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Certificate type</span>
                  <select
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
                    value={type}
                    onChange={(e) => setType(e.target.value as Certificate["type"])}
                    disabled={!jobId}
                  >
                    <option value="MWC">MWC</option>
                    <option value="EIC">EIC</option>
                    <option value="EICR">EICR</option>
                  </select>
                </label>
                <Button type="button" onClick={createCertificate} disabled={!jobId || busy} className="min-h-[44px] whitespace-nowrap">
                  {busy ? "Creating..." : "Create Certificate"}
                </Button>
              </div>

              {!jobId ? (
                <EmptyState
                  title="Select a job"
                  description="Pick a job above to view its certificates or create a new one."
                />
              ) : certLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                      <LoadingSkeleton className="h-4 w-32" />
                      <LoadingSkeleton className="mt-2 h-3 w-48" />
                    </div>
                  ))}
                </div>
              ) : certs.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No certificates for this job"
                  description="Create the first certificate to start tracking compliance for this job."
                  primaryAction={{
                    label: "Create Certificate",
                    onClick: createCertificate,
                    disabled: busy
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {certs.map((cert) => (
                    <div key={cert.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 hover:border-[var(--primary)]/50 transition-colors">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-[var(--foreground)]">{cert.type}</span>
                            <Badge variant={getStatusBadgeProps("certificate", cert.status).variant}>
                              {getStatusBadgeProps("certificate", cert.status).label}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                            {cert.certificateNumber ? `Ref: ${cert.certificateNumber} - ` : ""}
                            {cert.issuedAtISO
                              ? `Issued ${new Date(cert.issuedAtISO).toLocaleDateString("en-GB")}`
                              : cert.completedAtISO
                                ? `Completed ${new Date(cert.completedAtISO).toLocaleDateString("en-GB")}`
                                : "Draft - Not yet completed"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/certificates/${cert.id}`}>
                            <Button variant="secondary" size="sm" type="button">
                              Open
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ExternalLink className="w-4 h-4" />
              Standalone Tool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Generate certificates without linking to a job. Great for quick one-off certificates.
            </p>
            <a
              href="https://certificates.quantract.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button variant="secondary" className="w-full justify-between group">
                <span className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4" />
                  Open Certificate Generator
                </span>
                <ExternalLink className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>

    {/* Export Bundle — full width below main grid */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Completed Certificates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--muted-foreground)] mb-3">
          Download a regulator-ready ZIP of completed and issued certificates with PDFs, JSON snapshots, and CSV summary.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 min-w-[140px]">
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">Issued from</span>
            <input
              type="date"
              value={exportFrom}
              onChange={(e) => setExportFrom(e.target.value)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 min-w-[140px]">
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">Issued to</span>
            <input
              type="date"
              value={exportTo}
              onChange={(e) => setExportTo(e.target.value)}
              className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </label>
          <label className="grid gap-1 min-w-[140px]">
            <span className="text-xs font-semibold text-[var(--muted-foreground)]">Types (optional)</span>
            <select
              multiple
              value={exportTypes}
              onChange={(e) => setExportTypes(Array.from(e.target.selectedOptions, (o) => o.value))}
              className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm h-20"
            >
              {CERTIFICATE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 cursor-pointer self-center">
            <input
              type="checkbox"
              checked={exportAllRevisions}
              onChange={(e) => setExportAllRevisions(e.target.checked)}
              className="w-4 h-4 accent-[var(--primary)]"
            />
            <span className="text-sm text-[var(--foreground)]">All revisions</span>
          </label>
          <Button type="button" onClick={downloadExport} disabled={exporting || !exportDatesValid} className="min-h-[44px]">
            {exporting ? "Generating..." : "Download Export"}
          </Button>
        </div>
        {exportFrom && exportTo && exportFrom > exportTo && (
          <p className="mt-2 text-xs text-[var(--error)]">&quot;From&quot; date must be before &quot;to&quot; date.</p>
        )}
        {exportError && (
          <p className="mt-2 text-xs text-[var(--error)]">{exportError}</p>
        )}
      </CardContent>
    </Card>
    </div>
  );
}

function KpiCard({ label, value, sub, warn }: { label: string; value: string | number; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${warn ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30" : "border-[var(--border)]"}`}>
      <p className="text-xs font-medium text-[var(--muted-foreground)]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${warn ? "text-amber-600 dark:text-amber-400" : "text-[var(--foreground)]"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{sub}</p>}
    </div>
  );
}
