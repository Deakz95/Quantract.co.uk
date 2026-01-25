"use client";

import { useState } from "react";

// Phase colors
const PHASE_COLORS = {
  L1: "#EF4444",
  L2: "#F59E0B",
  L3: "#3B82F6",
};

// Status colors
const STATUS_COLORS = {
  pass: "#10B981",
  fail: "#EF4444",
  warning: "#F59E0B",
  untested: "#64748B",
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
    <div style={styles.boardContainer}>
      {/* Header */}
      <div style={styles.boardHeader}>
        <div>
          <div style={styles.boardTitle}>
            <div style={styles.boardTitleIcon}>
              <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {board.name}
          </div>
          <div style={styles.boardMeta}>{board.description}</div>
        </div>
        <div style={styles.viewToggle}>
          <button
            style={{ ...styles.viewBtn, ...(viewMode === "visual" ? styles.viewBtnActive : {}) }}
            onClick={() => setViewMode("visual")}
          >
            Visual
          </button>
          <button
            style={{ ...styles.viewBtn, ...(viewMode === "table" ? styles.viewBtnActive : {}) }}
            onClick={() => setViewMode("table")}
          >
            Table
          </button>
        </div>
      </div>

      {/* Visual View */}
      {viewMode === "visual" && (
        <div style={styles.visualBoard}>
          <div style={styles.boardLabel}>{board.type === "three-phase" ? "400V 3-PHASE TP&N" : "230V SINGLE PHASE"}</div>

          {/* Phase Legend for 3-phase */}
          {board.type === "three-phase" && (
            <div style={styles.phaseLegend}>
              <div style={styles.phaseIndicator}>
                <div style={{ ...styles.phaseDot, background: PHASE_COLORS.L1 }} />
                <span>L1 (Brown)</span>
              </div>
              <div style={styles.phaseIndicator}>
                <div style={{ ...styles.phaseDot, background: PHASE_COLORS.L2 }} />
                <span>L2 (Black)</span>
              </div>
              <div style={styles.phaseIndicator}>
                <div style={{ ...styles.phaseDot, background: PHASE_COLORS.L3 }} />
                <span>L3 (Grey)</span>
              </div>
            </div>
          )}

          {/* Main Incomer */}
          {board.mainSwitch && (
            <div style={styles.mainIncomer}>
              <div style={styles.incomerUnit}>
                <div style={styles.incomerLabel}>Main {board.mainSwitch.type}</div>
                <div style={styles.incomerRating}>{board.mainSwitch.rating}</div>
              </div>
            </div>
          )}

          {/* Busbar for 3-phase */}
          {board.type === "three-phase" && (
            <div style={styles.busbarContainer}>
              <div style={{ ...styles.busbar, background: PHASE_COLORS.L1 }} />
              <div style={{ ...styles.busbar, background: PHASE_COLORS.L2 }} />
              <div style={{ ...styles.busbar, background: PHASE_COLORS.L3 }} />
            </div>
          )}

          {/* Circuits Grid */}
          {board.type === "single-phase" ? (
            <SinglePhaseGrid circuits={board.circuits} onCircuitClick={onCircuitClick} />
          ) : (
            <ThreePhaseGrid circuits={board.circuits} onCircuitClick={onCircuitClick} />
          )}

          {/* Stats Bar */}
          <div style={styles.statsBar}>
            <div style={styles.statItem}>
              <div style={{ ...styles.statDot, background: STATUS_COLORS.pass }} />
              <span style={styles.statText}>
                <strong>{stats.pass}</strong> Pass
              </span>
            </div>
            {stats.warning > 0 && (
              <div style={styles.statItem}>
                <div style={{ ...styles.statDot, background: STATUS_COLORS.warning }} />
                <span style={styles.statText}>
                  <strong>{stats.warning}</strong> C3
                </span>
              </div>
            )}
            {stats.fail > 0 && (
              <div style={styles.statItem}>
                <div style={{ ...styles.statDot, background: STATUS_COLORS.fail }} />
                <span style={styles.statText}>
                  <strong>{stats.fail}</strong> C2
                </span>
              </div>
            )}
            {stats.spare > 0 && (
              <div style={styles.statItem}>
                <div style={{ ...styles.statDot, background: STATUS_COLORS.untested }} />
                <span style={styles.statText}>
                  <strong>{stats.spare}</strong> Spare
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div style={styles.tableContainer}>
          <div style={styles.tableLabel}>SCHEDULE OF CIRCUIT DETAILS</div>
          <div style={styles.tableScroll}>
            <table style={styles.dataTable}>
              <thead>
                <tr>
                  <th style={styles.th}>Cct</th>
                  {board.type === "three-phase" && <th style={styles.th}>Phase</th>}
                  <th style={styles.th}>Description</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Rating</th>
                  <th style={styles.th}>BSen</th>
                  <th style={styles.th}>Cable mm2</th>
                  <th style={styles.th}>CPC mm2</th>
                  <th style={styles.th}>Max Zs</th>
                  <th style={styles.th}>Zs</th>
                  <th style={styles.th}>R1+R2</th>
                  <th style={styles.th}>Ins M</th>
                  <th style={styles.th}>RCD mA</th>
                  <th style={styles.th}>RCD ms</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Code</th>
                </tr>
              </thead>
              <tbody>
                {board.circuits
                  .filter((c) => !c.isEmpty)
                  .map((circuit) => (
                    <tr
                      key={circuit.id}
                      style={{ ...styles.tr, ...(circuit.phase === "TPN" ? styles.trTpn : {}) }}
                      onClick={() => onCircuitClick?.(circuit)}
                    >
                      <td style={{ ...styles.td, ...styles.circuitNum }}>{circuit.num}</td>
                      {board.type === "three-phase" && (
                        <td style={styles.td}>
                          <PhaseBadge phase={circuit.phase} />
                        </td>
                      )}
                      <td style={{ ...styles.td, ...styles.description }}>{circuit.description}</td>
                      <td style={styles.td}>{circuit.type}</td>
                      <td style={styles.td}>{circuit.rating}</td>
                      <td style={styles.td}>{circuit.bsen || "-"}</td>
                      <td style={styles.td}>{circuit.cableMm2 || "-"}</td>
                      <td style={styles.td}>{circuit.cpcMm2 || "-"}</td>
                      <td style={styles.td}>{circuit.maxZs || "-"}</td>
                      <td style={styles.td}>{circuit.zs || "-"}</td>
                      <td style={styles.td}>{circuit.r1r2 || "-"}</td>
                      <td style={styles.td}>{circuit.insMohm || "-"}</td>
                      <td style={{ ...styles.td, color: circuit.rcdMa ? "inherit" : "#64748B" }}>
                        {circuit.rcdMa || "N/A"}
                      </td>
                      <td style={{ ...styles.td, color: circuit.rcdMs ? "inherit" : "#64748B" }}>
                        {circuit.rcdMs || "N/A"}
                      </td>
                      <td style={styles.td}>
                        <StatusBadge status={circuit.status} />
                      </td>
                      <td style={styles.td}>
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
    <div style={styles.singlePhaseGrid}>
      {circuits.map((circuit) => (
        <div
          key={circuit.id}
          style={{
            ...styles.circuit,
            borderColor: circuit.isEmpty ? "#2D3B52" : STATUS_COLORS[circuit.status],
            opacity: circuit.isEmpty ? 0.5 : 1,
            borderStyle: circuit.isEmpty ? "dashed" : "solid",
          }}
          onClick={() => !circuit.isEmpty && onCircuitClick?.(circuit)}
        >
          <div style={styles.circuitRating}>{circuit.isEmpty ? "-" : circuit.rating}</div>
          <div style={styles.circuitType}>{circuit.isEmpty ? "-" : circuit.type}</div>
          {!circuit.isEmpty && (
            <div style={{ ...styles.circuitStatus, background: STATUS_COLORS[circuit.status] }}>
              {circuit.status === "pass" ? "✓" : circuit.status === "fail" ? "✗" : "!"}
            </div>
          )}
          <div style={styles.circuitName}>{circuit.isEmpty ? "Spare" : circuit.description}</div>
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
    <div style={styles.threePhaseLayout}>
      {/* L1 Row */}
      <div style={styles.phaseRow}>
        <div style={{ ...styles.phaseLabel, background: PHASE_COLORS.L1 }}>L1</div>
        <div style={styles.phaseCircuits}>
          {l1Circuits.map((circuit) => (
            <Circuit3P key={circuit.id} circuit={circuit} onClick={onCircuitClick} />
          ))}
        </div>
      </div>

      {/* L2 Row */}
      <div style={styles.phaseRow}>
        <div style={{ ...styles.phaseLabel, background: PHASE_COLORS.L2, color: "#000" }}>L2</div>
        <div style={styles.phaseCircuits}>
          {l2Circuits.map((circuit) => (
            <Circuit3P key={circuit.id} circuit={circuit} onClick={onCircuitClick} />
          ))}
        </div>
      </div>

      {/* L3 Row */}
      <div style={styles.phaseRow}>
        <div style={{ ...styles.phaseLabel, background: PHASE_COLORS.L3 }}>L3</div>
        <div style={styles.phaseCircuits}>
          {l3Circuits.map((circuit) => (
            <Circuit3P key={circuit.id} circuit={circuit} onClick={onCircuitClick} />
          ))}
        </div>
      </div>

      {/* TPN Section */}
      {tpnCircuits.length > 0 && (
        <div style={styles.tpnSection}>
          <div style={styles.tpnTitle}>3-Phase (TP&N) Circuits</div>
          <div style={styles.tpnCircuits}>
            {tpnCircuits.map((circuit) => (
              <div
                key={circuit.id}
                style={{
                  ...styles.circuitTpn,
                  borderColor: STATUS_COLORS[circuit.status],
                }}
                onClick={() => onCircuitClick?.(circuit)}
              >
                <div style={styles.phaseIndicators}>
                  <div style={{ ...styles.phaseMini, background: PHASE_COLORS.L1 }} />
                  <div style={{ ...styles.phaseMini, background: PHASE_COLORS.L2 }} />
                  <div style={{ ...styles.phaseMini, background: PHASE_COLORS.L3 }} />
                </div>
                <div style={{ ...styles.circuitRating, fontSize: "20px" }}>{circuit.rating}</div>
                <div style={styles.circuitType}>{circuit.type}</div>
                <div style={{ ...styles.circuitStatus, background: STATUS_COLORS[circuit.status] }}>
                  {circuit.status === "pass" ? "✓" : circuit.status === "fail" ? "✗" : "!"}
                </div>
                <div style={{ ...styles.circuitName, marginTop: "4px" }}>{circuit.description}</div>
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
      style={{
        ...styles.circuit3p,
        borderColor: circuit.isEmpty ? "#2D3B52" : STATUS_COLORS[circuit.status],
        opacity: circuit.isEmpty ? 0.5 : 1,
        borderStyle: circuit.isEmpty ? "dashed" : "solid",
      }}
      onClick={() => !circuit.isEmpty && onClick?.(circuit)}
    >
      <div style={{ ...styles.circuitRating, fontSize: "14px" }}>{circuit.isEmpty ? "-" : circuit.rating}</div>
      <div style={{ ...styles.circuitType, fontSize: "10px" }}>{circuit.isEmpty ? "-" : circuit.type}</div>
      {!circuit.isEmpty && (
        <div style={{ ...styles.circuitStatus, width: "16px", height: "16px", fontSize: "8px", background: STATUS_COLORS[circuit.status] }}>
          {circuit.status === "pass" ? "✓" : circuit.status === "fail" ? "✗" : "!"}
        </div>
      )}
      <div style={{ ...styles.circuitName, fontSize: "8px" }}>{circuit.isEmpty ? "Spare" : circuit.description}</div>
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
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "20px",
        fontSize: "11px",
        fontWeight: 600,
        background: bgColors[status],
        color: STATUS_COLORS[status],
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: STATUS_COLORS[status],
        }}
      />
      {labels[status]}
    </span>
  );
}

// Code Badge Component
function CodeBadge({ code }: { code?: string }) {
  if (!code || code === "-") {
    return (
      <span
        style={{
          padding: "2px 8px",
          borderRadius: "4px",
          fontSize: "11px",
          fontWeight: 700,
          background: "#232D42",
          color: "#64748B",
        }}
      >
        -
      </span>
    );
  }

  const bgColor = code === "C1" || code === "C2" ? "#EF4444" : code === "C3" ? "#F59E0B" : "#232D42";
  const textColor = code === "C3" ? "#000" : "#fff";

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: "4px",
        fontSize: "11px",
        fontWeight: 700,
        background: bgColor,
        color: textColor,
      }}
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
        style={{
          display: "inline-block",
          padding: "0 8px",
          height: "24px",
          lineHeight: "24px",
          borderRadius: "6px",
          fontSize: "11px",
          fontWeight: 700,
          background: `linear-gradient(90deg, ${PHASE_COLORS.L1}, ${PHASE_COLORS.L2}, ${PHASE_COLORS.L3})`,
          color: "#fff",
        }}
      >
        3P
      </span>
    );
  }

  const color = phase ? PHASE_COLORS[phase] : "#64748B";
  const textColor = phase === "L2" ? "#000" : "#fff";

  return (
    <span
      style={{
        display: "inline-block",
        width: "24px",
        height: "24px",
        lineHeight: "24px",
        borderRadius: "6px",
        textAlign: "center",
        fontSize: "11px",
        fontWeight: 700,
        background: color,
        color: textColor,
      }}
    >
      {phase || "-"}
    </span>
  );
}

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  boardContainer: {
    background: "#111827",
    border: "1px solid #2D3B52",
    borderRadius: "20px",
    padding: "32px",
    marginBottom: "32px",
  },
  boardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  boardTitle: {
    fontSize: "18px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: "12px",
    color: "#F8FAFC",
  },
  boardTitleIcon: {
    width: "36px",
    height: "36px",
    background: "#232D42",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#F59E0B",
  },
  boardMeta: {
    color: "#94A3B8",
    fontSize: "14px",
    marginTop: "4px",
  },
  viewToggle: {
    display: "flex",
    background: "#232D42",
    borderRadius: "10px",
    padding: "4px",
  },
  viewBtn: {
    padding: "8px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.2s",
    border: "none",
    background: "transparent",
    color: "#94A3B8",
    fontFamily: "inherit",
  },
  viewBtnActive: {
    background: "#3B82F6",
    color: "#fff",
  },
  visualBoard: {
    background: "#1A2235",
    border: "2px solid #2D3B52",
    borderRadius: "16px",
    padding: "24px",
    position: "relative" as const,
  },
  boardLabel: {
    position: "absolute" as const,
    top: "-12px",
    left: "24px",
    background: "#111827",
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#F59E0B",
    borderRadius: "6px",
    border: "1px solid #2D3B52",
  },
  phaseLegend: {
    display: "flex",
    gap: "24px",
    marginBottom: "24px",
    justifyContent: "center",
  },
  phaseIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#F8FAFC",
  },
  phaseDot: {
    width: "16px",
    height: "16px",
    borderRadius: "50%",
  },
  mainIncomer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "24px",
    paddingBottom: "24px",
    borderBottom: "2px dashed #2D3B52",
  },
  incomerUnit: {
    background: "#232D42",
    border: "3px solid #F59E0B",
    borderRadius: "12px",
    padding: "16px 32px",
    textAlign: "center" as const,
    boxShadow: "0 0 20px rgba(245, 158, 11, 0.3)",
  },
  incomerLabel: {
    fontSize: "10px",
    color: "#F59E0B",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    marginBottom: "8px",
  },
  incomerRating: {
    fontFamily: "monospace",
    fontSize: "28px",
    fontWeight: 700,
    color: "#F8FAFC",
  },
  busbarContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "4px",
    marginBottom: "16px",
  },
  busbar: {
    height: "8px",
    flex: 1,
    maxWidth: "800px",
    borderRadius: "4px",
  },
  singlePhaseGrid: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap" as const,
    justifyContent: "center",
  },
  circuit: {
    width: "72px",
    background: "#232D42",
    border: "2px solid",
    borderRadius: "10px",
    padding: "10px 6px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  circuitRating: {
    fontFamily: "monospace",
    fontSize: "16px",
    fontWeight: 700,
    color: "#F8FAFC",
  },
  circuitType: {
    fontSize: "12px",
    color: "#64748B",
    fontWeight: 600,
    marginBottom: "6px",
  },
  circuitStatus: {
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    margin: "0 auto 6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: "bold",
    color: "#fff",
  },
  circuitName: {
    fontSize: "9px",
    color: "#94A3B8",
    fontWeight: 500,
    lineHeight: 1.2,
  },
  statsBar: {
    display: "flex",
    gap: "24px",
    marginTop: "24px",
    padding: "16px 24px",
    background: "#232D42",
    borderRadius: "12px",
    justifyContent: "center",
  },
  statItem: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  statDot: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
  },
  statText: {
    fontSize: "13px",
    color: "#94A3B8",
  },
  threePhaseLayout: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
  },
  phaseRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  phaseLabel: {
    width: "40px",
    fontFamily: "monospace",
    fontSize: "14px",
    fontWeight: 700,
    textAlign: "center" as const,
    padding: "8px",
    borderRadius: "8px",
    flexShrink: 0,
    color: "#fff",
  },
  phaseCircuits: {
    display: "flex",
    gap: "6px",
    flex: 1,
    overflowX: "auto" as const,
    padding: "4px 0",
  },
  circuit3p: {
    minWidth: "64px",
    background: "#232D42",
    border: "2px solid",
    borderRadius: "8px",
    padding: "8px 4px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 0.2s",
    flexShrink: 0,
  },
  tpnSection: {
    marginTop: "32px",
    paddingTop: "24px",
    borderTop: "2px dashed #2D3B52",
  },
  tpnTitle: {
    fontSize: "12px",
    color: "#94A3B8",
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    marginBottom: "16px",
    textAlign: "center" as const,
  },
  tpnCircuits: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
    flexWrap: "wrap" as const,
  },
  circuitTpn: {
    background: "#232D42",
    border: "2px solid",
    borderRadius: "12px",
    padding: "16px",
    textAlign: "center" as const,
    cursor: "pointer",
    transition: "all 0.2s",
    minWidth: "100px",
  },
  phaseIndicators: {
    display: "flex",
    gap: "4px",
    justifyContent: "center",
    marginBottom: "8px",
  },
  phaseMini: {
    width: "12px",
    height: "12px",
    borderRadius: "50%",
  },
  tableContainer: {
    background: "#1A2235",
    border: "2px solid #2D3B52",
    borderRadius: "16px",
    overflow: "hidden",
    position: "relative" as const,
  },
  tableLabel: {
    position: "absolute" as const,
    top: "-12px",
    left: "24px",
    background: "#111827",
    padding: "4px 12px",
    fontSize: "12px",
    fontWeight: 600,
    color: "#3B82F6",
    borderRadius: "6px",
    border: "1px solid #2D3B52",
    zIndex: 1,
  },
  tableScroll: {
    overflowX: "auto" as const,
    maxHeight: "500px",
    overflowY: "auto" as const,
    marginTop: "12px",
  },
  dataTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "13px",
  },
  th: {
    padding: "14px 12px",
    textAlign: "left" as const,
    fontWeight: 600,
    color: "#94A3B8",
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    borderBottom: "2px solid #2D3B52",
    whiteSpace: "nowrap" as const,
    background: "#232D42",
    position: "sticky" as const,
    top: 0,
  },
  tr: {
    transition: "background 0.2s",
    cursor: "pointer",
  },
  trTpn: {
    background: "#232D42",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #2D3B52",
    fontFamily: "monospace",
    fontSize: "12px",
    color: "#F8FAFC",
  },
  circuitNum: {
    fontWeight: 700,
    color: "#F59E0B",
  },
  description: {
    fontFamily: "inherit",
    fontWeight: 500,
  },
};

export default BoardViewer;
