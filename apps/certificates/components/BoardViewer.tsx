"use client";

import { useState } from "react";

// Phase colors - kept as is since they're semantic (L1=red, L2=yellow/black, L3=blue)
const PHASE_COLORS = {
  L1: "#EF4444",
  L2: "#F59E0B",
  L3: "#3B82F6",
};

// Status colors reference CSS variables
const STATUS_COLORS = {
  pass: "var(--success)",
  fail: "var(--error)",
  warning: "var(--warning)",
  untested: "var(--muted-foreground)",
};

export interface Circuit {
  id: string;
  num: number | string;
  description: string;
  type: string; // B, C, D
  rating: string; // e.g., "32A"
  phase?: "L1" | "L2" | "L3" | "TPN";
  bsen?: string;
  cableMm2?: string;
  cpcMm2?: string;
  maxZs?: string;
  zs?: string;
  r1r2?: string;
  r2?: string;
  insMohm?: string;
  rcdMa?: string;
  rcdMs?: string;
  status: "pass" | "fail" | "warning" | "untested";
  code?: string; // C1, C2, C3, or empty
  isEmpty?: boolean;
}

export interface BoardData {
  id: string;
  name: string;
  description: string;
  type: "single-phase" | "three-phase";
  mainSwitch?: {
    rating: string;
    type: string;
  };
  circuits: Circuit[];
}

interface BoardViewerProps {
  board: BoardData;
  onCircuitClick?: (circuit: Circuit) => void;
}

