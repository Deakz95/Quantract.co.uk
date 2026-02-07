import type { BoardData, BoardCircuit } from "@quantract/shared/certificate-types";

/**
 * Create a default board with empty spare slots
 */
export function createDefaultBoard(
  type: "single-phase" | "three-phase",
  numWays: number,
  options?: {
    name?: string;
    designation?: string;
    manufacturer?: string;
    model?: string;
    location?: string;
    mainSwitchRating?: string;
    mainSwitchType?: string;
  }
): BoardData {
  const circuits: BoardCircuit[] = [];
  for (let i = 1; i <= numWays; i++) {
    circuits.push({
      id: crypto.randomUUID(),
      num: String(i),
      description: "",
      type: "",
      rating: "",
      phase: type === "three-phase" ? (["L1", "L2", "L3"] as const)[(i - 1) % 3] : "single",
      bsen: "",
      cableMm2: "",
      cpcMm2: "",
      cableType: "",
      maxZs: "",
      zs: "",
      r1r2: "",
      r2: "",
      insMohm: "",
      rcdMa: "",
      rcdMs: "",
      rcdType: "",
      status: "",
      code: "",
      isEmpty: true,
    });
  }

  return {
    id: crypto.randomUUID(),
    name: options?.name || `Board ${type === "three-phase" ? "3P" : "SP"}`,
    description: "",
    designation: options?.designation || "",
    type,
    manufacturer: options?.manufacturer || "",
    model: options?.model || "",
    location: options?.location || "",
    ipRating: "",
    numWays,
    mainSwitch: {
      rating: options?.mainSwitchRating || "100A",
      type: options?.mainSwitchType || "Isolator",
    },
    rcdDetails: "",
    circuits,
  };
}

/**
 * Add a new circuit to a board, auto-assigning the next circuit number
 */
export function addCircuit(board: BoardData, phase?: string): BoardData {
  const maxNum = board.circuits.reduce((max, c) => {
    const n = parseInt(String(c.num), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);

  const newCircuit: BoardCircuit = {
    id: crypto.randomUUID(),
    num: String(maxNum + 1),
    description: "",
    type: "",
    rating: "",
    phase: (phase as BoardCircuit["phase"]) || (board.type === "three-phase" ? "L1" : "single"),
    bsen: "",
    cableMm2: "",
    cpcMm2: "",
    cableType: "",
    maxZs: "",
    zs: "",
    r1r2: "",
    r2: "",
    insMohm: "",
    rcdMa: "",
    rcdMs: "",
    rcdType: "",
    status: "",
    code: "",
    isEmpty: false,
  };

  return {
    ...board,
    circuits: [...board.circuits, newCircuit],
  };
}

/**
 * Remove a circuit from a board and re-sort remaining circuits
 */
export function removeCircuit(board: BoardData, circuitId: string): BoardData {
  return {
    ...board,
    circuits: board.circuits.filter((c) => c.id !== circuitId),
  };
}

/**
 * Reorder circuits within a board (drag & drop)
 */
export function reorderCircuits(board: BoardData, fromIndex: number, toIndex: number): BoardData {
  const circuits = [...board.circuits];
  const [moved] = circuits.splice(fromIndex, 1);
  circuits.splice(toIndex, 0, moved);
  return { ...board, circuits };
}

/**
 * Update a single circuit in a board
 */
export function updateCircuit(board: BoardData, circuitId: string, updates: Partial<BoardCircuit>): BoardData {
  return {
    ...board,
    circuits: board.circuits.map((c) =>
      c.id === circuitId ? { ...c, ...updates } : c
    ),
  };
}

/**
 * Export a board's circuit schedule as CSV string
 */
export function boardToCSV(board: BoardData): string {
  const headers = [
    "Circuit", "Phase", "Description", "Type", "Rating",
    "BS EN", "Cable mm2", "CPC mm2", "Cable Type",
    "Max Zs", "Zs", "R1+R2", "R2", "Ins MOhm",
    "RCD mA", "RCD ms", "RCD Type", "Status", "Code"
  ];

  const rows = board.circuits
    .filter((c) => !c.isEmpty)
    .map((c) => [
      c.num,
      c.phase || "",
      `"${(c.description || "").replace(/"/g, '""')}"`,
      c.type || "",
      c.rating || "",
      c.bsen || "",
      c.cableMm2 || "",
      c.cpcMm2 || "",
      c.cableType || "",
      c.maxZs || "",
      c.zs || "",
      c.r1r2 || "",
      c.r2 || "",
      c.insMohm || "",
      c.rcdMa || "",
      c.rcdMs || "",
      c.rcdType || "",
      c.status || "",
      c.code || "",
    ].join(","));

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Download a CSV string as a file
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
