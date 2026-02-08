"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { BoardData, BoardCircuit } from "@quantract/shared/certificate-types";
import { migrateCircuit } from "@quantract/shared/certificate-types";
import { STATUS_BG, STATUS_TEXT } from "../lib/boardVisualConstants";
import { VisualBoardView } from "./visual-board/VisualBoardView";

// ── Column definition ──

type ColType = "text" | "number" | "select" | "checkbox";

interface ColDef {
  key: string;
  label: string;
  group: string;
  subGroup?: string;
  type: ColType;
  width: number;
  options?: string[];
  frozen?: boolean;
}

const COLUMNS: ColDef[] = [
  // Circuit info (no group)
  { key: "circuitNumber", label: "Cct", group: "", type: "text", width: 48, frozen: true },
  { key: "description", label: "Description", group: "", type: "text", width: 150, frozen: true },
  // Conductor Details
  { key: "typeOfWiring", label: "Wiring", group: "Conductor Details", type: "select", width: 68, options: ["T+E", "SWA", "MICC", "Flex", "Conduit", "Trunking", "Other"] },
  { key: "referenceMethod", label: "Ref", group: "Conductor Details", type: "select", width: 52, options: ["A", "B", "C", "100", "101", "102", "103"] },
  { key: "numberOfPoints", label: "Pts", group: "Conductor Details", type: "number", width: 42 },
  { key: "liveCsa", label: "Live", group: "Conductor Details", type: "select", width: 52, options: ["1.0", "1.5", "2.5", "4.0", "6.0", "10.0", "16.0", "25.0"] },
  { key: "cpcCsa", label: "cpc", group: "Conductor Details", type: "select", width: 52, options: ["1.0", "1.5", "2.5", "4.0", "6.0", "10.0", "16.0", "25.0"] },
  // Overcurrent Protective Device
  { key: "ocpdNumberAndSize", label: "No.&Size", group: "Overcurrent Protective Device", type: "text", width: 68 },
  { key: "maxDisconnectionTime", label: "Max Disc", group: "Overcurrent Protective Device", type: "select", width: 60, options: ["0.1", "0.2", "0.4", "5", "N/A"] },
  { key: "ocpdBsEn", label: "BS(EN)", group: "Overcurrent Protective Device", type: "text", width: 60 },
  { key: "ocpdType", label: "Type", group: "Overcurrent Protective Device", type: "select", width: 48, options: ["B", "C", "D", "1", "2", "3"] },
  { key: "ocpdRating", label: "Rating", group: "Overcurrent Protective Device", type: "select", width: 56, options: ["6", "10", "16", "20", "25", "32", "40", "50", "63", "80", "100"] },
  { key: "breakingCapacity", label: "kA", group: "Overcurrent Protective Device", type: "select", width: 44, options: ["6", "10", "16"] },
  { key: "maxPermittedZs", label: "Max Zs", group: "Overcurrent Protective Device", type: "number", width: 56 },
  // RCD
  { key: "rcdBsEn", label: "BS(EN)", group: "RCD", type: "text", width: 60 },
  { key: "rcdType", label: "Type", group: "RCD", type: "select", width: 48, options: ["AC", "A", "F", "B", "S", "N/A"] },
  { key: "rcdRatedCurrent", label: "I\u0394n", group: "RCD", type: "select", width: 52, options: ["10", "30", "100", "300", "500", "N/A"] },
  { key: "rcdRating", label: "Rating", group: "RCD", type: "select", width: 52, options: ["40", "63", "80", "100"] },
  // Continuity — Ring final circuit
  { key: "ringR1", label: "r1", group: "Continuity \u03A9", subGroup: "Ring Final Cct", type: "number", width: 48 },
  { key: "ringRn", label: "rn", group: "Continuity \u03A9", subGroup: "Ring Final Cct", type: "number", width: 48 },
  { key: "ringR2", label: "r2", group: "Continuity \u03A9", subGroup: "Ring Final Cct", type: "number", width: 48 },
  // Continuity — Radial
  { key: "r1PlusR2", label: "R1+R2", group: "Continuity \u03A9", subGroup: "Radial", type: "number", width: 56 },
  // Insulation Resistance
  { key: "irTestVoltage", label: "Test V", group: "Insulation Resistance", type: "select", width: 52, options: ["250", "500", "1000"] },
  { key: "irLiveLive", label: "L-L", group: "Insulation Resistance", type: "text", width: 52 },
  { key: "irLiveEarth", label: "L-E", group: "Insulation Resistance", type: "text", width: 52 },
  // Zs
  { key: "polarityConfirmed", label: "Pol", group: "Zs \u03A9", type: "checkbox", width: 36 },
  { key: "zsMaximum", label: "Max", group: "Zs \u03A9", type: "number", width: 52 },
  { key: "zsMeasured", label: "Meas", group: "Zs \u03A9", type: "number", width: 52 },
  // RCD Test
  { key: "rcdDisconnectionTime", label: "ms", group: "RCD Test", type: "number", width: 48 },
  // AFDD
  { key: "afddTestButton", label: "Test", group: "AFDD", type: "checkbox", width: 36 },
  { key: "afddManualTest", label: "Manual", group: "AFDD", type: "checkbox", width: 44 },
  // Status
  { key: "status", label: "Status", group: "", type: "select", width: 60, options: ["Pass", "C1", "C2", "C3", "FI", "LIM", "N/V", "N/A"] },
  { key: "observationCode", label: "Code", group: "", type: "text", width: 52 },
];

