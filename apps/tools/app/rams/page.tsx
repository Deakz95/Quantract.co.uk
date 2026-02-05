"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { RamsContent, Hazard, MethodStep, RiskLevel } from "../../lib/ramsSchema";
import { PPE_OPTIONS, PERMIT_OPTIONS } from "../../lib/ramsSchema";
import { RAMS_TEMPLATES } from "../../lib/ramsTemplates";
import { renderRamsPdf } from "../../lib/ramsPdf";
import { saveOutput } from "../../lib/savedOutputs";

const EMPTY_HAZARD: Hazard = { hazard: "", risk: "medium", persons: "", controls: "", residualRisk: "low" };
const EMPTY_STEP: MethodStep = { step: 1, description: "", responsible: "", ppe: "" };

const RISK_COLORS: Record<RiskLevel, string> = { low: "var(--success)", medium: "#f59e0b", high: "var(--error)" };

function defaultContent(): RamsContent {
  return {
    projectName: "",
    projectAddress: "",
    clientName: "",
    startDate: "",
    endDate: "",
    scopeOfWork: "",
    hazards: [{ ...EMPTY_HAZARD }],
    methodStatements: [{ ...EMPTY_STEP, step: 1 }],
    emergencyProcedures: "",
    ppeRequired: [],
    toolsAndEquipment: [],
    permits: [],
  };
}

// Shared inline styles
const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  marginBottom: "16px",
};
const cardHeaderStyle: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--border)",
  fontWeight: 700,
  fontSize: "14px",
};
const cardContentStyle: React.CSSProperties = { padding: "16px" };
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--muted)",
  border: "1px solid var(--border)",
  borderRadius: "6px",
  fontSize: "14px",
  color: "var(--foreground)",
  outline: "none",
  minHeight: "44px",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--muted-foreground)",
  marginBottom: "4px",
  display: "block",
};
const btnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "8px",
  border: "none",
  cursor: "pointer",
  fontSize: "13px",
  fontWeight: 600,
  minHeight: "44px",
};

