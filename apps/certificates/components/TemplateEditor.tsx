"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Save, Eye, Plus, Trash2, GripVertical, Type, Minus, Square, Table, Image, Loader2, Pen, FileImage } from "lucide-react";
import { DOC_TYPE_BINDINGS } from "../lib/pdfTemplateConstants";

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
  color?: string;
  align?: "left" | "center" | "right";
  lineColor?: string;
  lineThickness?: number;
  fillColor?: string;
  strokeColor?: string;
  columns?: Array<{ header: string; binding: string; width: number }>;
  imageSource?: "logo" | "signature_engineer" | "signature_customer" | "photo";
  signatureRole?: "engineer" | "customer";
};

export type { LayoutElement };

type PdfTemplateVersion = { id: string; version: number; layout: unknown; createdAt: string };
type PdfTemplate = {
  id: string;
  docType: string;
  name: string;
  isDefault: boolean;
  versions: PdfTemplateVersion[];
};

export type { PdfTemplate, PdfTemplateVersion };

// A4 aspect ratio: 210mm x 297mm
const CANVAS_WIDTH = 630;
const CANVAS_HEIGHT = 891;
const SCALE = CANVAS_WIDTH / 210;
const GRID_MM = 5;
const GRID_PX = GRID_MM * SCALE;

function snapToGrid(val: number): number {
  return Math.round(val / GRID_MM) * GRID_MM;
}
function pxToMm(px: number): number {
  return px / SCALE;
}
function mmToPx(mm: number): number {
  return mm * SCALE;
}

const ELEMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
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

