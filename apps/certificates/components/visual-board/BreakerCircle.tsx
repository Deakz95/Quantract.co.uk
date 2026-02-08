"use client";

import type { BoardCircuit } from "@quantract/shared/certificate-types";
import {
  STATUS_BORDER,
  STATUS_GLOW,
  STATUS_ICON,
  STATUS_DASHED,
  STATUS_DOT_BG,
} from "../../lib/boardVisualConstants";

interface BreakerCircleProps {
  circuit: BoardCircuit;
  index: number;
  isSelected: boolean;
  onClick: (index: number) => void;
  boardType: string;
  // Drag reorder
  onDragStart?: (index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (index: number) => void;
  // Context menu
  onContextMenu?: (e: React.MouseEvent, index: number) => void;
}

export function BreakerCircle({
  circuit,
  index,
  isSelected,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  onContextMenu,
}: BreakerCircleProps) {
  const status = circuit.status || "";
  const rating = circuit.ocpdRating || (circuit as Record<string, unknown>).rating as string || "";
  const devType = circuit.ocpdType || (circuit as Record<string, unknown>).type as string || "";
  const isSpare = circuit.isEmpty || (!circuit.description && !rating && !devType && !status);
  const isDashed = STATUS_DASHED.has(status) || isSpare;
  const untested = !status;
  const borderClass = STATUS_BORDER[status] || STATUS_BORDER[""];
  const glowShadow = STATUS_GLOW[status] || STATUS_GLOW[""];
  const IconComponent = status ? STATUS_ICON[status] : null;
  const dotBg = status ? STATUS_DOT_BG[status] || "bg-gray-600" : "";

  const hasRcd = circuit.rcdRatedCurrent && circuit.rcdRatedCurrent !== "N/A";
  const hasRcbo = circuit.rcdType && circuit.ocpdType;
  const hasAfdd = circuit.afddTestButton || circuit.afddManualTest;

  return (
    <div
      className="w-20 cursor-pointer group flex flex-col items-center"
      draggable
      onDragStart={() => onDragStart?.(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, index); }}
      onDrop={() => onDrop?.(index)}
      onContextMenu={(e) => onContextMenu?.(e, index)}
      onClick={() => onClick(index)}
    >
      {/* Circle */}
      <div className="relative">
        <div
          className={`w-16 h-16 rounded-full border-[3px] flex flex-col items-center justify-center transition-all duration-200 bg-[var(--card)] group-hover:scale-105 ${borderClass} ${
            isDashed ? "border-dashed" : ""
          } ${untested && !isSpare ? "opacity-60" : ""} ${
            isSpare ? "opacity-50 border-dashed border-gray-600" : ""
          } ${isSelected ? "ring-2 ring-[var(--primary)]" : ""}`}
          style={{
            boxShadow: isSelected ? `${glowShadow}, 0 0 0 2px var(--primary)` : undefined,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = glowShadow;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.boxShadow = isSelected
              ? `${glowShadow}, 0 0 0 2px var(--primary)`
              : "";
          }}
        >
          {isSpare ? (
            <span className="text-[11px] text-[var(--muted-foreground)] font-medium">Spare</span>
          ) : (
            <>
              <span className="text-[10px] text-[var(--muted-foreground)] leading-none">
                {circuit.circuitNumber}
              </span>
              <span className="font-mono text-[18px] font-bold text-[var(--foreground)] leading-tight">
                {rating ? `${rating}A` : "—"}
              </span>
              <span className="text-[11px] text-[var(--muted-foreground)] font-semibold leading-none">
                {devType || "—"}
              </span>
            </>
          )}
        </div>

        {/* Status icon dot */}
        {status && IconComponent && (
          <div
            className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${dotBg} ${
              status === "C1" ? "animate-pulse" : ""
            }`}
          >
            <IconComponent className="w-3 h-3 text-white" strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
        {hasRcd && !hasRcbo && (
          <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-blue-500/20 text-blue-400">
            RCD
          </span>
        )}
        {hasRcbo && (
          <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-purple-500/20 text-purple-400">
            RCBO
          </span>
        )}
        {hasAfdd && (
          <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-cyan-500/20 text-cyan-400">
            AFDD
          </span>
        )}
      </div>

      {/* Description */}
      {!isSpare && circuit.description && (
        <span className="text-[9px] text-[var(--muted-foreground)] text-center leading-tight mt-0.5 line-clamp-2 max-w-full">
          {circuit.description}
        </span>
      )}
    </div>
  );
}