// Compute frozen offset for each column
const FROZEN_COUNT = 2;
const COL_OFFSETS: number[] = [];
let runLeft = 0;
for (let i = 0; i < COLUMNS.length; i++) {
  COL_OFFSETS.push(runLeft);
  if (i < FROZEN_COUNT) runLeft += COLUMNS[i].width;
}
const FROZEN_WIDTH = runLeft;

// Group header computation
interface GroupSpan { label: string; span: number; startIdx: number; }
function computeGroups(): GroupSpan[] {
  const groups: GroupSpan[] = [];
  let cur = "";
  let span = 0;
  let startIdx = 0;
  for (let i = 0; i < COLUMNS.length; i++) {
    const g = COLUMNS[i].group;
    if (g !== cur) {
      if (i > 0) groups.push({ label: cur, span, startIdx });
      cur = g;
      span = 1;
      startIdx = i;
    } else {
      span++;
    }
  }
  groups.push({ label: cur, span, startIdx });
  return groups;
}
const GROUP_HEADERS = computeGroups();

// Sub-group header computation for Continuity group
interface SubGroupSpan { label: string; span: number; startIdx: number; }
function computeSubGroups(): SubGroupSpan[] {
  const subs: SubGroupSpan[] = [];
  let cur = "";
  let span = 0;
  let startIdx = 0;
  for (let i = 0; i < COLUMNS.length; i++) {
    const sg = COLUMNS[i].subGroup || "";
    if (sg !== cur) {
      if (i > 0) subs.push({ label: cur, span, startIdx });
      cur = sg;
      span = 1;
      startIdx = i;
    } else {
      span++;
    }
  }
  subs.push({ label: cur, span, startIdx });
  return subs;
}
const SUB_GROUP_HEADERS = computeSubGroups();

// ── Location options ──

const LOCATION_OPTIONS = [
  "Under stairs", "Garage", "Kitchen", "Utility Room", "Loft",
  "Hallway", "Basement", "External", "Other",
];

// ── Standard domestic preset ──

const STANDARD_DOMESTIC: Partial<BoardCircuit>[] = [
  { circuitNumber: 1, description: "Lighting (Ground Floor)", ocpdType: "B", ocpdRating: "6", liveCsa: "1.5", cpcCsa: "1.0", typeOfWiring: "T+E" },
  { circuitNumber: 2, description: "Lighting (First Floor)", ocpdType: "B", ocpdRating: "6", liveCsa: "1.5", cpcCsa: "1.0", typeOfWiring: "T+E" },
  { circuitNumber: 3, description: "Ring Final (Ground Floor)", ocpdType: "B", ocpdRating: "32", liveCsa: "2.5", cpcCsa: "1.5", typeOfWiring: "T+E" },
  { circuitNumber: 4, description: "Ring Final (First Floor)", ocpdType: "B", ocpdRating: "32", liveCsa: "2.5", cpcCsa: "1.5", typeOfWiring: "T+E" },
  { circuitNumber: 5, description: "Cooker", ocpdType: "B", ocpdRating: "32", liveCsa: "6.0", cpcCsa: "2.5", typeOfWiring: "T+E" },
  { circuitNumber: 6, description: "Shower", ocpdType: "B", ocpdRating: "40", liveCsa: "10.0", cpcCsa: "4.0", typeOfWiring: "T+E" },
  { circuitNumber: 7, description: "Immersion Heater", ocpdType: "B", ocpdRating: "16", liveCsa: "2.5", cpcCsa: "1.5", typeOfWiring: "T+E" },
  { circuitNumber: 8, description: "Smoke/CO Alarms", ocpdType: "B", ocpdRating: "6", liveCsa: "1.5", cpcCsa: "1.0", typeOfWiring: "T+E" },
];

