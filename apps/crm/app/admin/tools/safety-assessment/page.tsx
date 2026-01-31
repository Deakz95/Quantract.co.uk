"use client";

import { useState, useEffect, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import type { SafetyAssessmentContent, CheckCategory, CheckStatus } from "@/lib/tools/safety-assessment/schema";
import { DEFAULT_SAFETY_CATEGORIES } from "@/lib/tools/safety-assessment/templates";

interface SafetyDoc {
  id: string;
  title: string;
  status: string;
  version: number;
  type: string;
  createdAt: string;
  updatedAt: string;
  contentJson: SafetyAssessmentContent | null;
}

type View = "list" | "edit";

export default function SafetyAssessmentPage() {
  const [view, setView] = useState<View>("list");
  const [docs, setDocs] = useState<SafetyDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<SafetyDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<SafetyAssessmentContent>({
    siteName: "",
    siteAddress: "",
    assessorName: "",
    date: new Date().toISOString().split("T")[0],
    categories: DEFAULT_SAFETY_CATEGORIES,
    overallRating: "safe",
    recommendations: [],
  });
  const [recInput, setRecInput] = useState("");

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rams?type=safety-assessment&limit=50");
      const json = await res.json();
      if (json.ok) setDocs(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const createNew = async () => {
    setError(null);
    try {
      const body = {
        title: "Safety Assessment",
        type: "safety-assessment",
        contentJson: {
          siteName: "",
          siteAddress: "",
          assessorName: "",
          date: new Date().toISOString().split("T")[0],
          categories: DEFAULT_SAFETY_CATEGORIES,
          overallRating: "safe" as const,
          recommendations: [],
        },
      };
      const res = await fetch("/api/admin/rams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.ok) { setError(json.error); return; }
      openDoc(json.data);
    } catch {
      setError("Failed to create");
    }
  };

  const openDoc = (doc: SafetyDoc) => {
    setCurrentDoc(doc);
    setTitle(doc.title);
    if (doc.contentJson) setContent(doc.contentJson);
    setView("edit");
  };

  const saveDoc = async () => {
    if (!currentDoc) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rams/${currentDoc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, contentJson: content }),
      });
      const json = await res.json();
      if (!json.ok) { setError(json.error); return; }
      setCurrentDoc(json.data);
    } catch {
      setError("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const issueDoc = async () => {
    if (!currentDoc) return;
    if (!confirm("Issue this assessment? Once issued it cannot be edited.")) return;
    setSaving(true);
    setError(null);
    try {
      await saveDoc();
      const res = await fetch(`/api/admin/rams/${currentDoc.id}/issue`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) { setError(json.error); return; }
      setCurrentDoc(json.data);
      fetchDocs();
    } catch {
      setError("Failed to issue");
    } finally {
      setSaving(false);
    }
  };

  const backToList = () => { setView("list"); setCurrentDoc(null); fetchDocs(); };

  const updateCheck = (catIdx: number, checkIdx: number, field: "status" | "notes", value: string) => {
    setContent(c => ({
      ...c,
      categories: c.categories.map((cat, ci) =>
        ci === catIdx
          ? { ...cat, checks: cat.checks.map((ch, chi) => chi === checkIdx ? { ...ch, [field]: value } : ch) }
          : cat
      ),
    }));
  };

  const statusColor = (s: CheckStatus) =>
    s === "pass" ? "text-green-600" : s === "fail" ? "text-red-600" : "text-[var(--muted-foreground)]";

  const addRec = () => {
    if (!recInput.trim()) return;
    setContent(c => ({ ...c, recommendations: [...c.recommendations, recInput.trim()] }));
    setRecInput("");
  };
  const removeRec = (idx: number) => setContent(c => ({ ...c, recommendations: c.recommendations.filter((_, i) => i !== idx) }));

  // Compute stats
  const allChecks = content.categories.flatMap(c => c.checks);
  const passCount = allChecks.filter(c => c.status === "pass").length;
  const failCount = allChecks.filter(c => c.status === "fail").length;
  const naCount = allChecks.filter(c => c.status === "na").length;

  const downloadPdf = async () => {
    if (!currentDoc) return;
    try {
      const res = await fetch(`/api/admin/rams/${currentDoc.id}/pdf`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Safety-Assessment-v${currentDoc.version}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  const printPdf = async () => {
    if (!currentDoc) return;
    try {
      const res = await fetch(`/api/admin/rams/${currentDoc.id}/pdf`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const w = window.open(url);
      if (w) w.onload = () => { w.focus(); w.print(); };
    } catch { /* ignore */ }
  };

  const copySummary = async () => {
    if (!currentDoc || !content) return;
    const lines = [
      `Safety Assessment: ${title}`,
      `Status: ${currentDoc.status} v${currentDoc.version}`,
      `Site: ${content.siteName}`,
      `Address: ${content.siteAddress}`,
      `Assessor: ${content.assessorName}`,
      `Date: ${content.date}`,
      `Rating: ${content.overallRating}`,
      `Pass: ${passCount} | Fail: ${failCount} | N/A: ${naCount}`,
      ...(content.recommendations.length ? [`Recommendations: ${content.recommendations.join("; ")}`] : []),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
  };

  if (view === "list") {
    return (
      <ToolPage slug="safety-assessment">
        <HowItWorks>
          <p>Site safety assessment checklist for electrical contractors.</p>
          <p>Covers electrical safety, working at height, fire safety, and general site conditions. Issue when complete.</p>
        </HowItWorks>

        <div className="mt-6 space-y-4">
          {error && <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

          <Button variant="secondary" onClick={createNew}>New Assessment</Button>

          <Card>
            <CardHeader><CardTitle className="text-base">Your Assessments</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
              ) : docs.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No assessments yet.</p>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-[var(--accent)]/5 cursor-pointer" onClick={() => openDoc(doc)}>
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">v{doc.version} — {new Date(doc.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={doc.status === "issued" ? "default" : "secondary"}>{doc.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ToolPage>
    );
  }

  const isDraft = currentDoc?.status === "draft";

  return (
    <ToolPage slug="safety-assessment">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={backToList}>&larr; Back</Button>
        <div className="flex items-center gap-2">
          {currentDoc && <Badge variant={currentDoc.status === "issued" ? "default" : "secondary"}>{currentDoc.status} v{currentDoc.version}</Badge>}
          {isDraft && (
            <>
              <Button variant="secondary" size="sm" onClick={saveDoc} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
              <Button size="sm" onClick={issueDoc} disabled={saving}>Issue</Button>
            </>
          )}
          {currentDoc && (
            <>
              <Button variant="outline" size="sm" onClick={downloadPdf}>Download PDF</Button>
              <Button variant="outline" size="sm" onClick={copySummary}>Copy Summary</Button>
              <Button variant="outline" size="sm" onClick={printPdf}>Print</Button>
            </>
          )}
        </div>
      </div>

      {currentDoc && (
        <p className="mb-4 text-xs text-[var(--muted-foreground)]">PDFs aren&apos;t stored in Quantract yet. Download/print and save your copy.</p>
      )}

      {error && <div className="mb-4 p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

      <div className="space-y-4">
        {/* Site Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Site Details</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Document Title</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} disabled={!isDraft} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Site Name</label>
                  <Input value={content.siteName} onChange={e => setContent(c => ({ ...c, siteName: e.target.value }))} disabled={!isDraft} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Assessor</label>
                  <Input value={content.assessorName} onChange={e => setContent(c => ({ ...c, assessorName: e.target.value }))} disabled={!isDraft} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Site Address</label>
                <Input value={content.siteAddress} onChange={e => setContent(c => ({ ...c, siteAddress: e.target.value }))} disabled={!isDraft} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Date</label>
                <Input type="date" value={content.date} onChange={e => setContent(c => ({ ...c, date: e.target.value }))} disabled={!isDraft} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-green-600">{passCount}</p><p className="text-xs text-[var(--muted-foreground)]">Pass</p></CardContent></Card>
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-red-600">{failCount}</p><p className="text-xs text-[var(--muted-foreground)]">Fail</p></CardContent></Card>
          <Card><CardContent className="py-3 text-center"><p className="text-2xl font-bold text-[var(--muted-foreground)]">{naCount}</p><p className="text-xs text-[var(--muted-foreground)]">N/A</p></CardContent></Card>
        </div>

        {/* Checklist */}
        {content.categories.map((cat, catIdx) => (
          <Card key={catIdx}>
            <CardHeader><CardTitle className="text-base">{cat.category}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cat.checks.map((check, checkIdx) => (
                  <div key={checkIdx} className="flex items-start gap-3 py-1.5 border-b last:border-0">
                    <p className="flex-1 text-sm">{check.item}</p>
                    <div className="flex gap-1">
                      {(["pass", "fail", "na"] as const).map(s => (
                        <Button
                          key={s}
                          variant={check.status === s ? "default" : "outline"}
                          size="sm"
                          className={`h-7 w-12 text-xs ${check.status === s ? statusColor(s) : ""}`}
                          onClick={() => isDraft && updateCheck(catIdx, checkIdx, "status", s)}
                          disabled={!isDraft}
                        >
                          {s === "na" ? "N/A" : s.charAt(0).toUpperCase() + s.slice(1)}
                        </Button>
                      ))}
                    </div>
                    {check.status === "fail" && (
                      <Input
                        value={check.notes}
                        onChange={e => updateCheck(catIdx, checkIdx, "notes", e.target.value)}
                        placeholder="Notes"
                        className="w-40 text-xs"
                        disabled={!isDraft}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Overall Rating & Recommendations */}
        <Card>
          <CardHeader><CardTitle className="text-base">Overall Rating</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex gap-2">
                {(["safe", "conditional", "unsafe"] as const).map(r => (
                  <Button
                    key={r}
                    variant={content.overallRating === r ? "default" : "outline"}
                    size="sm"
                    onClick={() => isDraft && setContent(c => ({ ...c, overallRating: r }))}
                    disabled={!isDraft}
                    className={content.overallRating === r ? (r === "safe" ? "text-green-600" : r === "unsafe" ? "text-red-600" : "text-yellow-600") : ""}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Recommendations</label>
                <div className="space-y-1">
                  {content.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-sm flex-1">{rec}</span>
                      {isDraft && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeRec(i)}>✕</Button>}
                    </div>
                  ))}
                  {isDraft && (
                    <div className="flex gap-1">
                      <Input value={recInput} onChange={e => setRecInput(e.target.value)} placeholder="Add recommendation" className="text-xs" onKeyDown={e => e.key === "Enter" && addRec()} />
                      <Button variant="ghost" size="sm" onClick={addRec}>+</Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ToolPage>
  );
}
