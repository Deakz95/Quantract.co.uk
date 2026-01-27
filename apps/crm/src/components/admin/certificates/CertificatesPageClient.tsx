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

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Certificates</CardTitle>
              <Button variant="secondary" type="button" onClick={loadJobs} disabled={loading}>
                Refresh jobs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <LoadingSkeleton className="h-4 w-40" />
                    <LoadingSkeleton className="mt-2 h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <ErrorState
                title="Unable to load certificates"
                description="This feature requires jobs to be created first. Create your first job to enable certificate generation."
                helpText="Contact support if this persists: support@quantract.co.uk"
                onRetry={loadJobs}
                showSupport={true}
                action={
                  <Link href="/admin/jobs">
                    <Button variant="secondary" type="button">
                      Go to Jobs
                    </Button>
                  </Link>
                }
              />
            ) : jobs.length === 0 ? (
              <EmptyState
                title="No jobs yet"
                description="Jobs create certificate containers. Create a job from a quote first."
                action={
                  <Link href="/admin/jobs">
                    <Button type="button" variant="secondary">
                      Go to jobs
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="space-y-4">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Choose job</span>
                  <select
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                  >
                    <option value="">Select job…</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.clientName} • {j.status} • {j.id}
                      </option>
                    ))}
                  </select>
                </label>

                {!jobId ? (
                  <EmptyState title="Select a job" description="Pick a job to view and manage its certificates." />
                ) : certLoading ? (
                  <div className="text-sm text-[var(--muted-foreground)]">Loading certificates…</div>
                ) : certs.length === 0 ? (
                  <EmptyState
                    title="No certificates for this job"
                    description="Create the first certificate to start tracking compliance."
                    action={
                      <Button type="button" onClick={createCertificate} disabled={busy}>
                        {busy ? "Creating…" : "Create certificate"}
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {certs.map((cert) => (
                      <div key={cert.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-[var(--foreground)]">{cert.type} • {cert.id}</div>
                            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                              {cert.certificateNumber ? `Ref ${cert.certificateNumber} • ` : ""}
                              {cert.issuedAtISO
                                ? `Issued ${new Date(cert.issuedAtISO).toLocaleDateString("en-GB")}`
                                : cert.completedAtISO
                                  ? `Completed ${new Date(cert.completedAtISO).toLocaleDateString("en-GB")}`
                                  : "Draft"}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge>{cert.status}</Badge>
                            <Link href={`/admin/certificates/${cert.id}`}>
                              <Button variant="secondary" type="button">
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
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-4">
        <Card>
          <CardHeader>
            <CardTitle>Create certificate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="text-xs text-[var(--muted-foreground)]">
                {selectedJob ? (
                  <>
                    Selected job: <span className="font-semibold text-[var(--foreground)]">{selectedJob.clientName}</span>
                    {selectedJob.siteAddress ? ` • ${selectedJob.siteAddress}` : ""}
                  </>
                ) : (
                  "Choose a job to enable certificate creation."
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
                {busy ? "Creating…" : "Create certificate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