export function BoardViewer({ board, onCircuitClick }: BoardViewerProps) {
  const [viewMode, setViewMode] = useState<"visual" | "table">("visual");

  const stats = {
    pass: board.circuits.filter((c) => c.status === "pass" && !c.isEmpty).length,
    warning: board.circuits.filter((c) => c.status === "warning").length,
    fail: board.circuits.filter((c) => c.status === "fail").length,
    spare: board.circuits.filter((c) => c.isEmpty).length,
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 mb-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="text-lg font-bold flex items-center gap-3 text-[var(--foreground)]">
            <div className="w-9 h-9 bg-[var(--muted)] rounded-xl flex items-center justify-center text-[var(--warning)]">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {board.name}
          </div>
          <div className="text-[var(--muted-foreground)] text-sm mt-1">{board.description}</div>
        </div>
        <div className="flex bg-[var(--muted)] rounded-xl p-1">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all border-none ${
              viewMode === "visual" ? "bg-[var(--primary)] text-white" : "bg-transparent text-[var(--muted-foreground)]"
            }`}
            onClick={() => setViewMode("visual")}
          >
            Visual
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all border-none ${
              viewMode === "table" ? "bg-[var(--primary)] text-white" : "bg-transparent text-[var(--muted-foreground)]"
            }`}
            onClick={() => setViewMode("table")}
          >
            Table
          </button>
        </div>
      </div>

      {/* Visual View */}
      {viewMode === "visual" && (
        <div className="bg-[var(--muted)] border-2 border-[var(--border)] rounded-2xl p-6 relative">
          <div className="absolute -top-3 left-6 bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--warning)] rounded-md border border-[var(--border)]">
            {board.type === "three-phase" ? "400V 3-PHASE TP&N" : "230V SINGLE PHASE"}
          </div>

          {/* Phase Legend for 3-phase */}
          {board.type === "three-phase" && (
            <div className="flex gap-6 mb-6 justify-center">
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <div className="w-4 h-4 rounded-full" style={{ background: PHASE_COLORS.L1 }} />
                <span>L1 (Brown)</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <div className="w-4 h-4 rounded-full" style={{ background: PHASE_COLORS.L2 }} />
                <span>L2 (Black)</span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                <div className="w-4 h-4 rounded-full" style={{ background: PHASE_COLORS.L3 }} />
                <span>L3 (Grey)</span>
              </div>
            </div>
          )}

          {/* Main Incomer */}
          {board.mainSwitch && (
            <div className="flex justify-center mb-6 pb-6 border-b-2 border-dashed border-[var(--border)]">
              <div className="bg-[var(--card)] border-[3px] border-[var(--warning)] rounded-xl px-8 py-4 text-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                <div className="text-[10px] text-[var(--warning)] font-semibold uppercase tracking-wider mb-2">
                  Main {board.mainSwitch.type}
                </div>
                <div className="font-mono text-[28px] font-bold text-[var(--foreground)]">
                  {board.mainSwitch.rating}
                </div>
              </div>
            </div>
          )}

          {/* Busbar for 3-phase */}
          {board.type === "three-phase" && (
            <div className="flex justify-center gap-1 mb-4">
              <div className="h-2 flex-1 max-w-[800px] rounded" style={{ background: PHASE_COLORS.L1 }} />
              <div className="h-2 flex-1 max-w-[800px] rounded" style={{ background: PHASE_COLORS.L2 }} />
              <div className="h-2 flex-1 max-w-[800px] rounded" style={{ background: PHASE_COLORS.L3 }} />
            </div>
          )}

          {/* Circuits Grid */}
          {board.type === "single-phase" ? (
            <SinglePhaseGrid circuits={board.circuits} onCircuitClick={onCircuitClick} />
          ) : (
            <ThreePhaseGrid circuits={board.circuits} onCircuitClick={onCircuitClick} />
          )}

          {/* Stats Bar */}
          <div className="flex gap-6 mt-6 py-4 px-6 bg-[var(--card)] rounded-xl justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--success)]" />
              <span className="text-sm text-[var(--muted-foreground)]">
                <strong className="text-[var(--foreground)]">{stats.pass}</strong> Pass
              </span>
            </div>
            {stats.warning > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--warning)]" />
                <span className="text-sm text-[var(--muted-foreground)]">
                  <strong className="text-[var(--foreground)]">{stats.warning}</strong> C3
                </span>
              </div>
            )}
            {stats.fail > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--error)]" />
                <span className="text-sm text-[var(--muted-foreground)]">
                  <strong className="text-[var(--foreground)]">{stats.fail}</strong> C2
                </span>
              </div>
            )}
            {stats.spare > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--muted-foreground)]" />
                <span className="text-sm text-[var(--muted-foreground)]">
                  <strong className="text-[var(--foreground)]">{stats.spare}</strong> Spare
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-[var(--muted)] border-2 border-[var(--border)] rounded-2xl overflow-hidden relative">
          <div className="absolute -top-3 left-6 bg-[var(--card)] px-3 py-1 text-xs font-semibold text-[var(--primary)] rounded-md border border-[var(--border)] z-[1]">
            SCHEDULE OF CIRCUIT DETAILS
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto mt-3">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">Cct</th>
                  {board.type === "three-phase" && <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">Phase</th>}
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">Description</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">Type</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">Rating</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">BSen</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">Cable mm2</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">CPC mm2</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">Max Zs</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">Zs</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">R1+R2</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">Ins M</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">RCD mA</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">RCD ms</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">Status</th>
                  <th className="p-3.5 text-left font-semibold text-[var(--muted-foreground)] text-xs uppercase tracking-wide border-b-2 border-[var(--border)] whitespace-nowrap bg-[var(--card)] sticky top-0">Code</th>
                </tr>
              </thead>
              <tbody>
                {board.circuits
                  .filter((c) => !c.isEmpty)
                  .map((circuit) => (
                    <tr
                      key={circuit.id}
                      className={`transition-colors cursor-pointer hover:bg-[var(--card)] ${circuit.phase === "TPN" ? "bg-[var(--card)]" : ""}`}
                      onClick={() => onCircuitClick?.(circuit)}
                    >
                      <td className="p-3 border-b border-[var(--border)] font-mono text-xs text-[var(--warning)] font-bold">{circuit.num}</td>
                      {board.type === "three-phase" && (
                        <td className="p-3 border-b border-[var(--border)]">
                          <PhaseBadge phase={circuit.phase} />
                        </td>
                      )}
                      <td className="p-3 border-b border-[var(--border)] text-xs text-[var(--foreground)] font-medium">{circuit.description}</td>
                      <td className="p-3 border-b border-[var(--border)] font-mono text-xs text-[var(--foreground)]">{circuit.type}</td>
                      <td className="p-3 border-b border-[var(--border)] font-mono text-xs text-[var(--foreground)]">{circuit.rating}</td>
                      <td className="p-3 border-b border-[var(--border)] font-mono text-xs text-[var(--foreground)]">{circuit.bsen || "-"}</td>
                      <td className="p-3 border-b border-[var(--border)] font-mono text-xs text-[var(--foreground)]">{circuit.cableMm2 || "-"}</td>
                      <td className="p-3 border-b border-[var(--border)] font-mono text-xs text-[var(--foreground)]">{circuit.cpcMm2 || "-"}</td>
                      <td className="p-3 border-b border-[var(--border)] font-mono text-xs text-[var(--foreground)]">{circuit.maxZs || "-"}</td>
                      <td className="p-3 border-b border-[var(--border)] font-mono text-xs text-[var(--foreground)]">{circuit.zs || "-"}</td>
                      <td className="p-3 border-b border-[var(--border)] font-mono text-xs text-[var(--foreground)]">{circuit.r1r2 || "-"}</td>
                      <td className="p-3 border-b border-[var(--border)] font-mono text-xs text-[var(--foreground)]">{circuit.insMohm || "-"}</td>
                      <td className={`p-3 border-b border-[var(--border)] font-mono text-xs ${circuit.rcdMa ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                        {circuit.rcdMa || "N/A"}
                      </td>
                      <td className={`p-3 border-b border-[var(--border)] font-mono text-xs ${circuit.rcdMs ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}`}>
                        {circuit.rcdMs || "N/A"}
                      </td>
                      <td className="p-3 border-b border-[var(--border)]">
                        <StatusBadge status={circuit.status} />
                      </td>
                      <td className="p-3 border-b border-[var(--border)]">
                        <CodeBadge code={circuit.code} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Single Phase Grid Component
function SinglePhaseGrid({
  circuits,
  onCircuitClick,
}: {
  circuits: Circuit[];
  onCircuitClick?: (circuit: Circuit) => void;
}) {
  return (
    <div className="flex gap-2 flex-wrap justify-center">
      {circuits.map((circuit) => (
        <div
          key={circuit.id}
          className={`w-[72px] bg-[var(--card)] border-2 rounded-xl p-2.5 text-center cursor-pointer transition-all ${
            circuit.isEmpty ? "border-dashed border-[var(--border)] opacity-50" : ""
          }`}
          style={{
            borderColor: circuit.isEmpty ? undefined : STATUS_COLORS[circuit.status],
            borderStyle: circuit.isEmpty ? "dashed" : "solid",
          }}
          onClick={() => !circuit.isEmpty && onCircuitClick?.(circuit)}
        >
          <div className="font-mono text-base font-bold text-[var(--foreground)]">{circuit.isEmpty ? "-" : circuit.rating}</div>
          <div className="text-xs text-[var(--muted-foreground)] font-semibold mb-1.5">{circuit.isEmpty ? "-" : circuit.type}</div>
          {!circuit.isEmpty && (
            <div
              className="w-5 h-5 rounded-full mx-auto mb-1.5 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: STATUS_COLORS[circuit.status] }}
            >
              {circuit.status === "pass" ? "✓" : circuit.status === "fail" ? "✗" : "!"}
            </div>
          )}
          <div className="text-[9px] text-[var(--muted-foreground)] font-medium leading-tight">{circuit.isEmpty ? "Spare" : circuit.description}</div>
        </div>
      ))}
    </div>
  );
}

// Three Phase Grid Component
function ThreePhaseGrid({
  circuits,
  onCircuitClick,
}: {
  circuits: Circuit[];
  onCircuitClick?: (circuit: Circuit) => void;
}) {
  const l1Circuits = circuits.filter((c) => c.phase === "L1");
  const l2Circuits = circuits.filter((c) => c.phase === "L2");
  const l3Circuits = circuits.filter((c) => c.phase === "L3");
  const tpnCircuits = circuits.filter((c) => c.phase === "TPN");

  return (
    <div className="flex flex-col gap-2">
      {/* L1 Row */}
      <div className="flex items-center gap-2">
        <div className="w-10 font-mono text-sm font-bold text-center p-2 rounded-lg shrink-0 text-white" style={{ background: PHASE_COLORS.L1 }}>L1</div>
        <div className="flex gap-1.5 flex-1 overflow-x-auto py-1">
          {l1Circuits.map((circuit) => (
            <Circuit3P key={circuit.id} circuit={circuit} onClick={onCircuitClick} />
          ))}
        </div>
      </div>

      {/* L2 Row */}
      <div className="flex items-center gap-2">
        <div className="w-10 font-mono text-sm font-bold text-center p-2 rounded-lg shrink-0 text-black" style={{ background: PHASE_COLORS.L2 }}>L2</div>
        <div className="flex gap-1.5 flex-1 overflow-x-auto py-1">
          {l2Circuits.map((circuit) => (
            <Circuit3P key={circuit.id} circuit={circuit} onClick={onCircuitClick} />
          ))}
        </div>
      </div>

      {/* L3 Row */}
      <div className="flex items-center gap-2">
        <div className="w-10 font-mono text-sm font-bold text-center p-2 rounded-lg shrink-0 text-white" style={{ background: PHASE_COLORS.L3 }}>L3</div>
        <div className="flex gap-1.5 flex-1 overflow-x-auto py-1">
          {l3Circuits.map((circuit) => (
            <Circuit3P key={circuit.id} circuit={circuit} onClick={onCircuitClick} />
          ))}
        </div>
      </div>

      {/* TPN Section */}
      {tpnCircuits.length > 0 && (
        <div className="mt-8 pt-6 border-t-2 border-dashed border-[var(--border)]">
          <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-4 text-center">3-Phase (TP&N) Circuits</div>
          <div className="flex gap-3 justify-center flex-wrap">
            {tpnCircuits.map((circuit) => (
              <div
                key={circuit.id}
                className="bg-[var(--card)] border-2 rounded-xl p-4 text-center cursor-pointer transition-all min-w-[100px]"
                style={{ borderColor: STATUS_COLORS[circuit.status] }}
                onClick={() => onCircuitClick?.(circuit)}
              >
                <div className="flex gap-1 justify-center mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: PHASE_COLORS.L1 }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: PHASE_COLORS.L2 }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: PHASE_COLORS.L3 }} />
                </div>
                <div className="font-mono text-xl font-bold text-[var(--foreground)]">{circuit.rating}</div>
                <div className="text-xs text-[var(--muted-foreground)] font-semibold">{circuit.type}</div>
                <div
                  className="w-5 h-5 rounded-full mx-auto my-1.5 flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: STATUS_COLORS[circuit.status] }}
                >
                  {circuit.status === "pass" ? "✓" : circuit.status === "fail" ? "✗" : "!"}
                </div>
                <div className="text-[9px] text-[var(--muted-foreground)] font-medium mt-1">{circuit.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Individual 3-phase circuit
function Circuit3P({ circuit, onClick }: { circuit: Circuit; onClick?: (circuit: Circuit) => void }) {
  return (
    <div
      className={`min-w-[64px] bg-[var(--card)] border-2 rounded-lg py-2 px-1 text-center cursor-pointer transition-all shrink-0 ${
        circuit.isEmpty ? "border-dashed border-[var(--border)] opacity-50" : ""
      }`}
      style={{
        borderColor: circuit.isEmpty ? undefined : STATUS_COLORS[circuit.status],
        borderStyle: circuit.isEmpty ? "dashed" : "solid",
      }}
      onClick={() => !circuit.isEmpty && onClick?.(circuit)}
    >
      <div className="font-mono text-sm font-bold text-[var(--foreground)]">{circuit.isEmpty ? "-" : circuit.rating}</div>
      <div className="text-[10px] text-[var(--muted-foreground)] font-semibold mb-1">{circuit.isEmpty ? "-" : circuit.type}</div>
      {!circuit.isEmpty && (
        <div
          className="w-4 h-4 rounded-full mx-auto mb-1 flex items-center justify-center text-[8px] font-bold text-white"
          style={{ background: STATUS_COLORS[circuit.status] }}
        >
          {circuit.status === "pass" ? "✓" : circuit.status === "fail" ? "✗" : "!"}
        </div>
      )}
      <div className="text-[8px] text-[var(--muted-foreground)] font-medium">{circuit.isEmpty ? "Spare" : circuit.description}</div>
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }: { status: Circuit["status"] }) {
  const bgColors: Record<string, string> = {
    pass: "rgba(16, 185, 129, 0.2)",
    fail: "rgba(239, 68, 68, 0.2)",
    warning: "rgba(245, 158, 11, 0.2)",
    untested: "rgba(100, 116, 139, 0.2)",
  };

  const labels: Record<string, string> = {
    pass: "Pass",
    fail: "C2",
    warning: "C3",
    untested: "-",
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-2xl text-[11px] font-semibold"
      style={{ background: bgColors[status], color: STATUS_COLORS[status] }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: STATUS_COLORS[status] }}
      />
      {labels[status]}
    </span>
  );
}

// Code Badge Component
function CodeBadge({ code }: { code?: string }) {
  if (!code || code === "-") {
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[var(--muted)] text-[var(--muted-foreground)]">
        -
      </span>
    );
  }

  const bgColor = code === "C1" || code === "C2" ? "var(--error)" : code === "C3" ? "var(--warning)" : "var(--muted)";
  const textColor = code === "C3" ? "#000" : "#fff";

  return (
    <span
      className="px-2 py-0.5 rounded text-[11px] font-bold"
      style={{ background: bgColor, color: textColor }}
    >
      {code}
    </span>
  );
}

// Phase Badge Component
function PhaseBadge({ phase }: { phase?: Circuit["phase"] }) {
  if (phase === "TPN") {
    return (
      <span
        className="inline-block px-2 h-6 leading-6 rounded-md text-[11px] font-bold text-white"
        style={{ background: `linear-gradient(90deg, ${PHASE_COLORS.L1}, ${PHASE_COLORS.L2}, ${PHASE_COLORS.L3})` }}
      >
        3P
      </span>
    );
  }

  const color = phase ? PHASE_COLORS[phase] : "var(--muted-foreground)";
  const textColor = phase === "L2" ? "#000" : "#fff";

  return (
    <span
      className="inline-block w-6 h-6 leading-6 rounded-md text-center text-[11px] font-bold"
      style={{ background: color, color: textColor }}
    >
      {phase || "-"}
    </span>
  );
}

export default BoardViewer;
