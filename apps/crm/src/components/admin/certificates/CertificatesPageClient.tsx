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
import { BadgeCheck, Plus, ExternalLink, FileText, Briefcase } from "lucide-react";

type Job = { id: string; clientName: string; status: string; siteAddress?: string };

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
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Choose job</span>
                <select
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                >
                  <option value="">Select job...</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.clientName} - {j.status} ({j.id.slice(0, 8)})
                    </option>
                  ))}
                </select>
              </label>

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
                            <Badge variant={cert.status === "issued" ? "success" : cert.status === "completed" ? "secondary" : "outline"}>
                              {cert.status}
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
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Certificate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="text-xs text-[var(--muted-foreground)]">
                {selectedJob ? (
                  <>
                    Selected job: <span className="font-semibold text-[var(--foreground)]">{selectedJob.clientName}</span>
                    {selectedJob.siteAddress ? ` - ${selectedJob.siteAddress}` : ""}
                  </>
                ) : (
                  "Choose a job above to enable certificate creation."
                )}
              </div>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Certificate type</span>
                <select
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as Certificate["type"])}
                  disabled={!jobId}
                >
                  <option value="MWC">Minor Works Certificate (MWC)</option>
                  <option value="EIC">Electrical Installation Certificate (EIC)</option>
                  <option value="EICR">Electrical Installation Condition Report (EICR)</option>
                </select>
              </label>
              <Button type="button" onClick={createCertificate} disabled={!jobId || busy}>
                {busy ? "Creating..." : "Create Certificate"}
              </Button>
            </div>
          </CardContent>
        </Card>

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
  );
}
