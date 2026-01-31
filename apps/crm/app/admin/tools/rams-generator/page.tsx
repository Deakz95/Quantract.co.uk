"use client";

import { useState, useEffect, useCallback } from "react";
import { ToolPage } from "@/components/tools/ToolPage";
import { HowItWorks } from "@/components/tools/HowItWorks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import {
  type RamsContent,
  type Hazard,
  type MethodStep,
  PPE_OPTIONS,
  PERMIT_OPTIONS,
} from "@/lib/tools/rams-generator/schema";
import { RAMS_TEMPLATES } from "@/lib/tools/rams-generator/templates";

interface RamsDoc {
  id: string;
  title: string;
  status: string;
  version: number;
  type: string;
  createdAt: string;
  updatedAt: string;
  contentJson: RamsContent | null;
}

type View = "list" | "edit";

export default function RamsGeneratorPage() {
  const [view, setView] = useState<View>("list");
  const [docs, setDocs] = useState<RamsDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDoc, setCurrentDoc] = useState<RamsDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<RamsContent>({
    projectName: "",
    projectAddress: "",
    clientName: "",
    startDate: "",
    endDate: "",
    scopeOfWork: "",
    hazards: [{ hazard: "", risk: "medium", persons: "", controls: "", residualRisk: "low" }],
    methodStatements: [{ step: 1, description: "", responsible: "", ppe: "" }],
    emergencyProcedures: "In case of emergency, call 999. First aider on site. Assembly point at site entrance.",
    ppeRequired: ["Safety Boots", "Hi-Vis Vest"],
    toolsAndEquipment: [],
    permits: [],
  });
  const [toolInput, setToolInput] = useState("");

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rams?type=rams&limit=50");
      const json = await res.json();
      if (json.ok) setDocs(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const createFromTemplate = async (templateKey: string) => {
    const tpl = RAMS_TEMPLATES[templateKey];
    if (!tpl) return;
    setError(null);
    try {
      const body = {
        title: tpl.name,
        type: "rams",
        contentJson: {
          projectName: "",
          projectAddress: "",
          clientName: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          ...tpl.content,
        },
      };
      const res = await fetch("/api/admin/rams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.ok) { setError(json.error); return; }
      openDoc(json.data);
    } catch {
      setError("Failed to create document");
    }
  };

  const createBlank = async () => {
    setError(null);
    try {
      const body = {
        title: "New RAMS",
        type: "rams",
        contentJson: {
          projectName: "",
          projectAddress: "",
          clientName: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          scopeOfWork: "",
          hazards: [{ hazard: "", risk: "medium" as const, persons: "", controls: "", residualRisk: "low" as const }],
          methodStatements: [{ step: 1, description: "", responsible: "", ppe: "" }],
          emergencyProcedures: "In case of emergency, call 999. First aider on site. Assembly point at site entrance.",
          ppeRequired: ["Safety Boots", "Hi-Vis Vest"],
          toolsAndEquipment: [],
          permits: [],
        },
      };
      const res = await fetch("/api/admin/rams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!json.ok) { setError(json.error); return; }
      openDoc(json.data);
    } catch {
      setError("Failed to create document");
    }
  };

  const openDoc = (doc: RamsDoc) => {
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
    if (!confirm("Issue this RAMS? Once issued it cannot be edited.")) return;
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

  const backToList = () => {
    setView("list");
    setCurrentDoc(null);
    fetchDocs();
  };

  // Hazard helpers
  const addHazard = () => setContent(c => ({ ...c, hazards: [...c.hazards, { hazard: "", risk: "medium", persons: "", controls: "", residualRisk: "low" }] }));
  const updateHazard = (idx: number, field: keyof Hazard, value: string) =>
    setContent(c => ({ ...c, hazards: c.hazards.map((h, i) => i === idx ? { ...h, [field]: value } : h) }));
  const removeHazard = (idx: number) => setContent(c => ({ ...c, hazards: c.hazards.filter((_, i) => i !== idx) }));

  // Method step helpers
  const addStep = () => setContent(c => ({
    ...c,
    methodStatements: [...c.methodStatements, { step: c.methodStatements.length + 1, description: "", responsible: "", ppe: "" }],
  }));
  const updateStep = (idx: number, field: keyof MethodStep, value: string | number) =>
    setContent(c => ({ ...c, methodStatements: c.methodStatements.map((s, i) => i === idx ? { ...s, [field]: value } : s) }));
  const removeStep = (idx: number) => setContent(c => ({
    ...c,
    methodStatements: c.methodStatements.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 })),
  }));

  // PPE toggle
  const togglePpe = (ppe: string) => setContent(c => ({
    ...c,
    ppeRequired: c.ppeRequired.includes(ppe) ? c.ppeRequired.filter(p => p !== ppe) : [...c.ppeRequired, ppe],
  }));

  // Permit toggle
  const togglePermit = (permit: string) => setContent(c => ({
    ...c,
    permits: c.permits.includes(permit) ? c.permits.filter(p => p !== permit) : [...c.permits, permit],
  }));

  // Tools & equipment
  const addTool = () => {
    if (!toolInput.trim()) return;
    setContent(c => ({ ...c, toolsAndEquipment: [...c.toolsAndEquipment, toolInput.trim()] }));
    setToolInput("");
  };
  const removeTool = (idx: number) => setContent(c => ({ ...c, toolsAndEquipment: c.toolsAndEquipment.filter((_, i) => i !== idx) }));

  const downloadPdf = async () => {
    if (!currentDoc) return;
    try {
      const res = await fetch(`/api/admin/rams/${currentDoc.id}/pdf`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RAMS-v${currentDoc.version}.pdf`;
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
      `RAMS: ${title}`,
      `Status: ${currentDoc.status} v${currentDoc.version}`,
      `Project: ${content.projectName}`,
      `Client: ${content.clientName}`,
      `Address: ${content.projectAddress}`,
      `Dates: ${content.startDate} to ${content.endDate}`,
      `Scope: ${content.scopeOfWork}`,
      `Hazards: ${content.hazards.length}`,
      `Method Steps: ${content.methodStatements.length}`,
      `PPE: ${content.ppeRequired.join(", ")}`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
  };

  if (view === "list") {
    return (
      <ToolPage slug="rams-generator">
        <HowItWorks>
          <p>Create Risk Assessment & Method Statements (RAMS) for electrical work.</p>
          <p>Start from a template or blank. Edit, save as draft, then issue when ready. Issued documents are immutable.</p>
        </HowItWorks>

        <div className="mt-6 space-y-4">
          {error && <div className="p-3 rounded-lg bg-[var(--error)]/10 text-[var(--error)] text-sm">{error}</div>}

          <Card>
            <CardHeader><CardTitle className="text-base">Create New RAMS</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={createBlank}>Blank RAMS</Button>
                {Object.entries(RAMS_TEMPLATES).map(([key, tpl]) => (
                  <Button key={key} variant="secondary" size="sm" onClick={() => createFromTemplate(key)}>{tpl.name}</Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Your RAMS Documents</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
              ) : docs.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No RAMS documents yet. Create one above.</p>
              ) : (
                <div className="space-y-2">
                  {docs.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-[var(--accent)]/5 cursor-pointer" onClick={() => openDoc(doc)}>
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">v{doc.version} — {new Date(doc.updatedAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={doc.status === "issued" ? "default" : doc.status === "draft" ? "secondary" : "outline"}>
                        {doc.status}
                      </Badge>
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
    <ToolPage slug="rams-generator">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={backToList}>&larr; Back to list</Button>
        <div className="flex items-center gap-2">
          {currentDoc && <Badge variant={currentDoc.status === "issued" ? "default" : "secondary"}>{currentDoc.status} v{currentDoc.version}</Badge>}
          {isDraft && (
            <>
              <Button variant="secondary" size="sm" onClick={saveDoc} disabled={saving}>{saving ? "Saving..." : "Save Draft"}</Button>
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
        {/* Title & Project Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Project Details</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Document Title</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} disabled={!isDraft} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Project Name</label>
                  <Input value={content.projectName} onChange={e => setContent(c => ({ ...c, projectName: e.target.value }))} disabled={!isDraft} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Client Name</label>
                  <Input value={content.clientName} onChange={e => setContent(c => ({ ...c, clientName: e.target.value }))} disabled={!isDraft} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Project Address</label>
                <Input value={content.projectAddress} onChange={e => setContent(c => ({ ...c, projectAddress: e.target.value }))} disabled={!isDraft} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Start Date</label>
                  <Input type="date" value={content.startDate} onChange={e => setContent(c => ({ ...c, startDate: e.target.value }))} disabled={!isDraft} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">End Date</label>
                  <Input type="date" value={content.endDate} onChange={e => setContent(c => ({ ...c, endDate: e.target.value }))} disabled={!isDraft} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Scope of Work</label>
                <textarea
                  className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
                  rows={3}
                  value={content.scopeOfWork}
                  onChange={e => setContent(c => ({ ...c, scopeOfWork: e.target.value }))}
                  disabled={!isDraft}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hazards */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Risk Assessment</CardTitle>
              {isDraft && <Button variant="ghost" size="sm" onClick={addHazard}>+ Add Hazard</Button>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {content.hazards.map((h, i) => (
                <div key={i} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-medium text-[var(--muted-foreground)]">Hazard {i + 1}</span>
                    {isDraft && content.hazards.length > 1 && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeHazard(i)}>✕</Button>}
                  </div>
                  <Input placeholder="Hazard" value={h.hazard} onChange={e => updateHazard(i, "hazard", e.target.value)} disabled={!isDraft} />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-[var(--muted-foreground)] mb-1">Initial Risk</label>
                      <select className="w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm" value={h.risk} onChange={e => updateHazard(i, "risk", e.target.value)} disabled={!isDraft}>
                        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--muted-foreground)] mb-1">Residual Risk</label>
                      <select className="w-full rounded-md border bg-[var(--background)] px-2 py-1.5 text-sm" value={h.residualRisk} onChange={e => updateHazard(i, "residualRisk", e.target.value)} disabled={!isDraft}>
                        <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  <Input placeholder="Persons at risk" value={h.persons} onChange={e => updateHazard(i, "persons", e.target.value)} disabled={!isDraft} />
                  <textarea className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm" rows={2} placeholder="Control measures" value={h.controls} onChange={e => updateHazard(i, "controls", e.target.value)} disabled={!isDraft} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Method Statements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Method Statement</CardTitle>
              {isDraft && <Button variant="ghost" size="sm" onClick={addStep}>+ Add Step</Button>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {content.methodStatements.map((s, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="mt-2 text-sm font-medium text-[var(--muted-foreground)] w-6">{s.step}.</span>
                  <div className="flex-1 space-y-1">
                    <textarea className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm" rows={2} placeholder="Description" value={s.description} onChange={e => updateStep(i, "description", e.target.value)} disabled={!isDraft} />
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Responsible" value={s.responsible} onChange={e => updateStep(i, "responsible", e.target.value)} disabled={!isDraft} className="text-xs" />
                      <Input placeholder="PPE required" value={s.ppe} onChange={e => updateStep(i, "ppe", e.target.value)} disabled={!isDraft} className="text-xs" />
                    </div>
                  </div>
                  {isDraft && content.methodStatements.length > 1 && <Button variant="ghost" size="sm" className="h-7 w-7 p-0 mt-1" onClick={() => removeStep(i)}>✕</Button>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PPE, Permits, Equipment */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base">PPE Required</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {PPE_OPTIONS.map(ppe => (
                  <Button
                    key={ppe}
                    variant={content.ppeRequired.includes(ppe) ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => isDraft && togglePpe(ppe)}
                    disabled={!isDraft}
                  >
                    {ppe}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Permits</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {PERMIT_OPTIONS.map(permit => (
                  <Button
                    key={permit}
                    variant={content.permits.includes(permit) ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => isDraft && togglePermit(permit)}
                    disabled={!isDraft}
                  >
                    {permit}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Tools & Equipment</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {content.toolsAndEquipment.map((tool, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-sm flex-1">{tool}</span>
                    {isDraft && <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeTool(i)}>✕</Button>}
                  </div>
                ))}
                {isDraft && (
                  <div className="flex gap-1">
                    <Input value={toolInput} onChange={e => setToolInput(e.target.value)} placeholder="Add tool" className="text-xs" onKeyDown={e => e.key === "Enter" && addTool()} />
                    <Button variant="ghost" size="sm" onClick={addTool}>+</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Procedures */}
        <Card>
          <CardHeader><CardTitle className="text-base">Emergency Procedures</CardTitle></CardHeader>
          <CardContent>
            <textarea
              className="w-full rounded-md border bg-[var(--background)] px-3 py-2 text-sm"
              rows={4}
              value={content.emergencyProcedures}
              onChange={e => setContent(c => ({ ...c, emergencyProcedures: e.target.value }))}
              disabled={!isDraft}
            />
          </CardContent>
        </Card>
      </div>
    </ToolPage>
  );
}
