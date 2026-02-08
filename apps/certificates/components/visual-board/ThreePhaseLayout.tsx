"use client";

import type { BoardCircuit } from "@quantract/shared/certificate-types";
import { PHASE_COLORS } from "../../lib/boardVisualConstants";
import { BreakerCircle } from "./BreakerCircle";

interface ThreePhaseLayoutProps {
  circuits: BoardCircuit[];
  selectedIdx: number | null;
  onCircuitClick: (index: number) => void;
  boardType: string;
  onDragStart?: (index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (index: number) => void;
  onContextMenu?: (e: React.MouseEvent, index: number) => void;
}

const PHASE_LABELS: { key: string; label: string; color: string }[] = [
  { key: "L1", label: "L1 (Red)", color: PHASE_COLORS.L1 },
  { key: "L2", label: "L2 (Yellow/Black)", color: PHASE_COLORS.L2 },
  { key: "L3", label: "L3 (Blue)", color: PHASE_COLORS.L3 },
];

export function ThreePhaseLayout({
  circuits,
  selectedIdx,
  onCircuitClick,
  boardType,
  onDragStart,
  onDragOver,
  onDrop,
  onContextMenu,
}: ThreePhaseLayoutProps) {
  // Build index map (we need original index for callbacks)
  const indexed = circuits.map((c, i) => ({ circuit: c, originalIndex: i }));

  const getPhaseCircuits = (phase: string) =>
    indexed.filter(({ circuit }) => circuit.phase === phase);

  const tpnCircuits = indexed.filter(
    ({ circuit }) => circuit.phase === "TPN" || circuit.phase === "3P"
  );

  const unassigned = indexed.filter(
    ({ circuit }) =>
      !circuit.phase || !["L1", "L2", "L3", "TPN", "3P"].includes(circuit.phase)
  );

  return (
    <div className="space-y-4">
      {/* Phase legend */}
      <div className="flex gap-4 justify-center">
        {PHASE_LABELS.map((p) => (
          <div key={p.key} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-[11px] font-semibold text-[var(--muted-foreground)]">
              {p.label}
            </span>
          </div>
        ))}
      </div>

      {/* Phase rows */}
      {PHASE_LABELS.map((phase) => {
        const phaseCircuits = getPhaseCircuits(phase.key);
        if (phaseCircuits.length === 0) return null;
        return (
          <div key={phase.key} className="relative">
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
              style={{ backgroundColor: phase.color }}
            />
            <div className="pl-4">
              <p
                className="text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ color: phase.color }}
              >
                {phase.label}
              </p>
              <div className="flex gap-2 flex-wrap">
                {phaseCircuits.map(({ circuit, originalIndex }) => (
                  <BreakerCircle
                    key={circuit.id || originalIndex}
                    circuit={circuit}
                    index={originalIndex}
                    isSelected={selectedIdx === originalIndex}
                    onClick={onCircuitClick}
                    boardType={boardType}
                    onDragStart={onDragStart}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onContextMenu={onContextMenu}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* TP&N / 3P circuits */}
      {tpnCircuits.length > 0 && (
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gray-500" />
          <div className="pl-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              TP&N / 3-Phase Circuits
            </p>
            <div className="flex gap-2 flex-wrap">
              {tpnCircuits.map(({ circuit, originalIndex }) => (
                <BreakerCircle
                  key={circuit.id || originalIndex}
                  circuit={circuit}
                  index={originalIndex}
                  isSelected={selectedIdx === originalIndex}
                  onClick={onCircuitClick}
                  boardType={boardType}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unassigned phase */}
      {unassigned.length > 0 && (
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 rounded-full bg-gray-600" />
          <div className="pl-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">
              Unassigned Phase
            </p>
            <div className="flex gap-2 flex-wrap">
              {unassigned.map(({ circuit, originalIndex }) => (
                <BreakerCircle
                  key={circuit.id || originalIndex}
                  circuit={circuit}
                  index={originalIndex}
                  isSelected={selectedIdx === originalIndex}
                  onClick={onCircuitClick}
                  boardType={boardType}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onContextMenu={onContextMenu}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
