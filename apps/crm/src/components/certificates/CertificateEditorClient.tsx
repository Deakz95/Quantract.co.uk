"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { certificateIsReadyForCompletion, normalizeCertificateData, signatureIsPresent, type CertificateData, type CertificateType } from "@/lib/certificates";

type CertificateStatus = "draft" | "completed" | "issued" | "void";

type Certificate = {
  id: string;
  jobId?: string;
  type: CertificateType;
  status: CertificateStatus;
  certificateNumber?: string;
  issuedAtISO?: string;
  completedAtISO?: string;
  inspectorName?: string;
  inspectorEmail?: string;
  pdfKey?: string;
  dataVersion: number;
  data: CertificateData;
};

type TestResultRow = {
  id?: string;
  circuitRef?: string;
  data: Record<string, unknown>;
};

type SaveMode = "manual" | "auto";

type Props = {
  certificateId: string;
  mode: "admin" | "engineer";
};

function getStr(v: unknown) {
  if (v === null || v === undefined) return "";
  return String(v);
}

function getBool(v: unknown) {
  return v === true || v === "true" || v === 1 || v === "1";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

function setNestedValue<T extends Record<string, any>>(obj: T, path: string[], value: string) {
  const next = structuredClone(obj) as T;
  let target: Record<string, any> = next;
  path.slice(0, -1).forEach((key) => {
    if (typeof target[key] !== "object" || target[key] === null) target[key] = {};
    target = target[key];
  });
  target[path[path.length - 1]] = value;
  return next;
}

export default function CertificateEditorClient({ certificateId, mode }: Props) {
  const { toast } = useToast();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [rows, setRows] = useState<TestResultRow[]>([]);
  const [data, setData] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null);
  const skipAutoSave = useRef(true);

  const apiBase = mode === "admin" ? "/api/admin/certificates" : "/api/engineer/certificates";

  const readiness = useMemo(() => (data ? certificateIsReadyForCompletion(data) : { ok: false, missing: [] }), [data]);
  const canIssue = cert?.status === "completed" && mode === "admin";
  const canEdit = cert?.status !== "issued" && cert?.status !== "void";

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/${certificateId}`, { cache: "no-store" });
      const d = await r.json();
      if (d.ok) {
        const nextCert = d.certificate as Certificate;
        setCert(nextCert);
        setRows(Array.isArray(d.testResults) ? d.testResults : []);
        setData(normalizeCertificateData(nextCert.type, nextCert.data));
        setLastSavedAt(null);
        skipAutoSave.current = true;
      } else {
        setCert(null);
        setRows([]);
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, certificateId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (mode: SaveMode) => {
      if (!cert || !data) return;
      if (mode === "manual") setBusy(true);
      setSaving(true);
      try {
        const r = await fetch(`${apiBase}/${certificateId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            certificateNumber: cert.certificateNumber,
            inspectorName: cert.inspectorName,
            inspectorEmail: cert.inspectorEmail,
            type: cert.type,
            data,
            testResults: rows,
          }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Save failed");
        if (mode === "manual") toast({ title: "Saved", description: "Certificate updated.", variant: "success" });
        if (d.certificate) setCert(d.certificate);
        if (Array.isArray(d.testResults)) setRows(d.testResults);
        setLastSavedAt(new Date().toLocaleTimeString("en-GB"));
      } catch (error: unknown) {
        if (mode === "manual") {
          toast({ title: "Error", description: getErrorMessage(error, "Could not save."), variant: "destructive" });
        }
      } finally {
        if (mode === "manual") setBusy(false);
        setSaving(false);
      }
    },
    [apiBase, certificateId, cert, data, rows, toast]
  );

  useEffect(() => {
    if (!data || !cert) return;
    if (skipAutoSave.current) {
      skipAutoSave.current = false;
      return;
    }
    if (!canEdit) return;
    const timer = setTimeout(() => {
      void save("auto");
    }, 900);
    return () => clearTimeout(timer);
  }, [data, rows, cert, canEdit, save]);

  function updateDataField(path: string[], value: string) {
    setData((prev) => (prev ? setNestedValue(prev, path, value) : prev));
  }

  function sign(role: "engineer" | "customer") {
    if (!data) return;
    const name = data.signatures?.[role]?.name || (role === "engineer" ? cert?.inspectorName : data.overview.clientName) || "";
    const signatureText = data.signatures?.[role]?.signatureText || name;
    const next = structuredClone(data);
    next.signatures = {
      ...next.signatures,
      [role]: {
        name,
        signatureText,
        signedAtISO: new Date().toISOString(),
      },
    };
    setData(next);
  }

  async function markComplete() {
    if (!cert) return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase}/${certificateId}/complete`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Complete failed");
      toast({ title: "Completed", description: "Certificate marked as completed.", variant: "success" });
      if (d.certificate) setCert(d.certificate);
      await refresh();
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not complete."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function issue() {
    if (!cert || mode !== "admin") return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase}/${certificateId}/issue`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Issue failed");
      toast({ title: "Issued", description: "PDF generated and certificate marked as issued.", variant: "success" });
      await refresh();
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not issue."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function voidCert() {
    if (!cert || mode !== "admin") return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase}/${certificateId}/void`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d?.error || "Void failed");
      toast({ title: "Voided", description: "Certificate marked as void.", variant: "success" });
      await refresh();
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not void."), variant: "destructive" });
    } finally {
      setBusy(false);
      setConfirmVoid(false);
    }
  }

  async function reissueAsNew() {
    if (!cert || mode !== "admin") return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase}/${certificateId}/reissue`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d?.error || "Reissue failed");
      toast({ title: "Created draft", description: "A new draft certificate was created.", variant: "success" });
      if (d.certificate?.id) {
        window.location.href = `/admin/certificates/${d.certificate.id}`;
      } else {
        await refresh();
      }
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not reissue."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function addRow() {
    setRows((prev) => [...prev, { circuitRef: "", data: {} }]);
  }

  function setRow(i: number, patch: Partial<TestResultRow>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function removeRow(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--foreground)]">Certificate {certificateId}</div>
          {cert?.jobId ? (
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
              Job:{" "}
              <Link className="hover:underline" href={mode === "admin" ? `/admin/jobs/${cert.jobId}` : `/engineer/jobs/${cert.jobId}`}>
                {cert.jobId}
              </Link>
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={refresh} disabled={busy}>
            Refresh
          </Button>
          <Button type="button" onClick={() => save("manual")} disabled={busy || loading || !cert}>
            Save
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
      ) : !cert || !data ? (
        <div className="text-sm text-[var(--muted-foreground)]">Not found.</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Header</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{cert.status}</Badge>
                  {cert.pdfKey && mode === "admin" ? (
                    <a className="text-sm font-semibold text-[var(--foreground)] hover:underline" href={`/api/admin/certificates/${certificateId}/pdf`} target="_blank" rel="noreferrer">
                      View PDF
                    </a>
                  ) : null}
                  {mode === "admin" && cert.status !== "void" ? (
                    <Button type="button" variant="secondary" onClick={() => setConfirmVoid(true)} disabled={busy}>
                      Void
                    </Button>
                  ) : null}
                  {mode === "admin" ? (
                    <Button type="button" variant="secondary" onClick={reissueAsNew} disabled={busy}>
                      Reissue as new
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Type</span>
                  <select
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                    value={cert.type}
                    onChange={(e) => {
                      const nextType = e.target.value as CertificateType;
                      setCert((p) => (p ? { ...p, type: nextType } : p));
                      setData(normalizeCertificateData(nextType, data));
                    }}
                    disabled={busy || !canEdit}
                  >
                    <option value="MWC">MWC</option>
                    <option value="EIC">EIC</option>
                    <option value="EICR">EICR</option>
                  </select>
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Certificate number (optional)</span>
                  <input
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                    value={cert.certificateNumber || ""}
                    onChange={(e) => setCert((p) => (p ? { ...p, certificateNumber: e.target.value } : p))}
                    placeholder="e.g. EIC-2026-0001"
                    disabled={busy || !canEdit}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Inspector name</span>
                  <input
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                    value={cert.inspectorName || ""}
                    onChange={(e) => setCert((p) => (p ? { ...p, inspectorName: e.target.value } : p))}
                    placeholder="e.g. Callum Deakin"
                    disabled={busy || !canEdit}
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Inspector email</span>
                  <input
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                    value={cert.inspectorEmail || ""}
                    onChange={(e) => setCert((p) => (p ? { ...p, inspectorEmail: e.target.value } : p))}
                    placeholder="inspector@example.com"
                    disabled={busy || !canEdit}
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[var(--muted-foreground)]">
                  {saving ? "Saving changes…" : lastSavedAt ? `Autosaved at ${lastSavedAt}` : "Autosave enabled."}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={markComplete}
                    disabled={busy || !readiness.ok || cert.status === "void" || cert.status === "issued"}
                  >
                    Mark complete
                  </Button>
                  {mode === "admin" ? (
                    <Button type="button" onClick={issue} disabled={busy || !canIssue}>
                      Issue PDF
                    </Button>
                  ) : null}
                </div>
              </div>

              {!readiness.ok ? (
                <div className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Missing: {readiness.missing.join(", ")}.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 sm:col-span-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Job reference</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.overview.jobReference || ""}
                  onChange={(e) => updateDataField(["overview", "jobReference"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1 sm:col-span-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Site name</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.overview.siteName || ""}
                  onChange={(e) => updateDataField(["overview", "siteName"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Installation address</span>
                <textarea
                  className="min-h-[90px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.overview.installationAddress || ""}
                  onChange={(e) => updateDataField(["overview", "installationAddress"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1 sm:col-span-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Client name</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.overview.clientName || ""}
                  onChange={(e) => updateDataField(["overview", "clientName"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1 sm:col-span-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Client email</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.overview.clientEmail || ""}
                  onChange={(e) => updateDataField(["overview", "clientEmail"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Job description</span>
                <textarea
                  className="min-h-[90px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.overview.jobDescription || ""}
                  onChange={(e) => updateDataField(["overview", "jobDescription"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Installation details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Description of work</span>
                <textarea
                  className="min-h-[90px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.installation.descriptionOfWork || ""}
                  onChange={(e) => updateDataField(["installation", "descriptionOfWork"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Supply type</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.installation.supplyType || ""}
                  onChange={(e) => updateDataField(["installation", "supplyType"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Earthing arrangement</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.installation.earthingArrangement || ""}
                  onChange={(e) => updateDataField(["installation", "earthingArrangement"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Distribution type</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.installation.distributionType || ""}
                  onChange={(e) => updateDataField(["installation", "distributionType"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Max demand</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.installation.maxDemand || ""}
                  onChange={(e) => updateDataField(["installation", "maxDemand"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inspection & assessment</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Limitations</span>
                <textarea
                  className="min-h-[90px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.inspection.limitations || ""}
                  onChange={(e) => updateDataField(["inspection", "limitations"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Observations</span>
                <textarea
                  className="min-h-[90px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.inspection.observations || ""}
                  onChange={(e) => updateDataField(["inspection", "observations"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Next inspection date</span>
                <input
                  type="date"
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.inspection.nextInspectionDate || ""}
                  onChange={(e) => updateDataField(["inspection", "nextInspectionDate"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              {cert.type === "EICR" ? (
                <>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Overall assessment</span>
                    <input
                      className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                      value={data.assessment.overallAssessment || ""}
                      onChange={(e) => updateDataField(["assessment", "overallAssessment"], e.target.value)}
                      disabled={busy || !canEdit}
                    />
                  </label>
                  <label className="grid gap-1 sm:col-span-2">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Recommendations</span>
                    <textarea
                      className="min-h-[90px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                      value={data.assessment.recommendations || ""}
                      onChange={(e) => updateDataField(["assessment", "recommendations"], e.target.value)}
                      disabled={busy || !canEdit}
                    />
                  </label>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Declarations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Extent of work</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.declarations.extentOfWork || ""}
                  onChange={(e) => updateDataField(["declarations", "extentOfWork"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Works tested</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.declarations.worksTested || ""}
                  onChange={(e) => updateDataField(["declarations", "worksTested"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Comments</span>
                <textarea
                  className="min-h-[90px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.declarations.comments || ""}
                  onChange={(e) => updateDataField(["declarations", "comments"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signatures</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="text-sm font-semibold text-[var(--foreground)]">Engineer signature</div>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Engineer name</span>
                  <input
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    value={data.signatures?.engineer?.name || ""}
                    onChange={(e) => updateDataField(["signatures", "engineer", "name"], e.target.value)}
                    disabled={busy || !canEdit}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Signature text</span>
                  <input
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    value={data.signatures?.engineer?.signatureText || ""}
                    onChange={(e) => updateDataField(["signatures", "engineer", "signatureText"], e.target.value)}
                    disabled={busy || !canEdit}
                  />
                </label>
                <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                  <span>{data.signatures?.engineer?.signedAtISO ? new Date(data.signatures.engineer.signedAtISO).toLocaleString("en-GB") : "Not signed yet"}</span>
                  <Button type="button" variant="secondary" onClick={() => sign("engineer")} disabled={busy || !canEdit}>
                    Sign
                  </Button>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="text-sm font-semibold text-[var(--foreground)]">Customer signature</div>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Customer name</span>
                  <input
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    value={data.signatures?.customer?.name || ""}
                    onChange={(e) => updateDataField(["signatures", "customer", "name"], e.target.value)}
                    disabled={busy || !canEdit}
                  />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Signature text</span>
                  <input
                    className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    value={data.signatures?.customer?.signatureText || ""}
                    onChange={(e) => updateDataField(["signatures", "customer", "signatureText"], e.target.value)}
                    disabled={busy || !canEdit}
                  />
                </label>
                <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                  <span>{data.signatures?.customer?.signedAtISO ? new Date(data.signatures.customer.signedAtISO).toLocaleString("en-GB") : "Not signed yet"}</span>
                  <Button type="button" variant="secondary" onClick={() => sign("customer")} disabled={busy || !canEdit}>
                    Sign
                  </Button>
                </div>
              </div>

              {!signatureIsPresent(data.signatures?.engineer) || !signatureIsPresent(data.signatures?.customer) ? (
                <div className="sm:col-span-2 text-xs text-[var(--muted-foreground)]">
                  Both signatures are required before completion.
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Test results</CardTitle>
                <Button type="button" variant="secondary" onClick={addRow} disabled={busy || !canEdit}>
                  Add row
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <div className="text-sm text-[var(--muted-foreground)]">No test results yet.</div>
              ) : (
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={r.id || i} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                      <div className="grid gap-2 sm:grid-cols-12">
                        <label className="grid gap-1 sm:col-span-3">
                          <span className="text-xs font-semibold text-[var(--muted-foreground)]">Circuit ref</span>
                          <input
                            className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                            value={r.circuitRef || ""}
                            onChange={(e) => setRow(i, { circuitRef: e.target.value })}
                            placeholder="e.g. L1"
                            disabled={busy || !canEdit}
                          />
                        </label>

                        <div className="grid gap-2 sm:col-span-8">
                          <div className="text-xs font-semibold text-[var(--muted-foreground)]">Results</div>
                          {cert.type === "EICR" ? (
                            <div className="grid gap-2 sm:grid-cols-3">
                              <label className="grid gap-1">
                                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Code</span>
                                <select
                                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                                  value={getStr(r.data?.code)}
                                  onChange={(e) => setRow(i, { data: { ...(r.data || {}), code: e.target.value } })}
                                  disabled={busy || !canEdit}
                                >
                                  <option value="">Select…</option>
                                  <option value="C1">C1</option>
                                  <option value="C2">C2</option>
                                  <option value="C3">C3</option>
                                  <option value="FI">FI</option>
                                </select>
                              </label>
                              <label className="grid gap-1 sm:col-span-2">
                                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Observation</span>
                                <input
                                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                                  value={getStr(r.data?.observation)}
                                  onChange={(e) => setRow(i, { data: { ...(r.data || {}), observation: e.target.value } })}
                                  placeholder="Describe the issue / note"
                                  disabled={busy || !canEdit}
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-5">
                              <label className="grid gap-1">
                                <span className="text-xs font-semibold text-[var(--muted-foreground)]">R1+R2 (Ω)</span>
                                <input
                                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                                  value={getStr(r.data?.r1r2)}
                                  onChange={(e) => setRow(i, { data: { ...(r.data || {}), r1r2: e.target.value } })}
                                  disabled={busy || !canEdit}
                                />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Zs (Ω)</span>
                                <input
                                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                                  value={getStr(r.data?.zs)}
                                  onChange={(e) => setRow(i, { data: { ...(r.data || {}), zs: e.target.value } })}
                                  disabled={busy || !canEdit}
                                />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-xs font-semibold text-[var(--muted-foreground)]">IR (MΩ)</span>
                                <input
                                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                                  value={getStr(r.data?.ir_mohm)}
                                  onChange={(e) => setRow(i, { data: { ...(r.data || {}), ir_mohm: e.target.value } })}
                                  disabled={busy || !canEdit}
                                />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-xs font-semibold text-[var(--muted-foreground)]">RCD (ms)</span>
                                <input
                                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                                  value={getStr(r.data?.rcd_trip_ms)}
                                  onChange={(e) => setRow(i, { data: { ...(r.data || {}), rcd_trip_ms: e.target.value } })}
                                  disabled={busy || !canEdit}
                                />
                              </label>
                              <label className="flex items-end gap-2">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={getBool(r.data?.polarity)}
                                  onChange={(e) => setRow(i, { data: { ...(r.data || {}), polarity: e.target.checked } })}
                                  disabled={busy || !canEdit}
                                />
                                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Polarity OK</span>
                              </label>
                            </div>
                          )}

                          <div className="text-xs text-[var(--muted-foreground)]">Stored as JSON under the hood; this UI keeps it consistent.</div>
                        </div>

                        <div className="sm:col-span-1 flex items-end justify-end">
                          <Button type="button" variant="secondary" onClick={() => setConfirmRemoveIndex(i)} disabled={busy || !canEdit}>
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <ConfirmDialog
        open={confirmVoid}
        title="Void certificate?"
        description="This certificate will be marked as void and cannot be issued."
        confirmLabel="Void certificate"
        onCancel={() => setConfirmVoid(false)}
        onConfirm={voidCert}
        busy={busy}
      />
      <ConfirmDialog
        open={confirmRemoveIndex !== null}
        title="Remove test result row?"
        description="This will remove the row from the certificate draft."
        confirmLabel="Remove row"
        onCancel={() => setConfirmRemoveIndex(null)}
        onConfirm={() => {
          if (confirmRemoveIndex !== null) removeRow(confirmRemoveIndex);
          setConfirmRemoveIndex(null);
        }}
        busy={busy}
      />
    </div>
  );
}