// ── Create empty circuit ──

function createEmptyCircuit(circuitNumber: number | string = ""): BoardCircuit {
  return {
    id: crypto.randomUUID(),
    circuitNumber,
    description: "",
    phase: "",
    isEmpty: false,
    typeOfWiring: "",
    referenceMethod: "",
    numberOfPoints: "",
    liveCsa: "",
    cpcCsa: "",
    ocpdNumberAndSize: "",
    maxDisconnectionTime: "",
    ocpdBsEn: "",
    ocpdType: "",
    ocpdRating: "",
    breakingCapacity: "",
    maxPermittedZs: "",
    rcdBsEn: "",
    rcdType: "",
    rcdRatedCurrent: "",
    rcdRating: "",
    ringR1: "",
    ringRn: "",
    ringR2: "",
    r1PlusR2: "",
    irTestVoltage: "",
    irLiveLive: "",
    irLiveEarth: "",
    polarityConfirmed: false,
    zsMaximum: "",
    zsMeasured: "",
    rcdDisconnectionTime: "",
    afddTestButton: false,
    afddManualTest: false,
    status: "",
    observationCode: "",
  };
}

// ── Props ──

interface EICRBoardScheduleProps {
  board: BoardData;
  allBoardNames: string[];
  onBoardChange: (updated: BoardData) => void;
  onDeleteBoard: () => void;
  onCopyBoard: () => void;
}

// ── Main component ──