export default function RamsBuilderPage() {
  const [content, setContent] = useState<RamsContent>(defaultContent);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customTool, setCustomTool] = useState("");

  const set = <K extends keyof RamsContent>(key: K, val: RamsContent[K]) => {
    setContent((prev) => ({ ...prev, [key]: val }));
  };

  // Template loading
  const loadTemplate = (templateKey: string) => {
    const tpl = RAMS_TEMPLATES[templateKey];
    if (!tpl) return;
    setContent((prev) => ({
      ...prev,
      ...tpl.content,
    }));
  };

  // Hazard management
  const updateHazard = (idx: number, field: keyof Hazard, val: string) => {
    setContent((prev) => {
      const hazards = [...prev.hazards];
      hazards[idx] = { ...hazards[idx], [field]: val };
      return { ...prev, hazards };
    });
  };
  const addHazard = () => set("hazards", [...content.hazards, { ...EMPTY_HAZARD }]);
  const removeHazard = (idx: number) => {
    if (content.hazards.length <= 1) return;
    set("hazards", content.hazards.filter((_, i) => i !== idx));
  };

  // Method step management
  const updateStep = (idx: number, field: keyof MethodStep, val: string | number) => {
    setContent((prev) => {
      const steps = [...prev.methodStatements];
      steps[idx] = { ...steps[idx], [field]: val };
      return { ...prev, methodStatements: steps };
    });
  };
  const addStep = () => {
    const nextNum = content.methodStatements.length + 1;
    set("methodStatements", [...content.methodStatements, { ...EMPTY_STEP, step: nextNum }]);
  };
  const removeStep = (idx: number) => {
    if (content.methodStatements.length <= 1) return;
    const filtered = content.methodStatements.filter((_, i) => i !== idx).map((s, i) => ({ ...s, step: i + 1 }));
    set("methodStatements", filtered);
  };

  // PPE/Permits toggle
  const toggleArrayItem = (key: "ppeRequired" | "permits", item: string) => {
    setContent((prev) => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item] };
    });
  };

  // Tools & Equipment management
  const addTool = () => {
    const val = customTool.trim();
    if (!val || content.toolsAndEquipment.includes(val)) return;
    set("toolsAndEquipment", [...content.toolsAndEquipment, val]);
    setCustomTool("");
  };
  const removeTool = (idx: number) => {
    set("toolsAndEquipment", content.toolsAndEquipment.filter((_, i) => i !== idx));
  };

  // PDF export
  const handleExportPdf = useCallback(async () => {
    setGenerating(true);
    try {
      const bytes = await renderRamsPdf(content);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RAMS - ${content.projectName || "Untitled"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please check all fields are filled.");
    } finally {
      setGenerating(false);
    }
  }, [content]);

  // Save to localStorage
  const handleSave = () => {
    saveOutput(
      "rams",
      `RAMS — ${content.projectName || "Untitled"}`,
      { projectName: content.projectName, clientName: content.clientName },
      { hazardCount: content.hazards.length, stepCount: content.methodStatements.length, ppeCount: content.ppeRequired.length }
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isValid = content.projectName && content.hazards.length > 0 && content.methodStatements.length > 0;

  return (
    <main style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Link href="/" style={{ color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>
          <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 style={{ fontSize: "16px", fontWeight: 700, margin: 0, flex: 1 }}>RAMS Builder</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handleSave}
            style={{ ...btnStyle, background: saved ? "var(--success)" : "transparent", border: "1px solid var(--border)", color: saved ? "#fff" : "var(--foreground)" }}
          >
            {saved ? "Saved!" : "Save"}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={!isValid || generating}
            style={{
              ...btnStyle,
              background: isValid ? "var(--primary)" : "var(--muted)",
              color: isValid ? "#fff" : "var(--muted-foreground)",
              opacity: generating ? 0.6 : 1,
            }}
          >
            {generating ? "Generating…" : "Export PDF"}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px 20px" }}>
        {/* Template selector */}
        <div style={{ ...cardStyle }}>
          <div style={cardHeaderStyle}>Start from a Template</div>
          <div style={{ ...cardContentStyle, display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {Object.entries(RAMS_TEMPLATES).map(([key, tpl]) => (
              <button
                key={key}
                onClick={() => loadTemplate(key)}
                style={{
                  ...btnStyle,
                  background: "var(--muted)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                {tpl.name}
              </button>
            ))}
            <button
              onClick={() => setContent(defaultContent())}
              style={{
                ...btnStyle,
                background: "transparent",
                color: "var(--muted-foreground)",
                border: "1px solid var(--border)",
              }}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Project Details */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Project Details</div>
          <div style={cardContentStyle}>
            <div className="cable-calc-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Project Name *</label>
                <input style={inputStyle} value={content.projectName} onChange={(e) => set("projectName", e.target.value)} placeholder="e.g. Office Rewire Phase 2" />
              </div>
              <div>
                <label style={labelStyle}>Client Name</label>
                <input style={inputStyle} value={content.clientName} onChange={(e) => set("clientName", e.target.value)} placeholder="e.g. ABC Property Ltd" />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Project Address</label>
                <input style={inputStyle} value={content.projectAddress} onChange={(e) => set("projectAddress", e.target.value)} placeholder="Full site address" />
              </div>
              <div>
                <label style={labelStyle}>Start Date</label>
                <input type="date" style={inputStyle} value={content.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>End Date</label>
                <input type="date" style={inputStyle} value={content.endDate} onChange={(e) => set("endDate", e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        {/* Scope of Work */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Scope of Work</div>
          <div style={cardContentStyle}>
            <textarea
              style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }}
              value={content.scopeOfWork}
              onChange={(e) => set("scopeOfWork", e.target.value)}
              placeholder="Describe the work to be carried out..."
            />
          </div>
        </div>

        {/* Hazard Assessment */}
        <div style={cardStyle}>
          <div style={{ ...cardHeaderStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Hazard Assessment ({content.hazards.length})</span>
            <button onClick={addHazard} style={{ ...btnStyle, padding: "6px 12px", background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
              + Add Hazard
            </button>
          </div>
          <div style={cardContentStyle}>
            {content.hazards.map((h, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: idx < content.hazards.length - 1 ? "12px" : 0,
                  background: "var(--background)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted-foreground)" }}>Hazard {idx + 1}</span>
                  {content.hazards.length > 1 && (
                    <button
                      onClick={() => removeHazard(idx)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", fontSize: "12px", fontWeight: 600 }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  <input style={inputStyle} value={h.hazard} onChange={(e) => updateHazard(idx, "hazard", e.target.value)} placeholder="Hazard description" />
                  <div className="cable-calc-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div>
                      <label style={labelStyle}>Initial Risk</label>
                      <select
                        style={{ ...inputStyle, color: RISK_COLORS[h.risk] }}
                        value={h.risk}
                        onChange={(e) => updateHazard(idx, "risk", e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Residual Risk</label>
                      <select
                        style={{ ...inputStyle, color: RISK_COLORS[h.residualRisk] }}
                        value={h.residualRisk}
                        onChange={(e) => updateHazard(idx, "residualRisk", e.target.value)}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                  </div>
                  <input style={inputStyle} value={h.persons} onChange={(e) => updateHazard(idx, "persons", e.target.value)} placeholder="Persons at risk" />
                  <textarea
                    style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
                    value={h.controls}
                    onChange={(e) => updateHazard(idx, "controls", e.target.value)}
                    placeholder="Control measures"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Method Statement */}
        <div style={cardStyle}>
          <div style={{ ...cardHeaderStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Method Statement ({content.methodStatements.length} steps)</span>
            <button onClick={addStep} style={{ ...btnStyle, padding: "6px 12px", background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
              + Add Step
            </button>
          </div>
          <div style={cardContentStyle}>
            {content.methodStatements.map((s, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: idx < content.methodStatements.length - 1 ? "12px" : 0,
                  background: "var(--background)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--muted-foreground)" }}>Step {idx + 1}</span>
                  {content.methodStatements.length > 1 && (
                    <button
                      onClick={() => removeStep(idx)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--error)", fontSize: "12px", fontWeight: 600 }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gap: "8px" }}>
                  <textarea
                    style={{ ...inputStyle, minHeight: "60px", resize: "vertical" }}
                    value={s.description}
                    onChange={(e) => updateStep(idx, "description", e.target.value)}
                    placeholder="Step description"
                  />
                  <div className="cable-calc-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <input style={inputStyle} value={s.responsible} onChange={(e) => updateStep(idx, "responsible", e.target.value)} placeholder="Responsible person/role" />
                    <input style={inputStyle} value={s.ppe} onChange={(e) => updateStep(idx, "ppe", e.target.value)} placeholder="PPE for this step" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PPE Required */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>PPE Required</div>
          <div style={{ ...cardContentStyle, display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PPE_OPTIONS.map((item) => {
              const selected = content.ppeRequired.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggleArrayItem("ppeRequired", item)}
                  style={{
                    ...btnStyle,
                    padding: "8px 14px",
                    background: selected ? "var(--primary)" : "var(--muted)",
                    color: selected ? "#fff" : "var(--foreground)",
                    border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Permits */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Permits Required</div>
          <div style={{ ...cardContentStyle, display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {PERMIT_OPTIONS.map((item) => {
              const selected = content.permits.includes(item);
              return (
                <button
                  key={item}
                  onClick={() => toggleArrayItem("permits", item)}
                  style={{
                    ...btnStyle,
                    padding: "8px 14px",
                    background: selected ? "var(--primary)" : "var(--muted)",
                    color: selected ? "#fff" : "var(--foreground)",
                    border: `1px solid ${selected ? "var(--primary)" : "var(--border)"}`,
                    transition: "all 0.15s",
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tools & Equipment */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Tools & Equipment</div>
          <div style={cardContentStyle}>
            <div style={{ display: "flex", gap: "8px", marginBottom: content.toolsAndEquipment.length > 0 ? "12px" : 0 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={customTool}
                onChange={(e) => setCustomTool(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTool()}
                placeholder="Add a tool or equipment item"
              />
              <button onClick={addTool} style={{ ...btnStyle, background: "var(--muted)", color: "var(--foreground)", border: "1px solid var(--border)" }}>
                Add
              </button>
            </div>
            {content.toolsAndEquipment.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {content.toolsAndEquipment.map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "var(--muted)",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  >
                    {t}
                    <button
                      onClick={() => removeTool(idx)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: "16px", lineHeight: 1, padding: 0 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Emergency Procedures */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>Emergency Procedures</div>
          <div style={cardContentStyle}>
            <textarea
              style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
              value={content.emergencyProcedures}
              onChange={(e) => set("emergencyProcedures", e.target.value)}
              placeholder="Emergency contact numbers, first aid procedures, evacuation routes..."
            />
          </div>
        </div>

        {/* Bottom actions */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", padding: "16px 0 48px" }}>
          <button
            onClick={handleSave}
            style={{
              ...btnStyle,
              background: saved ? "var(--success)" : "transparent",
              border: "1px solid var(--border)",
              color: saved ? "#fff" : "var(--foreground)",
            }}
          >
            {saved ? "Saved!" : "Save Result"}
          </button>
          <button
            onClick={handleExportPdf}
            disabled={!isValid || generating}
            style={{
              ...btnStyle,
              background: isValid ? "var(--primary)" : "var(--muted)",
              color: isValid ? "#fff" : "var(--muted-foreground)",
              opacity: generating ? 0.6 : 1,
              padding: "10px 24px",
            }}
          >
            {generating ? "Generating…" : "Export PDF"}
          </button>
        </div>
      </div>
    </main>
  );
}
