"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/useToast";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { certificateIsReadyForCompletion, normalizeCertificateData, signatureIsPresent, getCertificateReviewStatus, type CertificateData, type CertificateType } from "@/lib/certificates";
import { CertificateReviewBanner } from "@/components/certificates/CertificateReviewBanner";
import { CertificateReviewPanel } from "@/components/certificates/CertificateReviewPanel";
import { CertificateIssueHistoryPanel } from "@/components/certificates/CertificateIssueHistoryPanel";
import {
  getReviewRecord,
  isReviewBlockingCompletion,
  canSubmitForReview,
  deriveLifecycleState,
  fromCrmStatus,
  createTypedSignature,
  setSignature,
  getSignature,
  hasSignature as hasSignatureV2,
  getPrefillRecord,
  getFieldSourceLabel,
  isFieldPrefilled,
  isFieldLocked as checkFieldLocked,
  unlockField,
} from "@quantract/shared/certificate-types";

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

/** CRM signature block — shows legacy + V2 signature info */
function CrmSignatureBlock({
  label,
  nameLabel,
  role,
  v2Role,
  data,
  updateDataField,
  sign,
  disabled,
}: {
  label: string;
  nameLabel: string;
  role: "engineer" | "customer";
  v2Role: string;
  data: CertificateData;
  updateDataField: (path: string[], value: string) => void;
  sign: (role: "engineer" | "customer") => void;
  disabled: boolean;
}) {
  const legacySig = data.signatures?.[role];
  const v2Sig = getSignature(data as unknown as Record<string, unknown>, v2Role);
  const isSigned = signatureIsPresent(legacySig) || (v2Sig && v2Sig.signedAtISO);

  const signedDate = v2Sig?.signedAtISO
    ? new Date(v2Sig.signedAtISO).toLocaleString("en-GB")
    : legacySig?.signedAtISO
      ? new Date(legacySig.signedAtISO).toLocaleString("en-GB")
      : null;

  return (
    <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
      <div className="flex items-center gap-2">
        <div className="text-sm font-semibold text-[var(--foreground)]">{label}</div>
        {isSigned && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
            Signed
          </span>
        )}
      </div>
      {/* V2 drawn signature image preview */}
      {v2Sig?.image?.dataUrl && (
        <div className="border border-[var(--border)] rounded-xl p-2 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v2Sig.image.dataUrl} alt="Signature" className="max-h-[60px] mx-auto" />
        </div>
      )}
      {/* V2 typed name preview */}
      {!v2Sig?.image?.dataUrl && v2Sig?.typedName && (
        <div className="border border-[var(--border)] rounded-xl p-2 text-center text-base italic font-serif text-[var(--foreground)]">
          {v2Sig.typedName}
        </div>
      )}
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">{nameLabel}</span>
        <input
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          value={data.signatures?.[role]?.name || ""}
          onChange={(e) => updateDataField(["signatures", role, "name"], e.target.value)}
          disabled={disabled}
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs font-semibold text-[var(--muted-foreground)]">Signature text</span>
        <input
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          value={data.signatures?.[role]?.signatureText || ""}
          onChange={(e) => updateDataField(["signatures", role, "signatureText"], e.target.value)}
          disabled={disabled}
        />
      </label>
      <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
        <span>{signedDate || "Not signed yet"}</span>
        {!isSigned && (
          <Button type="button" variant="secondary" onClick={() => sign(role)} disabled={disabled}>
            Sign
          </Button>
        )}
      </div>
      {v2Sig?.method && (
        <div className="text-[10px] text-[var(--muted-foreground)]">
          Method: {v2Sig.method}{v2Sig.signedByName ? ` — ${v2Sig.signedByName}` : ""}
        </div>
      )}
    </div>
  );
}

