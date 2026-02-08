"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { BoardData, BoardCircuit } from "@quantract/shared/certificate-types";
import { Plus } from "lucide-react";
import { MainSwitchBreaker } from "./MainSwitchBreaker";
import { BreakerCircle } from "./BreakerCircle";
import { SummaryStatsBar } from "./SummaryStatsBar";
import { CircuitWizardDrawer } from "./CircuitWizardDrawer";
import { CircuitPresetPicker } from "./CircuitPresetPicker";
import { ThreePhaseLayout } from "./ThreePhaseLayout";
import type { CircuitPreset } from "../../lib/circuitPresets";

interface VisualBoardViewProps {
  board: BoardData;
  circuits: BoardCircuit[];
  stats: { pass: number; c1: number; c2: number; c3: number; fi: number; total: number };
  updateCircuit: (rowIdx: number, field: string, value: unknown) => void;
  addCircuits: (count: number) => void;
  onBoardChange: (updated: BoardData) => void;
}

// Create empty circuit helper (duplicated from parent to avoid circular dep)
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

export function VisualBoardView({
  board,
  circuits,
  stats,
  updateCircuit,
  addCircuits,
  onBoardChange,
}: VisualBoardViewProps) {
  const [selectedCircuitIdx, setSelectedCircuitIdx] = useState<number | null>(null);
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; index: number } | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const nonEmptyCircuits = circuits.filter((c) => !c.isEmpty);
  const isThreePhase = board.type === "three-phase";

  // ── Drag reorder ──
  const handleDragStart = useCallback((index: number) => {
    setDragIdx(index);
  }, []);

  const handleDragOver = useCallback((_e: React.DragEvent, _index: number) => {
    // Visual feedback could go here
  }, []);

  const handleDrop = useCallback(
    (dropIndex: number) => {
      if (dragIdx === null || dragIdx === dropIndex) {
        setDragIdx(null);
        return;
      }
      const newCircuits = [...circuits];
      const [moved] = newCircuits.splice(dragIdx, 1);
      newCircuits.splice(dropIndex, 0, moved);
      newCircuits.forEach((c, i) => {
        c.circuitNumber = i + 1;
      });
      onBoardChange({ ...board, circuits: newCircuits });
      setDragIdx(null);
    },
    [dragIdx, circuits, board, onBoardChange]
  );

  // ── Context menu ──
  const handleContextMenu = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, index });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const contextAction = useCallback(
    (action: string) => {
      if (contextMenu === null) return;
      const idx = contextMenu.index;
      const newCircuits = [...circuits];

      switch (action) {
        case "delete":
          newCircuits.splice(idx, 1);
          newCircuits.forEach((c, i) => { c.circuitNumber = i + 1; });
          onBoardChange({ ...board, circuits: newCircuits });
          if (selectedCircuitIdx === idx) setSelectedCircuitIdx(null);
          break;
        case "markPass":
          newCircuits[idx] = { ...newCircuits[idx], status: "Pass" };
          onBoardChange({ ...board, circuits: newCircuits });
          break;
        case "markNA":
          newCircuits[idx] = { ...newCircuits[idx], status: "N/A" };
          onBoardChange({ ...board, circuits: newCircuits });
          break;
        case "copy": {
          const copy = { ...newCircuits[idx], id: crypto.randomUUID() };
          newCircuits.splice(idx + 1, 0, copy);
          newCircuits.forEach((c, i) => { c.circuitNumber = i + 1; });
          onBoardChange({ ...board, circuits: newCircuits });
          break;
        }
      }
      setContextMenu(null);
    },
    [contextMenu, circuits, board, onBoardChange, selectedCircuitIdx]
  );

  // Close context menu on click outside
  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => closeContextMenu();
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu, closeContextMenu]);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when wizard drawer is open with focused input
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA";
      if (isInput) return;

      if (selectedCircuitIdx !== null && selectedCircuitIdx >= 0) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setSelectedCircuitIdx(Math.max(0, selectedCircuitIdx - 1));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setSelectedCircuitIdx(Math.min(circuits.length - 1, selectedCircuitIdx + 1));
        } else if (e.key === "Escape") {
          setSelectedCircuitIdx(null);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          const newCircuits = [...circuits];
          newCircuits.splice(selectedCircuitIdx, 1);
          newCircuits.forEach((c, i) => { c.circuitNumber = i + 1; });
          onBoardChange({ ...board, circuits: newCircuits });
          setSelectedCircuitIdx(null);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedCircuitIdx, circuits, board, onBoardChange]);

  // ── Wizard callbacks ──
  const handleWizardUpdate = useCallback(
    (field: string, value: unknown) => {
      if (selectedCircuitIdx !== null) {
        updateCircuit(selectedCircuitIdx, field, value);
      }
    },
    [selectedCircuitIdx, updateCircuit]
  );

  const handleWizardNavigate = useCallback(
    (direction: "prev" | "next") => {
      if (selectedCircuitIdx === null) return;
      if (direction === "prev" && selectedCircuitIdx > 0) {
        setSelectedCircuitIdx(selectedCircuitIdx - 1);
      } else if (direction === "next" && selectedCircuitIdx < circuits.length - 1) {
        setSelectedCircuitIdx(selectedCircuitIdx + 1);
      }
    },
    [selectedCircuitIdx, circuits.length]
  );

  // ── Preset picker ──
  const handlePresetSelect = useCallback(
    (preset: CircuitPreset) => {
      const nextNum = circuits.length > 0
        ? Math.max(...circuits.map((c) => Number(c.circuitNumber) || 0)) + 1
        : 1;
      const newCircuit: BoardCircuit = {
        ...createEmptyCircuit(nextNum),
        ...preset.defaults,
        id: crypto.randomUUID(),
        circuitNumber: nextNum,
      };
      const newCircuits = [...circuits, newCircuit];
      onBoardChange({ ...board, circuits: newCircuits });
      setPresetPickerOpen(false);
      // Open wizard for the new circuit
      setSelectedCircuitIdx(newCircuits.length - 1);
    },
    [circuits, board, onBoardChange]
  );

  return (
    <div ref={containerRef} className="p-6">
      <div className="bg-[var(--muted)] border-2 border-[var(--border)] rounded-2xl p-6 relative">
        {/* Phase label badge */}
        <div className="absolute -top-3 left-6 bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--warning)] rounded-md border border-[var(--border)]">
          {isThreePhase ? "400V 3-PHASE TP&N" : "230V SINGLE PHASE"}
          {board.location ? ` \u2014 ${board.location}` : ""}
          {board.suppliedFrom ? ` (from ${board.suppliedFrom})` : ""}
        </div>

        {/* Main switch */}
        {(board.mainSwitch?.rating || board.ocpdRating) && (
          <div className="mb-6 pb-6 border-b-2 border-dashed border-[var(--border)]">
            <MainSwitchBreaker
              ocpdType={board.ocpdType || board.mainSwitch?.type || "Switch"}
              ocpdRating={board.ocpdRating || board.mainSwitch?.rating || ""}
              boardType={board.type || "single-phase"}
            />
          </div>
        )}

        {/* Circuit breakers */}
        {isThreePhase ? (
          <ThreePhaseLayout
            circuits={circuits}
            selectedIdx={selectedCircuitIdx}
            onCircuitClick={(idx) => setSelectedCircuitIdx(idx)}
            boardType={board.type || "single-phase"}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onContextMenu={handleContextMenu}
          />
        ) : (
          <div className="flex gap-2 flex-wrap justify-center">
            {nonEmptyCircuits.map((circuit) => {
              const actualIdx = circuits.indexOf(circuit);
              return (
                <BreakerCircle
                  key={circuit.id || actualIdx}
                  circuit={circuit}
                  index={actualIdx}
                  isSelected={selectedCircuitIdx === actualIdx}
                  onClick={(idx) => setSelectedCircuitIdx(idx)}
                  boardType={board.type || "single-phase"}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onContextMenu={handleContextMenu}
                />
              );
            })}

            {/* Add circuit button */}
            <div className="w-20 flex flex-col items-center relative">
              <button
                ref={addBtnRef}
                onClick={() => setPresetPickerOpen(!presetPickerOpen)}
                className="w-16 h-16 rounded-full border-[3px] border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all group"
              >
                <Plus className="w-6 h-6 text-gray-500 group-hover:text-[var(--primary)] transition-colors" />
              </button>
              <span className="text-[9px] text-[var(--muted-foreground)] mt-1">Add</span>

              {/* Preset picker */}
              <CircuitPresetPicker
                isOpen={presetPickerOpen}
                onClose={() => setPresetPickerOpen(false)}
                onSelect={handlePresetSelect}
                anchorRef={addBtnRef}
              />
            </div>
          </div>
        )}

        {/* 3-phase add button */}
        {isThreePhase && (
          <div className="flex justify-center mt-4 relative">
            <button
              ref={addBtnRef}
              onClick={() => setPresetPickerOpen(!presetPickerOpen)}
              className="w-16 h-16 rounded-full border-[3px] border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all group"
            >
              <Plus className="w-6 h-6 text-gray-500 group-hover:text-[var(--primary)] transition-colors" />
            </button>
            <CircuitPresetPicker
              isOpen={presetPickerOpen}
              onClose={() => setPresetPickerOpen(false)}
              onSelect={handlePresetSelect}
              anchorRef={addBtnRef}
            />
          </div>
        )}

        {/* Stats bar */}
        <div className="mt-6">
          <SummaryStatsBar stats={stats} />
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-xl z-40 py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => contextAction("copy")}
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--muted)] text-[var(--foreground)]"
          >
            Duplicate
          </button>
          <button
            onClick={() => contextAction("markPass")}
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--muted)] text-emerald-400"
          >
            Mark Pass
          </button>
          <button
            onClick={() => contextAction("markNA")}
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--muted)] text-gray-400"
          >
            Mark N/A
          </button>
          <div className="h-px bg-[var(--border)] my-1" />
          <button
            onClick={() => contextAction("delete")}
            className="w-full px-3 py-1.5 text-xs text-left hover:bg-[var(--muted)] text-red-400"
          >
            Delete
          </button>
        </div>
      )}

      {/* Circuit wizard drawer */}
      {selectedCircuitIdx !== null && circuits[selectedCircuitIdx] && (
        <CircuitWizardDrawer
          circuit={circuits[selectedCircuitIdx]}
          circuitIndex={selectedCircuitIdx}
          totalCircuits={circuits.length}
          isOpen={selectedCircuitIdx !== null}
          onClose={() => setSelectedCircuitIdx(null)}
          onUpdate={handleWizardUpdate}
          onNavigate={handleWizardNavigate}
          boardType={board.type || "single-phase"}
        />
      )}
    </div>
  );
}
