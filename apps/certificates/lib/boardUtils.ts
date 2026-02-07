import type { BoardData, BoardCircuit } from "@quantract/shared/certificate-types";

/** Default empty values for the expanded BS 7671 circuit fields */
const EMPTY_CIRCUIT_DEFAULTS: Omit<BoardCircuit, "id" | "circuitNumber" | "description" | "phase" | "isEmpty"> = {
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

/** Default empty values for the expanded BS 7671 board header fields */
const EMPTY_BOARD_DEFAULTS = {
  suppliedFrom: "",
  ocpdBsEn: "",
  ocpdType: "",
  ocpdRating: "",
  spdType: "",
  spdStatusChecked: false,
  supplyPolarityConfirmed: false,
  phaseSequenceConfirmed: false,
  zsAtDb: "",
  ipfAtDb: "",
  typeOfWiringOther: "",
};

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
      circuitNumber: i,
      description: "",
      phase: type === "three-phase" ? (["L1", "L2", "L3"] as const)[(i - 1) % 3] : "single",
      isEmpty: true,
      ...EMPTY_CIRCUIT_DEFAULTS,
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
    ...EMPTY_BOARD_DEFAULTS,
    circuits,
  };
}

/**
 * Add a new circuit to a board, auto-assigning the next circuit number
 */
export function addCircuit(board: BoardData, phase?: string): BoardData {
  const maxNum = board.circuits.reduce((max, c) => {
    const n = parseInt(String(c.circuitNumber ?? c.num), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);

  const newCircuit: BoardCircuit = {
    id: crypto.randomUUID(),
    circuitNumber: maxNum + 1,
    description: "",
    phase: (phase as BoardCircuit["phase"]) || (board.type === "three-phase" ? "L1" : "single"),
    isEmpty: false,
    ...EMPTY_CIRCUIT_DEFAULTS,
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
    "Circuit", "Phase", "Description", "Wiring", "Ref Method",
    "Points", "Live mm2", "CPC mm2", "OCPD Type", "OCPD Rating",
    "BS EN", "Max Zs", "Zs", "R1+R2", "IR L-E",
    "RCD mA", "RCD ms", "Status", "Code"
  ];

  const rows = board.circuits
    .filter((c) => !c.isEmpty)
    .map((c) => [
      c.circuitNumber ?? c.num ?? "",
      c.phase || "",
      `"${(c.description || "").replace(/"/g, '""')}"`,
      c.typeOfWiring || "",
      c.referenceMethod || "",
      c.numberOfPoints || "",
      c.liveCsa || c.cableMm2 || "",
      c.cpcCsa || c.cpcMm2 || "",
      c.ocpdType || c.type || "",
      c.ocpdRating || c.rating || "",
      c.ocpdBsEn || c.bsen || "",
      c.maxPermittedZs || c.maxZs || "",
      c.zsMeasured || c.zs || "",
      c.r1PlusR2 || c.r1r2 || "",
      c.irLiveEarth || c.insMohm || "",
      c.rcdRatedCurrent || c.rcdMa || "",
      c.rcdDisconnectionTime || c.rcdMs || "",
      c.status || "",
      c.observationCode || c.code || "",
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