/** Field source badge — shows where a pre-filled value came from (CERT-A23) */
function FieldSourceBadge({ data, path }: { data: Record<string, unknown>; path: string }) {
  const record = getPrefillRecord(data);
  const entry = record.sources[path];
  if (!entry || entry.source === "manual") return null;
  const label = getFieldSourceLabel(entry.source);
  return (
    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-medium text-[var(--primary)] opacity-70">
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
      {label}
      {entry.locked && (
        <svg className="w-2.5 h-2.5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )}
    </span>
  );
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
  const [confirmReissue, setConfirmReissue] = useState(false);
  const [reissueReason, setReissueReason] = useState("");
  const [confirmRemoveIndex, setConfirmRemoveIndex] = useState<number | null>(null);
  const [amendmentLineage, setAmendmentLineage] = useState<{ amends: any | null; amendments: any[] }>({ amends: null, amendments: [] });
  const [templateInfo, setTemplateInfo] = useState<{ name: string; version: number } | null>(null);
  const [lastSaveFailed, setLastSaveFailed] = useState(false);
  const skipAutoSave = useRef(true);

  // ── localStorage draft key ──────────────────────────────────
  const draftKey = `cert-draft-${certificateId}`;

  const apiBase = mode === "admin" ? "/api/admin/certificates" : "/api/engineer/certificates";

  const readiness = useMemo(() => (data ? certificateIsReadyForCompletion(data) : { ok: false, missing: [] }), [data]);
  const canIssue = cert?.status === "completed" && mode === "admin";
  const canEdit = cert?.status !== "issued" && cert?.status !== "void";

  // ── Review info (CERT-A20) ──
  const reviewInfo = useMemo(() => {
    if (!cert || !data) return { required: false, blocking: false, record: { reviewStatus: "not_required" as const, reviewHistory: [] as any[], reviewNotes: undefined as string | undefined, reviewedBy: undefined as string | undefined, reviewedAtISO: undefined as string | undefined }, canSubmit: { allowed: false } };
    const d = data as unknown as Record<string, unknown>;
    const info = getCertificateReviewStatus(cert.type, d);
    const record = getReviewRecord(d);
    const lifecycleState = deriveLifecycleState(cert.status, (info.config.required ? cert.type : "EIC") as Parameters<typeof deriveLifecycleState>[1], d);
    const submitCheck = canSubmitForReview(lifecycleState, cert.type as Parameters<typeof canSubmitForReview>[1], d);
    return {
      required: info.required,
      status: info.status,
      blocking: info.required && info.status !== "approved",
      record,
      canSubmit: submitCheck,
    };
  }, [cert, data]);

  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => {
    const basePath = mode === "admin" ? "/admin" : "/engineer";
    const certLabel = cert?.type ? `${cert.type} Certificate` : `Certificate #${certificateId.slice(0, 8)}`;
    return [
      { label: "Dashboard", href: basePath },
      { label: "Certificates", href: `${basePath}/certificates` },
      { label: certLabel },
    ];
  }, [mode, certificateId, cert?.type]);

  // Save draft to localStorage
  const saveDraft = useCallback((certState: Certificate | null, dataState: CertificateData | null, rowsState: TestResultRow[]) => {
    try {
      if (certState && dataState) {
        localStorage.setItem(draftKey, JSON.stringify({ cert: certState, data: dataState, rows: rowsState, savedAt: Date.now() }));
      }
    } catch { /* quota exceeded — ignore */ }
  }, [draftKey]);

  // Clear draft from localStorage (after successful server save)
  const clearDraft = useCallback(() => {
    try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
  }, [draftKey]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${apiBase}/${certificateId}`, { cache: "no-store" });
      const d = await r.json();
      if (d.ok) {
        const nextCert = d.certificate as Certificate;
        const serverData = normalizeCertificateData(nextCert.type, nextCert.data);
        const serverRows = Array.isArray(d.testResults) ? d.testResults : [];

        // Check for a local draft that may be newer
        let usedDraft = false;
        try {
          const raw = localStorage.getItem(draftKey);
          if (raw) {
            const draft = JSON.parse(raw);
            // Use draft if it was saved after the server data and is for the same cert
            if (draft?.data && draft.savedAt && nextCert.status === "draft") {
              setCert({ ...nextCert, inspectorName: draft.cert?.inspectorName ?? nextCert.inspectorName, inspectorEmail: draft.cert?.inspectorEmail ?? nextCert.inspectorEmail, certificateNumber: draft.cert?.certificateNumber ?? nextCert.certificateNumber });
              setData(normalizeCertificateData(nextCert.type, draft.data));
              setRows(Array.isArray(draft.rows) ? draft.rows : serverRows);
              usedDraft = true;
              toast({ title: "Draft restored", description: "Unsaved changes were recovered from your device.", variant: "default" });
            }
          }
        } catch { /* ignore corrupt draft */ }

        if (!usedDraft) {
          setCert(nextCert);
          setRows(serverRows);
          setData(serverData);
          clearDraft();
        }

        setLastSavedAt(null);
        setLastSaveFailed(false);
        skipAutoSave.current = true;
      } else {
        setCert(null);
        setRows([]);
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [apiBase, certificateId, draftKey, clearDraft, toast]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Fetch amendment lineage
  useEffect(() => {
    if (mode !== "admin") return;
    fetch(`${apiBase}/${certificateId}/amendments`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setAmendmentLineage({ amends: d.amends ?? null, amendments: d.amendments ?? [] });
      })
      .catch(() => {});
  }, [apiBase, certificateId, mode]);

  // Fetch template version info for issued certificates
  useEffect(() => {
    if (mode !== "admin" || !cert || cert.status !== "issued") return;
    fetch(`${apiBase}/${certificateId}/revisions`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.revisions) && d.revisions.length > 0) {
          const latest = d.revisions[0];
          if (latest.templateName && latest.templateVersion) {
            setTemplateInfo({ name: latest.templateName, version: latest.templateVersion });
          }
        }
      })
      .catch(() => {});
  }, [apiBase, certificateId, mode, cert?.status]);

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
        setLastSaveFailed(false);
        clearDraft();
      } catch (error: unknown) {
        setLastSaveFailed(true);
        // Persist to localStorage as fallback
        saveDraft(cert, data, rows);
        if (mode === "manual") {
          toast({ title: "Save failed", description: "Changes saved locally on your device. They will retry automatically.", variant: "destructive" });
        }
      } finally {
        if (mode === "manual") setBusy(false);
        setSaving(false);
      }
    },
    [apiBase, certificateId, cert, data, rows, toast, saveDraft, clearDraft]
  );

  useEffect(() => {
    if (!data || !cert) return;
    if (skipAutoSave.current) {
      skipAutoSave.current = false;
      return;
    }
    if (!canEdit) return;
    // Always persist to localStorage immediately as safety net
    saveDraft(cert, data, rows);
    const timer = setTimeout(() => {
      void save("auto");
    }, 900);
    return () => clearTimeout(timer);
  }, [data, rows, cert, canEdit, save, saveDraft]);

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
    // Also write to V2 _signatures for compatibility with offline app
    const v2Role = role === "customer" ? "client" : role === "engineer" ? "inspector" : role;
    const v2Sig = createTypedSignature(name || signatureText);
    const withV2 = setSignature(next as unknown as Record<string, unknown>, v2Role, v2Sig);
    (next as any)._signatures = (withV2 as any)._signatures;
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
      const r = await fetch(`${apiBase}/${certificateId}/reissue`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reissueReason.trim() || undefined }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d?.error || "Reissue failed");
      toast({ title: "Created draft", description: "A new draft certificate was created.", variant: "success" });
      setConfirmReissue(false);
      setReissueReason("");
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

  async function createAmendment() {
    if (!cert || mode !== "admin" || cert.status !== "issued") return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase}/${certificateId}/amend`, { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error(d?.error || "Amendment failed");
      toast({ title: "Amendment created", description: "A new amendment draft has been created.", variant: "success" });
      if (d.amendmentId) {
        window.location.href = `/admin/certificates/${d.amendmentId}`;
      }
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not create amendment."), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function submitForReviewAction() {
    if (!cert) return;
    setBusy(true);
    try {
      const r = await fetch(`${apiBase}/${certificateId}/submit-review`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Submit for review failed");
      toast({ title: "Submitted for review", description: "An office reviewer will be notified.", variant: "success" });
      await refresh();
    } catch (error: unknown) {
      toast({ title: "Error", description: getErrorMessage(error, "Could not submit for review."), variant: "destructive" });
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
      <Breadcrumbs items={breadcrumbItems} />

      {/* Review banner (CERT-A20) */}
      {cert && reviewInfo.required && (
        <CertificateReviewBanner
          reviewStatus={reviewInfo.record.reviewStatus}
          reviewNotes={reviewInfo.record.reviewNotes}
          reviewedBy={reviewInfo.record.reviewedBy}
          reviewedAtISO={reviewInfo.record.reviewedAtISO}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[var(--foreground)]">{cert?.certificateNumber ? `Certificate ${cert.certificateNumber}` : `Certificate #${certificateId.slice(0, 8)}`}</div>
          {cert?.jobId ? (
            <div className="mt-1 text-xs text-[var(--muted-foreground)]">
              Job:{" "}
              <Link className="hover:underline" href={mode === "admin" ? `/admin/jobs/${cert.jobId}` : `/engineer/jobs/${cert.jobId}`}>
                #{cert.jobId.slice(0, 8)}
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
                  {templateInfo ? (
                    <span className="text-xs text-[var(--muted-foreground)]">
                      Template: {templateInfo.name} v{templateInfo.version}
                    </span>
                  ) : null}
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
                  {mode === "admin" && cert.status === "issued" ? (
                    <Button type="button" variant="secondary" onClick={createAmendment} disabled={busy}>
                      Create amendment
                    </Button>
                  ) : null}
                  {mode === "admin" ? (
                    <Button type="button" variant="secondary" onClick={() => setConfirmReissue(true)} disabled={busy}>
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
                  {saving ? "Saving changes…" : lastSaveFailed ? (
                    <span className="text-amber-600 dark:text-amber-400">
                      Save failed — changes saved locally.{" "}
                      <button type="button" className="underline font-semibold" onClick={() => save("manual")}>Retry</button>
                    </span>
                  ) : lastSavedAt ? `Autosaved at ${lastSavedAt}` : "Autosave enabled."}
                </div>
                <div className="flex flex-wrap gap-2">
                  {reviewInfo.canSubmit.allowed && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={submitForReviewAction}
                      disabled={busy || lastSaveFailed}
                    >
                      Submit for review
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={markComplete}
                    disabled={busy || !readiness.ok || reviewInfo.blocking || cert.status === "void" || cert.status === "issued" || lastSaveFailed}
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
              {readiness.ok && reviewInfo.blocking ? (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Review approval required before completion.
                </div>
              ) : null}
            </CardContent>
          </Card>

          {mode === "admin" && (amendmentLineage.amends || amendmentLineage.amendments.length > 0) ? (
            <Card>
              <CardHeader>
                <CardTitle>Amendment Lineage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {amendmentLineage.amends ? (
                  <div>
                    <span className="text-[var(--muted-foreground)]">Amends: </span>
                    <Link className="font-semibold hover:underline" href={`/admin/certificates/${amendmentLineage.amends.id}`}>
                      {amendmentLineage.amends.certificateNumber || amendmentLineage.amends.id.slice(0, 8)}
                    </Link>
                    <Badge className="ml-2">{amendmentLineage.amends.status}</Badge>
                  </div>
                ) : null}
                {amendmentLineage.amendments.length > 0 ? (
                  <div>
                    <span className="text-[var(--muted-foreground)]">Amendments:</span>
                    <ul className="mt-1 space-y-1">
                      {amendmentLineage.amendments.map((a: any) => (
                        <li key={a.id} className="flex items-center gap-2">
                          <Link className="font-semibold hover:underline" href={`/admin/certificates/${a.id}`}>
                            {a.certificateNumber || a.id.slice(0, 8)}
                          </Link>
                          <Badge>{a.status}</Badge>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {new Date(a.createdAt).toLocaleDateString("en-GB")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {/* Review panel (CERT-A20) — visible to admin/office when review is pending */}
          {mode === "admin" && reviewInfo.required && (
            <CertificateReviewPanel
              certificateId={certificateId}
              certType={cert.type}
              data={data as unknown as Record<string, unknown>}
              userRole="admin"
              onReviewComplete={refresh}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 sm:col-span-1">
                <span className="flex items-center text-xs font-semibold text-[var(--muted-foreground)]">
                  Job reference
                  <FieldSourceBadge data={data as unknown as Record<string, unknown>} path="overview.jobReference" />
                </span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.overview.jobReference || ""}
                  onChange={(e) => updateDataField(["overview", "jobReference"], e.target.value)}
                  disabled={busy || !canEdit || checkFieldLocked(data as unknown as Record<string, unknown>, "overview.jobReference")}
                />
              </label>
              <label className="grid gap-1 sm:col-span-1">
                <span className="flex items-center text-xs font-semibold text-[var(--muted-foreground)]">
                  Site name
                  <FieldSourceBadge data={data as unknown as Record<string, unknown>} path="overview.siteName" />
                </span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.overview.siteName || ""}
                  onChange={(e) => updateDataField(["overview", "siteName"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="flex items-center text-xs font-semibold text-[var(--muted-foreground)]">
                  Installation address
                  <FieldSourceBadge data={data as unknown as Record<string, unknown>} path="overview.installationAddress" />
                </span>
                <textarea
                  className="min-h-[90px] rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.overview.installationAddress || ""}
                  onChange={(e) => updateDataField(["overview", "installationAddress"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1 sm:col-span-1">
                <span className="flex items-center text-xs font-semibold text-[var(--muted-foreground)]">
                  Client name
                  <FieldSourceBadge data={data as unknown as Record<string, unknown>} path="overview.clientName" />
                </span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.overview.clientName || ""}
                  onChange={(e) => updateDataField(["overview", "clientName"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1 sm:col-span-1">
                <span className="flex items-center text-xs font-semibold text-[var(--muted-foreground)]">
                  Client email
                  <FieldSourceBadge data={data as unknown as Record<string, unknown>} path="overview.clientEmail" />
                </span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.overview.clientEmail || ""}
                  onChange={(e) => updateDataField(["overview", "clientEmail"], e.target.value)}
                  disabled={busy || !canEdit}
                />
              </label>
              <label className="grid gap-1 sm:col-span-2">
                <span className="flex items-center text-xs font-semibold text-[var(--muted-foreground)]">
                  Job description
                  <FieldSourceBadge data={data as unknown as Record<string, unknown>} path="overview.jobDescription" />
                </span>
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
                <select
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.installation.supplyType || ""}
                  onChange={(e) => updateDataField(["installation", "supplyType"], e.target.value)}
                  disabled={busy || !canEdit}
                >
                  <option value="">Select...</option>
                  <option value="Single phase">Single phase</option>
                  <option value="Three phase">Three phase</option>
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Earthing arrangement</span>
                <select
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm"
                  value={data.installation.earthingArrangement || ""}
                  onChange={(e) => updateDataField(["installation", "earthingArrangement"], e.target.value)}
                  disabled={busy || !canEdit}
                >
                  <option value="">Select...</option>
                  <option value="TN-S">TN-S</option>
                  <option value="TN-C-S">TN-C-S (PME)</option>
                  <option value="TT">TT</option>
                  <option value="IT">IT</option>
                </select>
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
              <CrmSignatureBlock
                label="Engineer signature"
                nameLabel="Engineer name"
                role="engineer"
                v2Role="inspector"
                data={data}
                updateDataField={updateDataField}
                sign={sign}
                disabled={busy || !canEdit}
              />
              <CrmSignatureBlock
                label="Customer signature"
                nameLabel="Customer name"
                role="customer"
                v2Role="client"
                data={data}
                updateDataField={updateDataField}
                sign={sign}
                disabled={busy || !canEdit}
              />

              {!signatureIsPresent(data.signatures?.engineer) && !hasSignatureV2(data as unknown as Record<string, unknown>, "inspector") ||
               !signatureIsPresent(data.signatures?.customer) && !hasSignatureV2(data as unknown as Record<string, unknown>, "client") ? (
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
          {/* Issue & Distribution History (CERT-A24) */}
          {mode === "admin" && (
            <CertificateIssueHistoryPanel
              certificateId={certificateId}
              certStatus={cert.status}
            />
          )}
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
      {/* Reissue with reason dialog (CERT-A24) */}
      <ConfirmDialog
        open={confirmReissue}
        title="Reissue as new certificate?"
        description="A new draft will be created from this certificate. You can optionally provide a reason for re-issuing."
        confirmLabel="Create new draft"
        onCancel={() => { setConfirmReissue(false); setReissueReason(""); }}
        onConfirm={reissueAsNew}
        busy={busy}
      >
        <label className="grid gap-1 mt-3">
          <span className="text-xs font-semibold text-[var(--muted-foreground)]">Reason (optional)</span>
          <textarea
            className="min-h-[60px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            value={reissueReason}
            onChange={(e) => setReissueReason(e.target.value)}
            placeholder="e.g. Client requested corrections to installation address"
          />
        </label>
      </ConfirmDialog>
    </div>
  );
}
