"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
// @ts-ignore — Pen and FileImage exist at runtime but TS defs lag behind lucide-react version
import { Save, Eye, Plus, Trash2, GripVertical, Type, Minus, Square, Table, Image, Loader2, Pen, FileImage, Copy, Undo2, Redo2, AlertTriangle } from "lucide-react";
import { DOC_TYPE_BINDINGS, DOC_TYPE_BINDING_GROUPS, PDF_FONT_FAMILIES, CERT_TYPE_REQUIRED_BINDINGS, validateTemplateForCertType } from "@quantract/shared/pdfTemplateConstants";
import type { PdfFontFamily, BindingGroup } from "@quantract/shared/pdfTemplateConstants";

type LayoutElement = {
  id: string;
  type: "text" | "line" | "rect" | "table" | "image" | "signature" | "photo";
  x: number;
  y: number;
  w: number;
  h: number;
  binding?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontFamily?: PdfFontFamily;
  color?: string;
  align?: "left" | "center" | "right";
  lineColor?: string;
  lineThickness?: number;
  fillColor?: string;
  strokeColor?: string;
  columns?: Array<{ header: string; binding: string; width: number }>;
  imageSource?: "logo" | "signature_engineer" | "signature_customer" | "photo";
  signatureRole?: "engineer" | "customer";
  photoIndex?: number;
};

type PdfTemplateVersion = { id: string; version: number; layout: any; createdAt: string };
type PdfTemplate = {
  id: string;
  docType: string;
  name: string;
  isDefault: boolean;
  versions: PdfTemplateVersion[];
};

// A4 aspect ratio: 210mm x 297mm
const CANVAS_WIDTH = 630; // pixels
const CANVAS_HEIGHT = 891; // ~630 * (297/210)
const SCALE = CANVAS_WIDTH / 210; // px per mm
const GRID_MM = 5;
const GRID_PX = GRID_MM * SCALE;
const MAX_UNDO = 50;

function snapToGrid(val: number): number {
  return Math.round(val / GRID_MM) * GRID_MM;
}

function pxToMm(px: number): number {
  return px / SCALE;
}

function mmToPx(mm: number): number {
  return mm * SCALE;
}

const ELEMENT_ICONS: Record<string, any> = {
  text: Type,
  line: Minus,
  rect: Square,
  table: Table,
  image: Image,
  signature: Pen,
  photo: FileImage,
};

const ELEMENT_DEFAULTS: Record<string, Partial<LayoutElement>> = {
  text: { w: 60, h: 6, binding: "Text", fontSize: 10, fontWeight: "normal", color: "#000000", align: "left" },
  line: { w: 180, h: 1, lineColor: "#000000", lineThickness: 1 },
  rect: { w: 40, h: 20, strokeColor: "#000000" },
  table: {
    w: 180, h: 80,
    columns: [
      { header: "Description", binding: "description", width: 100 },
      { header: "Qty", binding: "qty", width: 30 },
      { header: "Amount", binding: "lineTotal", width: 40 },
    ],
  },
  image: { w: 40, h: 20, imageSource: "logo" as const },
  signature: { w: 85, h: 35, signatureRole: "engineer" as const },
  photo: { w: 60, h: 40, imageSource: "photo" as const },
};

const FONT_FAMILY_CSS: Record<string, string> = {
  Helvetica: "Helvetica, Arial, sans-serif",
  Courier: "Courier New, Courier, monospace",
  TimesRoman: "Times New Roman, Times, serif",
};

/** Certificate types that have specific required bindings */
const CERT_TYPES = Object.keys(CERT_TYPE_REQUIRED_BINDINGS).filter(k => k !== "_base");