export function TemplateEditor({
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

  const selected = elements.find(e => e.id === selectedId) || null;
  const bindings = DOC_TYPE_BINDINGS[template.docType] || [];

  const updateElement = useCallback((id: string, updates: Partial<LayoutElement>) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    setDirty(true);
  }, []);

  const addElement = useCallback((type: LayoutElement["type"]) => {
    const defaults = ELEMENT_DEFAULTS[type] || {};
    const id = `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newEl: LayoutElement = { id, type, x: 15, y: 50, ...defaults } as LayoutElement;
    setElements(prev => [...prev, newEl]);
    setSelectedId(id);
    setDirty(true);
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    if (selectedId === id) setSelectedId(null);
    setDirty(true);
  }, [selectedId]);

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
        updateElement(dragging.id, {
          x: Math.max(0, Math.min(210, snapToGrid(dragging.elX + dx))),
          y: Math.max(0, Math.min(297, snapToGrid(dragging.elY + dy))),
        });
      }
      if (resizing) {
        const dx = pxToMm(e.clientX - resizing.startX);
        const dy = pxToMm(e.clientY - resizing.startY);
        updateElement(resizing.id, {
          w: Math.max(5, snapToGrid(resizing.elW + dx)),
          h: Math.max(1, snapToGrid(resizing.elH + dy)),
        });
      }
    };
    const handleUp = () => { setDragging(null); setResizing(null); };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => { window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
  }, [dragging, resizing, updateElement]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--muted-foreground)]">
          Version {latestVersion?.version || 0}
          {dirty && <span className="ml-2 text-amber-600">(unsaved changes)</span>}
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
          {(["text", "line", "rect", "table", "image", "signature", "photo"] as const).map(type => {
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

          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mt-4 mb-2">Elements</h4>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {elements.map(el => (
              <button
                key={el.id}
                onClick={() => setSelectedId(el.id)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition ${
                  el.id === selectedId ? "bg-[var(--primary)]/10 border border-[var(--primary)]/30" : "hover:bg-[var(--card)]"
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
              backgroundImage: `linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)`,
              backgroundSize: `${GRID_PX}px ${GRID_PX}px`,
            }}
            onClick={() => setSelectedId(null)}
          >
            {elements.map(el => {
              const isSelected = el.id === selectedId;
              return (
                <div
                  key={el.id}
                  className={`absolute cursor-move ${isSelected ? "ring-2 ring-blue-500 z-10" : "hover:ring-1 hover:ring-blue-300"}`}
                  style={{
                    left: mmToPx(el.x), top: mmToPx(el.y), width: mmToPx(el.w), height: mmToPx(el.h),
                    backgroundColor: el.type === "rect" && el.fillColor ? el.fillColor + "33" : undefined,
                    borderColor: el.type === "rect" && el.strokeColor ? el.strokeColor : undefined,
                    borderWidth: el.type === "rect" ? 1 : undefined,
                    borderStyle: el.type === "rect" ? "solid" : undefined,
                  }}
                  onMouseDown={e => handleMouseDown(e, el.id)}
                >
                  <div className="w-full h-full overflow-hidden pointer-events-none flex items-center" style={{ padding: "0 2px" }}>
                    {el.type === "text" && (
                      <span className="truncate leading-none" style={{ fontSize: Math.min((el.fontSize || 10) * 0.9, 14), fontWeight: el.fontWeight === "bold" ? 700 : 400, color: el.color || "#000", textAlign: el.align || "left", width: "100%" }}>
                        {el.binding || "Text"}
                      </span>
                    )}
                    {el.type === "line" && <div className="w-full" style={{ height: el.lineThickness || 1, backgroundColor: el.lineColor || "#000" }} />}
                    {el.type === "table" && <span className="text-xs text-gray-400">[Table: {el.columns?.length || 0} cols]</span>}
                    {el.type === "image" && <span className="text-xs text-gray-400">{el.imageSource === "logo" ? "[Logo]" : "[Image]"}</span>}
                    {el.type === "signature" && (
                      <div className="flex flex-col items-center justify-center w-full h-full border border-dashed border-gray-300 rounded bg-gray-50/50">
                        <Pen className="w-3 h-3 text-gray-400" />
                        <span className="text-[9px] text-gray-400 mt-0.5">{el.signatureRole === "customer" ? "Customer" : "Engineer"}</span>
                      </div>
                    )}
                    {el.type === "photo" && (
                      <div className="flex flex-col items-center justify-center w-full h-full border border-dashed border-gray-300 rounded bg-gray-50/50">
                        <FileImage className="w-3 h-3 text-gray-400" />
                        <span className="text-[9px] text-gray-400 mt-0.5">Photo</span>
                      </div>
                    )}
                  </div>
                  {isSelected && <div className="absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize" onMouseDown={e => handleResizeMouseDown(e, el.id)} />}
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
                <button onClick={() => removeElement(selected.id)} className="text-red-500 hover:text-red-700" title="Delete element">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Position & Size */}
              <div className="grid grid-cols-2 gap-2">
                {(["x", "y"] as const).map(k => (
                  <div key={k}>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">{k.toUpperCase()} (mm)</label>
                    <input type="number" value={selected[k]} onChange={e => updateElement(selected.id, { [k]: Number(e.target.value) })} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs" step={GRID_MM} min={0} max={k === "x" ? 210 : 297} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["w", "h"] as const).map(k => (
                  <div key={k}>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">{k.toUpperCase()} (mm)</label>
                    <input type="number" value={selected[k]} onChange={e => updateElement(selected.id, { [k]: Number(e.target.value) })} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs" step={GRID_MM} min={1} max={k === "w" ? 210 : 297} />
                  </div>
                ))}
              </div>

              {/* Text properties */}
              {selected.type === "text" && (
                <>
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">Text / Binding</label>
                    <input type="text" value={selected.binding || ""} onChange={e => updateElement(selected.id, { binding: e.target.value })} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs" placeholder="Static text or {{binding}}" />
                    {bindings.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {bindings.slice(0, 8).map(b => (
                          <button key={b} onClick={() => updateElement(selected.id, { binding: `{{${b}}}` })} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300">{b}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[var(--muted-foreground)]">Size</label>
                      <input type="number" value={selected.fontSize || 10} onChange={e => updateElement(selected.id, { fontSize: Number(e.target.value) })} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs" min={6} max={36} />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--muted-foreground)]">Weight</label>
                      <select value={selected.fontWeight || "normal"} onChange={e => updateElement(selected.id, { fontWeight: e.target.value as "normal" | "bold" })} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs">
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[var(--muted-foreground)]">Color</label>
                      <input type="color" value={selected.color || "#000000"} onChange={e => updateElement(selected.id, { color: e.target.value })} className="w-full h-7 rounded border border-[var(--border)] cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[var(--muted-foreground)]">Align</label>
                      <select value={selected.align || "left"} onChange={e => updateElement(selected.id, { align: e.target.value as "left" | "center" | "right" })} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs">
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {selected.type === "line" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">Color</label>
                    <input type="color" value={selected.lineColor || "#000000"} onChange={e => updateElement(selected.id, { lineColor: e.target.value })} className="w-full h-7 rounded border border-[var(--border)] cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">Thickness</label>
                    <input type="number" value={selected.lineThickness || 1} onChange={e => updateElement(selected.id, { lineThickness: Number(e.target.value) })} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs" min={0.25} max={5} step={0.25} />
                  </div>
                </div>
              )}

              {selected.type === "rect" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">Fill</label>
                    <input type="color" value={selected.fillColor || "#ffffff"} onChange={e => updateElement(selected.id, { fillColor: e.target.value })} className="w-full h-7 rounded border border-[var(--border)] cursor-pointer" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[var(--muted-foreground)]">Stroke</label>
                    <input type="color" value={selected.strokeColor || "#000000"} onChange={e => updateElement(selected.id, { strokeColor: e.target.value })} className="w-full h-7 rounded border border-[var(--border)] cursor-pointer" />
                  </div>
                </div>
              )}

              {selected.type === "table" && (
                <div>
                  <label className="block text-[10px] text-[var(--muted-foreground)] mb-1">Columns</label>
                  {(selected.columns || []).map((col, i) => (
                    <div key={i} className="flex gap-1 mb-1">
                      <input type="text" value={col.header} onChange={e => { const cols = [...(selected.columns || [])]; cols[i] = { ...cols[i], header: e.target.value }; updateElement(selected.id, { columns: cols }); }} className="w-16 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-[10px]" placeholder="Header" />
                      <input type="text" value={col.binding} onChange={e => { const cols = [...(selected.columns || [])]; cols[i] = { ...cols[i], binding: e.target.value }; updateElement(selected.id, { columns: cols }); }} className="w-16 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-[10px]" placeholder="Binding" />
                      <input type="number" value={col.width} onChange={e => { const cols = [...(selected.columns || [])]; cols[i] = { ...cols[i], width: Number(e.target.value) }; updateElement(selected.id, { columns: cols }); }} className="w-12 rounded border border-[var(--border)] bg-[var(--background)] px-1 py-0.5 text-[10px]" placeholder="W" min={10} />
                      <button onClick={() => { const cols = (selected.columns || []).filter((_, j) => j !== i); updateElement(selected.id, { columns: cols }); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <button onClick={() => { const cols = [...(selected.columns || []), { header: "Col", binding: "field", width: 30 }]; updateElement(selected.id, { columns: cols }); }} className="flex items-center gap-1 text-[10px] text-[var(--primary)] mt-1">
                    <Plus className="w-3 h-3" /> Add column
                  </button>
                </div>
              )}

              {selected.type === "signature" && (
                <div>
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Signature Role</label>
                  <select value={selected.signatureRole || "engineer"} onChange={e => updateElement(selected.id, { signatureRole: e.target.value as "engineer" | "customer" })} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs">
                    <option value="engineer">Engineer</option>
                    <option value="customer">Customer</option>
                  </select>
                </div>
              )}

              {selected.type === "image" && (
                <div>
                  <label className="block text-[10px] text-[var(--muted-foreground)]">Image Source</label>
                  <select value={selected.imageSource || "logo"} onChange={e => updateElement(selected.id, { imageSource: e.target.value as "logo" | "signature_engineer" | "signature_customer" | "photo" })} className="w-full rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-xs">
                    <option value="logo">Company Logo</option>
                    <option value="signature_engineer">Engineer Signature</option>
                    <option value="signature_customer">Customer Signature</option>
                    <option value="photo">Certificate Photo</option>
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
