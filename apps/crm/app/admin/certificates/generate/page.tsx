"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/useToast";
import { apiRequest, getApiErrorMessage, requireOk } from "@/lib/apiClient";
import { AppShell } from "@/components/AppShell";
import {
  ArrowLeft,
  BadgeCheck,
  ExternalLink,
  FileText,
  Briefcase,
  CheckCircle2,
} from "lucide-react";

type Job = {
  id: string;
  clientName: string;
  status: string;
  siteAddress?: string;
};

type CertificateType = "EIC" | "EICR" | "MWC";

const CERTIFICATE_TYPES: { type: CertificateType; name: string; description: string }[] = [
  {
    type: "MWC",
    name: "Minor Works Certificate",
    description: "For additions or alterations to an existing installation that don't require a new EIC",
  },
  {
    type: "EIC",
    name: "Electrical Installation Certificate",
    description: "For new installations or complete rewires - certifies the installation is safe",
  },
  {
    type: "EICR",
    name: "Electrical Installation Condition Report",
    description: "Periodic inspection of an existing installation to verify safety and compliance",
  },
];

export default function GenerateCertificatePage() {
  const router = useRouter();
  const { toast } = useToast();
  const loadedRef = useRef(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedType, setSelectedType] = useState<CertificateType | null>(null);
  const [creating, setCreating] = useState(false);

  // Load jobs
  const loadJobs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiRequest<Job[] | { ok: boolean; jobs: Job[]; error?: string }>("/api/admin/jobs", { cache: "no-store" });
      const jobList = Array.isArray(data) ? data : (data.ok ? data.jobs : []);
      setJobs(Array.isArray(jobList) ? jobList : []);
    } catch (error) {
      const message = getApiErrorMessage(error, "Unable to load jobs");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadJobs();
  }, [loadJobs]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  const handleCreate = async () => {
    if (!selectedJobId || !selectedType) {
      toast({ title: "Missing selection", description: "Please select a job and certificate type.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const data = await apiRequest<{ ok: boolean; certificate?: { id: string }; error?: string }>("/api/admin/certificates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId, type: selectedType }),
      });
      requireOk(data);
      toast({ title: "Certificate created", variant: "success" });

      if (data.certificate?.id) {
        router.push(`/admin/certificates/${data.certificate.id}`);
      } else {
        router.push("/admin/certificates");
      }
    } catch (error) {
      toast({ title: "Could not create certificate", description: getApiErrorMessage(error), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell role="admin" title="Generate Certificate" subtitle="Create a new BS 7671 electrical certificate">
      {/* Back link */}
      <div className="mb-6">
        <Link
          href="/admin/certificates"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Certificates
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Select Job</CardTitle>
            </CardHeader>
            <CardContent>
              <LoadingSkeleton className="h-10 w-full" />
              <LoadingSkeleton className="h-20 w-full mt-4" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Select Certificate Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <LoadingSkeleton className="h-20 w-full" />
                <LoadingSkeleton className="h-20 w-full" />
                <LoadingSkeleton className="h-20 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : loadError ? (
        <ErrorState
          title="Unable to load jobs"
          description={loadError}
          helpText="Contact support if this persists: support@quantract.co.uk"
          onRetry={loadJobs}
          showSupport={true}
          action={
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
          }
        />
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Briefcase}
              title="No jobs available"
              description="Create a job first, then you can generate certificates for it. Jobs help you track which certificates belong to which client and site."
              features={[
                "Link certificates directly to jobs for easy tracking",
                "All job details auto-populate on the certificate",
                "Certificates are stored with the job record"
              ]}
              primaryAction={{
                label: "Create a Job",
                href: "/admin/jobs"
              }}
              secondaryAction={{
                label: "Use standalone tool instead",
                href: "https://certificates.quantract.co.uk",
                external: true
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Step 1: Select Job */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center">1</span>
                Select Job
              </CardTitle>
            </CardHeader>
            <CardContent>
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Job *</span>
                <select
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                >
                  <option value="">Select a job...</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.clientName} - {job.status} ({job.id.slice(0, 8)})
                    </option>
                  ))}
                </select>
              </label>

              {selectedJob && (
                <div className="mt-4 p-4 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[var(--success)] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-semibold text-[var(--foreground)]">{selectedJob.clientName}</div>
                      <div className="text-xs text-[var(--muted-foreground)] mt-1">
                        {selectedJob.siteAddress || "No site address specified"}
                      </div>
                      <Badge variant="secondary" className="mt-2">{selectedJob.status}</Badge>
                    </div>
                  </div>
                </div>
              )}

              <p className="mt-4 text-xs text-[var(--muted-foreground)]">
                The certificate will be linked to this job and include the client details.
              </p>
            </CardContent>
          </Card>

          {/* Step 2: Select Certificate Type */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs font-bold flex items-center justify-center">2</span>
                Select Certificate Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {CERTIFICATE_TYPES.map((cert) => (
                  <button
                    key={cert.type}
                    type="button"
                    onClick={() => setSelectedType(cert.type)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      selectedType === cert.type
                        ? "border-[var(--primary)] bg-[var(--primary)]/5"
                        : "border-[var(--border)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        selectedType === cert.type
                          ? "bg-[var(--primary)] text-white"
                          : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--foreground)]">{cert.type}</span>
                          {selectedType === cert.type && (
                            <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
                          )}
                        </div>
                        <div className="text-xs font-medium text-[var(--primary)] mt-0.5">{cert.name}</div>
                        <p className="text-xs text-[var(--muted-foreground)] mt-1">{cert.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Bar */}
      {!loading && !loadError && jobs.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-[var(--card)] border border-[var(--border)]">
          <div className="text-sm text-[var(--muted-foreground)]">
            {selectedJobId && selectedType ? (
              <span className="text-[var(--foreground)]">
                Ready to create <strong>{selectedType}</strong> for <strong>{selectedJob?.clientName}</strong>
              </span>
            ) : (
              "Select a job and certificate type to continue"
            )}
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://certificates.quantract.co.uk"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="ghost" type="button">
                <ExternalLink className="w-4 h-4 mr-2" />
                Standalone Tool
              </Button>
            </a>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={!selectedJobId || !selectedType || creating}
            >
              <BadgeCheck className="w-4 h-4 mr-2" />
              {creating ? "Creating..." : "Create Certificate"}
            </Button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