export function EICRBoardSchedule({
  board,
  allBoardNames,
  onBoardChange,
  onDeleteBoard,
  onCopyBoard,
}: EICRBoardScheduleProps) {
  const [viewMode, setViewMode] = useState<"visual" | "table">("table");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [clipboard, setClipboard] = useState<BoardCircuit[] | null>(null);
  const [autoFillOpen, setAutoFillOpen] = useState(false);
  const [addCountOpen, setAddCountOpen] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const [scrolledPastFrozen, setScrolledPastFrozen] = useState(false);

  // Ensure circuits are in new format
  const circuits: BoardCircuit[] = board.circuits.map((c) =>
    c.circuitNumber !== undefined ? c : migrateCircuit(c as unknown as Record<string, unknown>)
  );

  // Track horizontal scroll for frozen column shadow
  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const onScroll = () => setScrolledPastFrozen(el.scrollLeft > 0);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ── Board header field update ──
  const updateHeader = useCallback((field: string, value: unknown) => {
    onBoardChange({ ...board, [field]: value });
  }, [board, onBoardChange]);

  // ── Circuit updates ──
  const updateCircuit = useCallback((rowIdx: number, field: string, value: unknown) => {
    const newCircuits = [...circuits];
    newCircuits[rowIdx] = { ...newCircuits[rowIdx], [field]: value };
    onBoardChange({ ...board, circuits: newCircuits });
  }, [board, circuits, onBoardChange]);

  // ── Toolbar actions ──
  const addCircuits = useCallback((count: number) => {
    const startNum = circuits.length > 0
      ? Math.max(...circuits.map(c => Number(c.circuitNumber) || 0)) + 1
      : 1;
    const newCircuits = Array.from({ length: count }, (_, i) =>
      createEmptyCircuit(startNum + i)
    );
    onBoardChange({ ...board, circuits: [...circuits, ...newCircuits] });
    setAddCountOpen(false);
  }, [board, circuits, onBoardChange]);

  const insertAbove = useCallback(() => {
    if (selectedRows.size === 0) return;
    const idx = Math.min(...selectedRows);
    const newCircuits = [...circuits];
    newCircuits.splice(idx, 0, createEmptyCircuit(""));
    // Renumber
    newCircuits.forEach((c, i) => { c.circuitNumber = i + 1; });
    onBoardChange({ ...board, circuits: newCircuits });
    setSelectedRows(new Set());
  }, [board, circuits, selectedRows, onBoardChange]);

  const copySelected = useCallback(() => {
    if (selectedRows.size === 0) return;
    const copied = [...selectedRows].sort((a, b) => a - b).map(i => ({ ...circuits[i] }));
    setClipboard(copied);
  }, [circuits, selectedRows]);

  const pasteClipboard = useCallback(() => {
    if (!clipboard || clipboard.length === 0) return;
    const insertIdx = selectedRows.size > 0 ? Math.max(...selectedRows) + 1 : circuits.length;
    const newCircuits = [...circuits];
    const pasted = clipboard.map(c => ({ ...c, id: crypto.randomUUID() }));
    newCircuits.splice(insertIdx, 0, ...pasted);
    newCircuits.forEach((c, i) => { c.circuitNumber = i + 1; });
    onBoardChange({ ...board, circuits: newCircuits });
    setSelectedRows(new Set());
  }, [board, circuits, clipboard, selectedRows, onBoardChange]);

  const deleteSelected = useCallback(() => {
    if (selectedRows.size === 0) return;
    const newCircuits = circuits.filter((_, i) => !selectedRows.has(i));
    newCircuits.forEach((c, i) => { c.circuitNumber = i + 1; });
    onBoardChange({ ...board, circuits: newCircuits });
    setSelectedRows(new Set());
  }, [board, circuits, selectedRows, onBoardChange]);

  const moveUp = useCallback(() => {
    if (selectedRows.size !== 1) return;
    const idx = [...selectedRows][0];
    if (idx === 0) return;
    const newCircuits = [...circuits];
    [newCircuits[idx - 1], newCircuits[idx]] = [newCircuits[idx], newCircuits[idx - 1]];
    newCircuits.forEach((c, i) => { c.circuitNumber = i + 1; });
    onBoardChange({ ...board, circuits: newCircuits });
    setSelectedRows(new Set([idx - 1]));
  }, [board, circuits, selectedRows, onBoardChange]);

  const moveDown = useCallback(() => {
    if (selectedRows.size !== 1) return;
    const idx = [...selectedRows][0];
    if (idx >= circuits.length - 1) return;
    const newCircuits = [...circuits];
    [newCircuits[idx], newCircuits[idx + 1]] = [newCircuits[idx + 1], newCircuits[idx]];
    newCircuits.forEach((c, i) => { c.circuitNumber = i + 1; });
    onBoardChange({ ...board, circuits: newCircuits });
    setSelectedRows(new Set([idx + 1]));
  }, [board, circuits, selectedRows, onBoardChange]);

  const fillDown = useCallback(() => {
    if (selectedRows.size < 2 || !editingCell) return;
    const sorted = [...selectedRows].sort((a, b) => a - b);
    const sourceRow = sorted[0];
    const sourceVal = (circuits[sourceRow] as Record<string, unknown>)[editingCell.col];
    const newCircuits = [...circuits];
    for (const idx of sorted.slice(1)) {
      newCircuits[idx] = { ...newCircuits[idx], [editingCell.col]: sourceVal };
    }
    onBoardChange({ ...board, circuits: newCircuits });
    setAutoFillOpen(false);
  }, [board, circuits, selectedRows, editingCell, onBoardChange]);

  const loadStandardDomestic = useCallback(() => {
    const newCircuits = STANDARD_DOMESTIC.map((preset, i) => ({
      ...createEmptyCircuit(i + 1),
      ...preset,
      id: crypto.randomUUID(),
    }));
    onBoardChange({ ...board, circuits: newCircuits });
    setAutoFillOpen(false);
  }, [board, onBoardChange]);

  const clearSelectedRows = useCallback(() => {
    if (selectedRows.size === 0) return;
    const newCircuits = [...circuits];
    for (const idx of selectedRows) {
      const cNum = newCircuits[idx].circuitNumber;
      const desc = newCircuits[idx].description;
      newCircuits[idx] = { ...createEmptyCircuit(cNum), description: desc };
    }
    onBoardChange({ ...board, circuits: newCircuits });
    setAutoFillOpen(false);
  }, [board, circuits, selectedRows, onBoardChange]);

  // ── Row selection ──
  const handleRowClick = useCallback((idx: number, e: React.MouseEvent) => {
    if (e.shiftKey && selectedRows.size > 0) {
      const last = Math.max(...selectedRows);
      const start = Math.min(last, idx);
      const end = Math.max(last, idx);
      const newSet = new Set(selectedRows);
      for (let i = start; i <= end; i++) newSet.add(i);
      setSelectedRows(newSet);
    } else if (e.ctrlKey || e.metaKey) {
      const newSet = new Set(selectedRows);
      if (newSet.has(idx)) newSet.delete(idx); else newSet.add(idx);
      setSelectedRows(newSet);
    } else {
      setSelectedRows(new Set([idx]));
    }
  }, [selectedRows]);

  // ── Cell editing ──
  const startEdit = useCallback((row: number, col: string) => {
    setEditingCell({ row, col });
  }, []);

  const commitEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const moveToNextCell = useCallback((row: number, col: string) => {
    const colIdx = COLUMNS.findIndex(c => c.key === col);
    if (colIdx < COLUMNS.length - 1) {
      setEditingCell({ row, col: COLUMNS[colIdx + 1].key });
    } else if (row < circuits.length - 1) {
      setEditingCell({ row: row + 1, col: COLUMNS[0].key });
    } else {
      setEditingCell(null);
    }
  }, [circuits.length]);

  // ── Cell input key handler ──
  const handleCellKeyDown = useCallback((e: React.KeyboardEvent, row: number, col: string) => {
    if (e.key === "Tab") {
      e.preventDefault();
      commitEdit();
      moveToNextCell(row, col);
    } else if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      commitEdit();
    }
  }, [commitEdit, moveToNextCell]);

  // ── Stats ──
  const stats = {
    pass: circuits.filter(c => c.status === "Pass").length,
    c1: circuits.filter(c => c.status === "C1").length,
    c2: circuits.filter(c => c.status === "C2").length,
    c3: circuits.filter(c => c.status === "C3").length,
    fi: circuits.filter(c => c.status === "FI").length,
    total: circuits.filter(c => !c.isEmpty).length,
  };

  // ── Render cell content ──
  const renderCell = (circuit: BoardCircuit, col: ColDef, rowIdx: number) => {
    const isEditing = editingCell?.row === rowIdx && editingCell?.col === col.key;
    const rawVal = (circuit as Record<string, unknown>)[col.key];

    if (col.type === "checkbox") {
      return (
        <input
          type="checkbox"
          checked={Boolean(rawVal)}
          onChange={(e) => updateCircuit(rowIdx, col.key, e.target.checked)}
          className="w-3.5 h-3.5 accent-[var(--primary)] cursor-pointer"
        />
      );
    }

    if (isEditing) {
      if (col.type === "select" && col.options) {
        return (
          <select
            value={String(rawVal ?? "")}
            onChange={(e) => updateCircuit(rowIdx, col.key, e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => handleCellKeyDown(e, rowIdx, col.key)}
            autoFocus
            className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--primary)] rounded px-1 py-0.5 text-[12px] outline-none"
          >
            <option value=""></option>
            {col.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      }
      return (
        <input
          type={col.type === "number" ? "text" : "text"}
          value={String(rawVal ?? "")}
          onChange={(e) => updateCircuit(rowIdx, col.key, e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => handleCellKeyDown(e, rowIdx, col.key)}
          autoFocus
          className="w-full bg-[var(--background)] text-[var(--foreground)] border border-[var(--primary)] rounded px-1 py-0.5 text-[12px] outline-none font-mono"
          inputMode={col.type === "number" ? "decimal" : "text"}
        />
      );
    }

    // Display mode
    const val = String(rawVal ?? "");
    if (col.key === "status" && val) {
      return (
        <span
          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
          style={{ background: STATUS_BG[val] || "transparent", color: STATUS_TEXT[val] || "inherit" }}
        >
          {val}
        </span>
      );
    }
    return <span className="text-[12px] font-mono truncate">{val || "\u00A0"}</span>;
  };

  // ── Supplied from options (other boards + default) ──
  const suppliedFromOptions = ["Origin", "Sub-main", ...allBoardNames.filter(n => n !== board.name)];

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl mb-6 overflow-hidden">
      {/* ── DISTRIBUTION BOARD DETAILS header ── */}
      <div className="border-b border-[var(--border)]">
        <div className="bg-[var(--primary)]/10 px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider text-[var(--primary)] uppercase">
            Distribution Board Details
          </span>
          <div className="flex items-center gap-2">
            <div className="flex bg-[var(--muted)] rounded-lg p-0.5">
              <button
                className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all border-none ${
                  viewMode === "table" ? "bg-[var(--primary)] text-white" : "bg-transparent text-[var(--muted-foreground)]"
                }`}
                onClick={() => setViewMode("table")}
              >
                Table
              </button>
              <button
                className={`px-3 py-1 rounded-md text-xs font-medium cursor-pointer transition-all border-none ${
                  viewMode === "visual" ? "bg-[var(--primary)] text-white" : "bg-transparent text-[var(--muted-foreground)]"
                }`}
                onClick={() => setViewMode("visual")}
              >
                Visual
              </button>
            </div>
            <button onClick={onCopyBoard} className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors" title="Copy board">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
            </button>
            <button onClick={onDeleteBoard} className="p-1.5 rounded-md text-[var(--muted-foreground)] hover:text-red-400 hover:bg-[var(--muted)] transition-colors" title="Delete board">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>
        <div className="p-4 space-y-3">
          {/* Row 1: DB Reference | Location | Supplied from */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">DB Reference</label>
              <input
                value={board.name}
                onChange={(e) => updateHeader("name", e.target.value)}
                className="w-full bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] transition-colors"
                placeholder="e.g. DB 1"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Location</label>
              <select
                value={board.location}
                onChange={(e) => updateHeader("location", e.target.value)}
                className="w-full bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] transition-colors"
              >
                <option value="">Select...</option>
                {LOCATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Supplied From</label>
              <select
                value={board.suppliedFrom}
                onChange={(e) => updateHeader("suppliedFrom", e.target.value)}
                className="w-full bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] transition-colors"
              >
                <option value="">Select...</option>
                {suppliedFromOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>
          {/* Row 2: OCPD fields + Phases */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">OCPD BS (EN)</label>
              <input
                value={board.ocpdBsEn}
                onChange={(e) => updateHeader("ocpdBsEn", e.target.value)}
                className="w-full bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] transition-colors"
                placeholder="e.g. 60898"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">OCPD Type</label>
              <select
                value={board.ocpdType}
                onChange={(e) => updateHeader("ocpdType", e.target.value)}
                className="w-full bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] transition-colors"
              >
                <option value="">Select...</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">OCPD Rating (A)</label>
              <input
                value={board.ocpdRating}
                onChange={(e) => updateHeader("ocpdRating", e.target.value)}
                className="w-full bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] transition-colors"
                placeholder="e.g. 100"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">No. of Phases</label>
              <select
                value={board.type === "three-phase" ? "3" : "1"}
                onChange={(e) => updateHeader("type", e.target.value === "3" ? "three-phase" : "single-phase")}
                className="w-full bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] transition-colors"
              >
                <option value="1">1 Phase</option>
                <option value="3">3 Phase</option>
              </select>
            </div>
          </div>
          {/* Row 3: SPD */}
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">SPD Type</label>
              <select
                value={board.spdType}
                onChange={(e) => updateHeader("spdType", e.target.value)}
                className="w-full bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] transition-colors"
              >
                <option value="">Select...</option>
                <option value="T1">T1</option>
                <option value="T2">T2</option>
                <option value="T1+T2">T1+T2</option>
                <option value="T3">T3</option>
                <option value="N/A">N/A</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={board.spdStatusChecked}
                  onChange={(e) => updateHeader("spdStatusChecked", e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--primary)]"
                />
                <span className="text-xs text-[var(--foreground)]">SPD status indicator checked</span>
              </label>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Zs at DB (&Omega;)</label>
              <input
                value={board.zsAtDb}
                onChange={(e) => updateHeader("zsAtDb", e.target.value)}
                className="w-full bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] transition-colors"
                placeholder="e.g. 0.35"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Ipf at DB (kA)</label>
              <input
                value={board.ipfAtDb}
                onChange={(e) => updateHeader("ipfAtDb", e.target.value)}
                className="w-full bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-sm outline-none focus:border-[var(--primary)] transition-colors"
                placeholder="e.g. 16"
              />
            </div>
          </div>
          {/* Row 4: Confirmations */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={board.supplyPolarityConfirmed}
                onChange={(e) => updateHeader("supplyPolarityConfirmed", e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--primary)]"
              />
              <span className="text-xs text-[var(--foreground)]">Supply polarity confirmed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={board.phaseSequenceConfirmed}
                onChange={(e) => updateHeader("phaseSequenceConfirmed", e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--primary)]"
              />
              <span className="text-xs text-[var(--foreground)]">Phase sequence confirmed</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <>
          {/* Circuit Toolbar */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] bg-[var(--muted)]/50 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setAddCountOpen(!addCountOpen)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--foreground)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 border border-[var(--primary)]/30 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add
              </button>
              {addCountOpen && (
                <div className="absolute top-full left-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-20 py-1 min-w-[100px]">
                  {[1, 5, 10].map(n => (
                    <button key={n} onClick={() => addCircuits(n)} className="w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--muted)] text-[var(--foreground)]">
                      Add {n} circuit{n > 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={insertAbove} disabled={selectedRows.size === 0} className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-40 transition-colors" title="Insert above selected">
              Insert
            </button>
            <button onClick={copySelected} disabled={selectedRows.size === 0} className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-40 transition-colors">
              Copy
            </button>
            <button onClick={pasteClipboard} disabled={!clipboard} className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-40 transition-colors">
              Paste
            </button>
            <button onClick={deleteSelected} disabled={selectedRows.size === 0} className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--muted-foreground)] hover:text-red-400 hover:bg-[var(--muted)] disabled:opacity-40 transition-colors">
              Delete
            </button>
            <div className="w-px h-5 bg-[var(--border)] mx-1" />
            <button onClick={moveUp} disabled={selectedRows.size !== 1} className="px-1.5 py-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-40 transition-colors" title="Move up">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
            </button>
            <button onClick={moveDown} disabled={selectedRows.size !== 1} className="px-1.5 py-1.5 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-40 transition-colors" title="Move down">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className="w-px h-5 bg-[var(--border)] mx-1" />
            <div className="relative">
              <button
                onClick={() => setAutoFillOpen(!autoFillOpen)}
                className="px-2.5 py-1.5 rounded-md text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                Auto Fill &#x25BE;
              </button>
              {autoFillOpen && (
                <div className="absolute top-full left-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg z-20 py-1 min-w-[160px]">
                  <button onClick={fillDown} disabled={selectedRows.size < 2} className="w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--muted)] text-[var(--foreground)] disabled:opacity-40">
                    Fill Down
                  </button>
                  <button onClick={loadStandardDomestic} className="w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--muted)] text-[var(--foreground)]">
                    Standard Domestic
                  </button>
                  <button onClick={clearSelectedRows} disabled={selectedRows.size === 0} className="w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--muted)] text-[var(--foreground)] disabled:opacity-40">
                    Clear Row(s)
                  </button>
                </div>
              )}
            </div>
            {/* Stats */}
            <div className="ml-auto flex items-center gap-3 text-[11px]">
              <span className="text-[var(--muted-foreground)]">{stats.total} circuits</span>
              {stats.pass > 0 && <span className="text-[var(--success)] font-semibold">{stats.pass} Pass</span>}
              {stats.c1 > 0 && <span style={{ color: "#991B1B" }} className="font-semibold">{stats.c1} C1</span>}
              {stats.c2 > 0 && <span className="text-[var(--error)] font-semibold">{stats.c2} C2</span>}
              {stats.c3 > 0 && <span className="text-[var(--warning)] font-semibold">{stats.c3} C3</span>}
              {stats.fi > 0 && <span style={{ color: "#2563EB" }} className="font-semibold">{stats.fi} FI</span>}
            </div>
          </div>

          {/* Schedule table banner */}
          <div className="bg-[var(--primary)]/5 px-4 py-1.5 border-b border-[var(--border)]">
            <span className="text-[10px] font-bold tracking-wider text-[var(--primary)] uppercase">
              Schedule of Circuit Details and Test Results
            </span>
          </div>

          {/* Scrollable table */}
          <div ref={tableRef} className="overflow-x-auto overflow-y-auto max-h-[600px]" style={{ scrollbarWidth: "thin" }}>
            <table className="border-collapse" style={{ minWidth: COLUMNS.reduce((s, c) => s + c.width, 0) }}>
              <thead className="sticky top-0 z-10">
                {/* Row 1: Group headers */}
                <tr>
                  {GROUP_HEADERS.map((g, gi) => (
                    <th
                      key={gi}
                      colSpan={g.span}
                      className={`text-center text-[10px] font-bold uppercase tracking-wider border-b border-r border-[var(--border)] whitespace-nowrap ${
                        g.label ? "bg-[var(--muted)] text-[var(--foreground)]" : "bg-[var(--card)] text-transparent"
                      }`}
                      style={{
                        padding: "4px 2px",
                        ...(gi === 0 && scrolledPastFrozen ? {
                          position: "sticky" as const,
                          left: 0,
                          zIndex: 4,
                          boxShadow: "2px 0 4px rgba(0,0,0,0.15)",
                        } : {}),
                      }}
                    >
                      {g.label || "\u00A0"}
                    </th>
                  ))}
                </tr>
                {/* Row 2: Sub-group headers */}
                <tr>
                  {SUB_GROUP_HEADERS.map((sg, si) => {
                    const isFrozen = sg.startIdx < FROZEN_COUNT;
                    return (
                      <th
                        key={si}
                        colSpan={sg.span}
                        className={`text-center text-[9px] font-semibold uppercase tracking-wider border-b border-r border-[var(--border)] whitespace-nowrap ${
                          sg.label ? "bg-[var(--muted)]/70 text-[var(--muted-foreground)]" : "bg-[var(--card)]"
                        }`}
                        style={{
                          padding: "2px",
                          ...(isFrozen ? {
                            position: "sticky" as const,
                            left: COL_OFFSETS[sg.startIdx],
                            zIndex: 4,
                            ...(scrolledPastFrozen && sg.startIdx + sg.span >= FROZEN_COUNT ? { boxShadow: "2px 0 4px rgba(0,0,0,0.15)" } : {}),
                          } : {}),
                        }}
                      >
                        {sg.label || "\u00A0"}
                      </th>
                    );
                  })}
                </tr>
                {/* Row 3: Column headers */}
                <tr>
                  {COLUMNS.map((col, ci) => (
                    <th
                      key={col.key}
                      className="text-center text-[10px] font-semibold text-[var(--muted-foreground)] border-b-2 border-r border-[var(--border)] whitespace-nowrap bg-[var(--card)]"
                      style={{
                        width: col.width,
                        minWidth: col.width,
                        maxWidth: col.width,
                        padding: "4px 2px",
                        ...(ci < FROZEN_COUNT ? {
                          position: "sticky" as const,
                          left: COL_OFFSETS[ci],
                          zIndex: 4,
                          ...(scrolledPastFrozen && ci === FROZEN_COUNT - 1 ? { boxShadow: "2px 0 4px rgba(0,0,0,0.15)" } : {}),
                        } : {}),
                      }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {circuits.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} className="text-center py-8 text-[var(--muted-foreground)] text-sm">
                      No circuits. Click &quot;+ Add&quot; to add circuits.
                    </td>
                  </tr>
                ) : (
                  circuits.map((circuit, rowIdx) => (
                    <tr
                      key={circuit.id || rowIdx}
                      className={`transition-colors ${
                        selectedRows.has(rowIdx)
                          ? "bg-[var(--primary)]/10"
                          : rowIdx % 2 === 0
                            ? "bg-[var(--card)]"
                            : "bg-[var(--muted)]/30"
                      } hover:bg-[var(--primary)]/5`}
                    >
                      {COLUMNS.map((col, ci) => (
                        <td
                          key={col.key}
                          className={`border-b border-r border-[var(--border)] text-[var(--foreground)] ${
                            ci < FROZEN_COUNT ? "bg-inherit" : ""
                          }`}
                          style={{
                            width: col.width,
                            minWidth: col.width,
                            maxWidth: col.width,
                            padding: col.type === "checkbox" ? "2px 4px" : "2px 3px",
                            textAlign: col.type === "checkbox" ? "center" : "left",
                            ...(ci < FROZEN_COUNT ? {
                              position: "sticky" as const,
                              left: COL_OFFSETS[ci],
                              zIndex: 2,
                              ...(scrolledPastFrozen && ci === FROZEN_COUNT - 1 ? { boxShadow: "2px 0 4px rgba(0,0,0,0.15)" } : {}),
                            } : {}),
                          }}
                          onClick={(e) => {
                            if (ci === 0) {
                              handleRowClick(rowIdx, e);
                            } else if (col.type !== "checkbox") {
                              startEdit(rowIdx, col.key);
                            }
                          }}
                        >
                          {renderCell(circuit, col, rowIdx)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Type of Wiring O-Other */}
          <div className="px-4 py-2 border-t border-[var(--border)] flex items-center gap-3">
            <label className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">Type of Wiring O-Other:</label>
            <input
              value={board.typeOfWiringOther}
              onChange={(e) => updateHeader("typeOfWiringOther", e.target.value)}
              className="flex-1 bg-[var(--muted)] text-[var(--foreground)] border border-[var(--border)] rounded-lg px-2.5 py-1 text-sm outline-none focus:border-[var(--primary)] max-w-md transition-colors"
              placeholder="Specify non-standard wiring types..."
            />
          </div>
        </>
      )}

      {/* ── VISUAL VIEW ── */}
      {viewMode === "visual" && (
        <VisualBoardView
          board={board}
          circuits={circuits}
          stats={stats}
          updateCircuit={updateCircuit}
          addCircuits={addCircuits}
          onBoardChange={onBoardChange}
        />
      )}
    </div>
  );
}
