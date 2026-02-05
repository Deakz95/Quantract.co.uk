import type { ToolOutput } from "./toolSchema";

const STORAGE_KEY = "quantract-tool-outputs";

function readAll(): ToolOutput[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ToolOutput[]) : [];
  } catch {
    return [];
  }
}

function writeAll(outputs: ToolOutput[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(outputs));
}

export function listSavedOutputs(): ToolOutput[] {
  return readAll().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function saveOutput(
  toolSlug: string,
  name: string,
  inputsJson: Record<string, unknown>,
  outputsJson: Record<string, unknown>
): ToolOutput {
  const entry: ToolOutput = {
    id: crypto.randomUUID(),
    toolSlug,
    name,
    inputsJson,
    outputsJson,
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.push(entry);
  writeAll(all);
  return entry;
}

export function deleteSavedOutput(id: string) {
  writeAll(readAll().filter((o) => o.id !== id));
}

export function getSavedOutput(id: string): ToolOutput | undefined {
  return readAll().find((o) => o.id === id);
}