export function PdfTemplateEditor({
  template,
  onSave,
  onPreview,
}: {
  template: PdfTemplate;
  onSave: (layout: LayoutElement[]) => Promise<boolean>;
  onPreview: (layout: LayoutElement[]) => Promise<string | null>;
}) {
  const latestVersion = template.versions[0];
  const [elements, setElements] = useState<LayoutElement[]>(
    latestVersion ? (latestVersion.layout as LayoutElement[]) : []
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [dragging, setDragging] = useState<{ id: string; startX: number; startY: number; elX: number; elY: number } | null>(null);
  const [resizing, setResizing] = useState<{ id: string; startX: number; startY: number; elW: number; elH: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Undo/redo history
  const [undoStack, setUndoStack] = useState<LayoutElement[][]>([]);
  const [redoStack, setRedoStack] = useState<LayoutElement[][]>([]);
  const skipHistoryRef = useRef(false);

  // Binding search filter
  const [bindingSearch, setBindingSearch] = useState("");

  // Cert type selector for validation (only for certificate templates)
  const [selectedCertType, setSelectedCertType] = useState<string>("EICR");

  const selected = elements.find(e => e.id === selectedId) || null;
  const bindings = DOC_TYPE_BINDINGS[template.docType] || [];
  const bindingGroups: BindingGroup[] = DOC_TYPE_BINDING_GROUPS[template.docType] || [];

  // Push to undo stack before modifying elements
  const pushUndo = useCallback((prev: LayoutElement[]) => {
    if (skipHistoryRef.current) return;
    setUndoStack(stack => {
      const next = [...stack, prev];
      return next.length > MAX_UNDO ? next.slice(-MAX_UNDO) : next;
    });
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    setUndoStack(stack => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      const rest = stack.slice(0, -1);
      setRedoStack(redo => [...redo, elements]);
      skipHistoryRef.current = true;
      setElements(prev);
      setDirty(true);
      return rest;
    });
  }, [elements]);

  const redo = useCallback(() => {
    setRedoStack(stack => {
      if (stack.length === 0) return stack;
      const next = stack[stack.length - 1];
      const rest = stack.slice(0, -1);
      setUndoStack(undo => [...undo, elements]);
      skipHistoryRef.current = true;
      setElements(next);
      setDirty(true);
      return rest;
    });
  }, [elements]);

  const updateElement = useCallback((id: string, updates: Partial<LayoutElement>) => {
    setElements(prev => {
      pushUndo(prev);
      return prev.map(e => e.id === id ? { ...e, ...updates } : e);
    });
    setDirty(true);
  }, [pushUndo]);

  // Reset skip flag after render
  useEffect(() => {
    skipHistoryRef.current = false;
  }, [elements]);

  const addElement = useCallback((type: LayoutElement["type"]) => {
    const defaults = ELEMENT_DEFAULTS[type] || {};
    const id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newEl: LayoutElement = {
      id,
      type,
      x: 15,
      y: 50,
      ...defaults,
    } as LayoutElement;
    setElements(prev => {
      pushUndo(prev);
      return [...prev, newEl];
    });
    setSelectedId(id);
    setDirty(true);
  }, [pushUndo]);

  const duplicateElement = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const newId = `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newEl: LayoutElement = {
      ...structuredClone(el),
      id: newId,
      x: Math.min(el.x + 5, 210),
      y: Math.min(el.y + 5, 297),
    };
    setElements(prev => {
      pushUndo(prev);
      return [...prev, newEl];
    });
    setSelectedId(newId);
    setDirty(true);
  }, [elements, pushUndo]);

  const removeElement = useCallback((id: string) => {
    setElements(prev => {
      pushUndo(prev);
      return prev.filter(e => e.id !== id);
    });
    if (selectedId === id) setSelectedId(null);
    setDirty(true);
  }, [selectedId, pushUndo]);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onSave(elements);
    setSaving(false);
    if (ok) setDirty(false);
  };

  const handlePreview = async () => {
    setPreviewing(true);
    const url = await onPreview(elements);
    if (url) setPreviewUrl(url);
    setPreviewing(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedId) {
        e.preventDefault();
        duplicateElement(selectedId);
      } else if (e.key === "Delete" && selectedId) {
        e.preventDefault();
        removeElement(selectedId);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, selectedId, duplicateElement, removeElement]);

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const el = elements.find(el => el.id === id);
    if (!el) return;
    setSelectedId(id);
    setDragging({ id, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const el = elements.find(el => el.id === id);
    if (!el) return;
    setResizing({ id, startX: e.clientX, startY: e.clientY, elW: el.w, elH: el.h });
  };

  useEffect(() => {
    if (!dragging && !resizing) return;

    const handleMove = (e: MouseEvent) => {
      if (dragging) {
        const dx = pxToMm(e.clientX - dragging.startX);
        const dy = pxToMm(e.clientY - dragging.startY);
        const newX = Math.max(0, Math.min(210, snapToGrid(dragging.elX + dx)));
        const newY = Math.max(0, Math.min(297, snapToGrid(dragging.elY + dy)));
        // Skip undo for drag moves (only capture start/end)
        skipHistoryRef.current = true;
        setElements(prev => prev.map(e => e.id === dragging.id ? { ...e, x: newX, y: newY } : e));
        setDirty(true);
      }
      if (resizing) {
        const dx = pxToMm(e.clientX - resizing.startX);
        const dy = pxToMm(e.clientY - resizing.startY);
        const newW = Math.max(5, snapToGrid(resizing.elW + dx));
        const newH = Math.max(1, snapToGrid(resizing.elH + dy));
        skipHistoryRef.current = true;
        setElements(prev => prev.map(e => e.id === resizing.id ? { ...e, w: newW, h: newH } : e));
        setDirty(true);
      }
    };

    const handleUp = () => {
      // Capture final state in undo stack
      if (dragging || resizing) {
        skipHistoryRef.current = false;
      }
      setDragging(null);
      setResizing(null);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, resizing]);

  // Cert-type validation warnings
  const certValidation = useMemo(() => {
    if (template.docType !== "certificate") return null;
    return validateTemplateForCertType(elements, selectedCertType);
  }, [template.docType, elements, selectedCertType]);

  // Filter binding groups by search
  const filteredGroups = useMemo(() => {
    if (!bindingSearch.trim()) return bindingGroups;
    const q = bindingSearch.toLowerCase();
    return bindingGroups
      .map(g => ({
        ...g,
        bindings: g.bindings.filter(b => b.toLowerCase().includes(q)),
      }))
      .filter(g => g.bindings.length > 0);
  }, [bindingGroups, bindingSearch]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm text-[var(--muted-foreground)]">
            Version {latestVersion?.version || 0}
            {dirty && <span className="ml-2 text-amber-600">(unsaved changes)</span>}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-1 rounded hover:bg-[var(--card)] transition disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-1 rounded hover:bg-[var(--card)] transition disabled:opacity-30"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={previewing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--card)] transition disabled:opacity-50"
          >
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>

      {/* Cert-type validation warnings */}
      {template.docType === "certificate" && (
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1 text-[var(--muted-foreground)]">
            Validate for:
            <select
              value={selectedCertType}
              onChange={e => setSelectedCertType(e.target.value)}
              className="rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-xs"
            >
              {CERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          {certValidation && !certValidation.valid && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-3.5 h-3.5" />
              Missing bindings: {certValidation.missing!.join(", ")}
            </div>
          )}
          {certValidation?.valid && (
            <span className="text-green-600">All required bindings present</span>
          )}
        </div>
      )}

      {/* Preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }}>
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b">
              <span className="text-sm font-medium">Preview</span>
              <button onClick={() => { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Close</button>
            </div>
            <iframe src={previewUrl} className="w-full" style={{ height: "80vh" }} />
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* Left: Add elements */}
        <div className="w-48 shrink-0 space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Add Element</h4>
          {([
            "text", "line", "rect", "table", "image",
            ...(template.docType === "certificate" ? ["signature", "photo"] as const : []),
          ] as const).map(type => {
            const Icon = ELEMENT_ICONS[type];
            return (
              <button
                key={type}
                onClick={() => addElement(type)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm hover:border-[var(--primary)]/50 transition"
              >
                <Icon className="w-4 h-4 text-[var(--muted-foreground)]" />
                <span className="capitalize">{type}</span>
              </button>
            );
          })}

          {/* Element list */}
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mt-4 mb-2">Elements</h4>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {elements.map(el => (
              <button
                key={el.id}
                onClick={() => setSelectedId(el.id)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition ${
                  el.id === selectedId
                    ? "bg-[var(--primary)]/10 border border-[var(--primary)]/30"
                    : "hover:bg-[var(--card)]"
                }`}
              >
                <GripVertical className="w-3 h-3 text-[var(--muted-foreground)]" />
                <span className="truncate flex-1 text-left">
                  {el.type === "text" ? (el.binding || "Text").slice(0, 20) : el.type}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 min-w-0">
          <div
            ref={canvasRef}
            className="relative bg-white border border-[var(--border)] shadow-sm mx-auto"
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_PX}px ${GRID_PX}px`,
            }}
            onClick={() => setSelectedId(null)}
          >
            {elements.map(el => {
              const isSelected = el.id === selectedId;
              const left = mmToPx(el.x);
              const top = mmToPx(el.y);
              const width = mmToPx(el.w);
              const height = mmToPx(el.h);

              return (
                <div
                  key={el.id}
                  className={`absolute cursor-move ${isSelected ? "ring-2 ring-blue-500 z-10" : "hover:ring-1 hover:ring-blue-300"}`}
                  style={{
                    left,
                    top,
                    width,
                    height,
                    backgroundColor: el.type === "rect" && el.fillColor ? el.fillColor + "33" : undefined,
                    borderColor: el.type === "rect" && el.strokeColor ? el.strokeColor : undefined,
                    borderWidth: el.type === "rect" ? 1 : undefined,
                    borderStyle: el.type === "rect" ? "solid" : undefined,
                  }}
                  onMouseDown={e => handleMouseDown(e, el.id)}
                >
                  {/* Element content preview */}
                  <div className="w-full h-full overflow-hidden pointer-events-none flex items-center" style={{ padding: "0 2px" }}>
                    {el.type === "text" && (
                      <span
                        className="truncate leading-none"
                        style={{
                          fontSize: Math.min((el.fontSize || 10) * 0.9, 14),
                          fontWeight: el.fontWeight === "bold" ? 700 : 400,
                          fontFamily: FONT_FAMILY_CSS[el.fontFamily ?? "Helvetica"],
                          color: el.color || "#000",
                          textAlign: el.align || "left",
                          width: "100%",
                        }}
                      >
                        {el.binding || "Text"}
                      </span>
                    )}
                    {el.type === "line" && (
                      <div
                        className="w-full"
                        style={{
                          height: el.lineThickness || 1,
                          backgroundColor: el.lineColor || "#000",
                        }}
                      />
                    )}
                    {el.type === "table" && (
                      <span className="text-xs text-gray-400">[Table: {el.columns?.length || 0} cols]</span>
                    )}
                    {el.type === "image" && (
                      <span className="text-xs text-gray-400">
                        {el.imageSource === "logo" ? "[Logo]" :
                         el.imageSource === "signature_engineer" ? "[Eng Sig]" :
                         el.imageSource === "signature_customer" ? "[Cust Sig]" :
                         el.imageSource === "photo" ? "[Photo]" : "[Image]"}
                      </span>
                    )}
                    {el.type === "signature" && (
                      <div className="flex flex-col items-center justify-center w-full h-full border border-dashed border-gray-300 rounded bg-gray-50/50">
                        <Pen className="w-3 h-3 text-gray-400" />
                        <span className="text-[9px] text-gray-400 mt-0.5">{el.signatureRole === "customer" ? "Customer" : "Engineer"}</span>
                      </div>
                    )}
                    {el.type === "photo" && (
                      <div className="flex flex-col items-center justify-center w-full h-full border border-dashed border-gray-300 rounded bg-gray-50/50">
                        <FileImage className="w-3 h-3 text-gray-400" />
                        <span className="text-[9px] text-gray-400 mt-0.5">Photo #{(el as any).photoIndex ?? 0}</span>
                      </div>
                    )}
                  </div>

                  {/* Resize handle */}
                  {isSelected && (
                    <div
                      className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize"
                      onMouseDown={e => handleResizeMouseDown(e, el.id)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Properties panel */}
        <div className="w-56 shrink-0">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-2">Properties</h4>
          {!selected ? (
            <p className="text-xs text-[var(--muted-foreground)]">Select an element to edit its properties.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium capitalize">{selected.type}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => duplicateElement(selected.id)}
                    className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    title="Duplicate (Ctrl+D)"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => removeElement(selected.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete (Del)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Position */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[var(--muted-foreground)]">X (mm)</label>
                  <input
                    type="number"
                    value={selected.x}
                    onChange={e => updateElement(selected.id, { x: Number(e.target.value) })}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    step={GRID_MM}
                    min={0}
                    max={210}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Y (mm)</label>
                  <input
                    type="number"
                    value={selected.y}
                    onChange={e => updateElement(selected.id, { y: Number(e.target.value) })}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    step={GRID_MM}
                    min={0}
                    max={297}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-[var(--muted-foreground)]">W (mm)</label>
                  <input
                    type="number"
                    value={selected.w}
                    onChange={e => updateElement(selected.id, { w: Number(e.target.value) })}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    step={GRID_MM}
                    min={1}
                    max={210}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--muted-foreground)]">H (mm)</label>
                  <input
                    type="number"
                    value={selected.h}
                    onChange={e => updateElement(selected.id, { h: Number(e.target.value) })}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    step={GRID_MM}
                    min={1}
                    max={297}
                  />
                </div>
              </div>

              {/* Text properties */}
              {selected.type === "text" && (
                <>
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">Text / Binding</label>
                    <input
                      type="text"
                      value={selected.binding || ""}
                      onChange={e => updateElement(selected.id, { binding: e.target.value })}
                      className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                      placeholder="Static text or {{binding}}"
                    />
                    {bindingGroups.length > 0 && (
                      <div className="mt-1">
                        <input
                          type="text"
                          value={bindingSearch}
                          onChange={e => setBindingSearch(e.target.value)}
                          placeholder="Search bindings…"
                          className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[10px] mb-1"
                        />
                        <div className="max-h-32 overflow-y-auto space-y-1">
                          {filteredGroups.map(group => (
                            <div key={group.label}>
                              <div className="text-[9px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">{group.label}</div>
                              <div className="flex flex-wrap gap-0.5">
                                {group.bindings.map(b => (
                                  <button
                                    key={b}
                                    onClick={() => updateElement(selected.id, { binding: `{{${b}}}` })}
                                    className="px-1 py-0.5 rounded bg-blue-50 text-blue-700 text-[9px] hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300"
                                  >
                                    {b}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">Font</label>
                    <select
                      value={selected.fontFamily || "Helvetica"}
                      onChange={e => updateElement(selected.id, { fontFamily: e.target.value as PdfFontFamily })}
                      className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    >
                      {PDF_FONT_FAMILIES.map(f => (
                        <option key={f} value={f} style={{ fontFamily: FONT_FAMILY_CSS[f] }}>{f}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[var(--muted-foreground)]">Size</label>
                      <input
                        type="number"
                        value={selected.fontSize || 10}
                        onChange={e => updateElement(selected.id, { fontSize: Number(e.target.value) })}
                        className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                        min={6}
                        max={36}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--muted-foreground)]">Weight</label>
                      <select
                        value={selected.fontWeight || "normal"}
                        onChange={e => updateElement(selected.id, { fontWeight: e.target.value as "normal" | "bold" })}
                        className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[var(--muted-foreground)]">Color</label>
                      <input
                        type="color"
                        value={selected.color || "#000000"}
                        onChange={e => updateElement(selected.id, { color: e.target.value })}
                        className="w-full h-7 rounded border border-[var(--border)] cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--muted-foreground)]">Align</label>
                      <select
                        value={selected.align || "left"}
                        onChange={e => updateElement(selected.id, { align: e.target.value as "left" | "center" | "right" })}
                        className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Line properties */}
              {selected.type === "line" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">Color</label>
                    <input
                      type="color"
                      value={selected.lineColor || "#000000"}
                      onChange={e => updateElement(selected.id, { lineColor: e.target.value })}
                      className="w-full h-7 rounded border border-[var(--border)] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">Thickness</label>
                    <input
                      type="number"
                      value={selected.lineThickness || 1}
                      onChange={e => updateElement(selected.id, { lineThickness: Number(e.target.value) })}
                      className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                      min={0.25}
                      max={5}
                      step={0.25}
                    />
                  </div>
                </div>
              )}

              {/* Rect properties */}
              {selected.type === "rect" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">Fill</label>
                    <input
                      type="color"
                      value={selected.fillColor || "#ffffff"}
                      onChange={e => updateElement(selected.id, { fillColor: e.target.value })}
                      className="w-full h-7 rounded border border-[var(--border)] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">Stroke</label>
                    <input
                      type="color"
                      value={selected.strokeColor || "#000000"}
                      onChange={e => updateElement(selected.id, { strokeColor: e.target.value })}
                      className="w-full h-7 rounded border border-[var(--border)] cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Table columns */}
              {selected.type === "table" && (
                <div>
                  <label className="block text-[10px] text-[var(--muted-foreground)] mb-1">Columns</label>
                  {(selected.columns || []).map((col, i) => (
                    <div key={i} className="flex gap-1 mb-1">
                      <input
                        type="text"
                        value={col.header}
                        onChange={e => {
                          const cols = [...(selected.columns || [])];
                          cols[i] = { ...cols[i], header: e.target.value };
                          updateElement(selected.id, { columns: cols });
                        }}
                        className="w-16 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-[10px]"
                        placeholder="Header"
                      />
                      <input
                        type="text"
                        value={col.binding}
                        onChange={e => {
                          const cols = [...(selected.columns || [])];
                          cols[i] = { ...cols[i], binding: e.target.value };
                          updateElement(selected.id, { columns: cols });
                        }}
                        className="w-16 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-[10px]"
                        placeholder="Binding"
                      />
                      <input
                        type="number"
                        value={col.width}
                        onChange={e => {
                          const cols = [...(selected.columns || [])];
                          cols[i] = { ...cols[i], width: Number(e.target.value) };
                          updateElement(selected.id, { columns: cols });
                        }}
                        className="w-12 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-[10px]"
                        placeholder="W"
                        min={10}
                      />
                      <button
                        onClick={() => {
                          const cols = (selected.columns || []).filter((_, j) => j !== i);
                          updateElement(selected.id, { columns: cols });
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const cols = [...(selected.columns || []), { header: "Col", binding: "field", width: 30 }];
                      updateElement(selected.id, { columns: cols });
                    }}
                    className="flex items-center gap-1 text-[10px] text-[var(--primary)] mt-1"
                  >
                    <Plus className="w-3 h-3" /> Add column
                  </button>
                </div>
              )}

              {/* Photo properties */}
              {selected.type === "photo" && (
                <div>
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Photo Index</label>
                  <input
                    type="number"
                    value={(selected as any).photoIndex ?? 0}
                    onChange={e => updateElement(selected.id, { photoIndex: Math.max(0, Math.min(4, Number(e.target.value))) } as any)}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                    min={0}
                    max={4}
                  />
                  <p className="text-[9px] text-[var(--muted-foreground)] mt-0.5">Which attached photo to display (0–4)</p>
                </div>
              )}

              {/* Signature properties */}
              {selected.type === "signature" && (
                <div>
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Signature Role</label>
                  <select
                    value={selected.signatureRole || "engineer"}
                    onChange={e => updateElement(selected.id, { signatureRole: e.target.value as "engineer" | "customer" })}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  >
                    <option value="engineer">Engineer</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
              )}

              {/* Image source properties */}
              {selected.type === "image" && (
                <div>
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Image Source</label>
                  <select
                    value={selected.imageSource || "logo"}
                    onChange={e => updateElement(selected.id, { imageSource: e.target.value as "logo" | "signature_engineer" | "signature_customer" | "photo" })}
                    className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs"
                  >
                    <option value="logo">Company Logo</option>
                    {template.docType === "certificate" && (
                      <>
                        <option value="signature_engineer">Engineer Signature</option>
                        <option value="signature_customer">Customer Signature</option>
                        <option value="photo">Certificate Photo</option>
                      </>
                    )}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
