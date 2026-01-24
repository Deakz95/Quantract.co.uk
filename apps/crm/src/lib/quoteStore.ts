"use client";

/**
 * Legacy client-side schedule store.
 * Phase A uses server APIs for quotes; this file remains as a lightweight,
 * non-breaking helper for any UI that still imports it.
 */

export type PaymentStage = {
  id: string;
  label: string;
  pct: number;
  due?: string;
};

export type QuoteSettings = {
  quoteId: string;
  depositPct: number;
  stages: PaymentStage[];
  quoteTotal?: number;
  locked?: boolean;
  lockedAtISO?: string;
  updatedAtISO?: string;
};


const KEY = "qt_quote_settings_v1";

function loadAll(): QuoteSettings[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as QuoteSettings[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(all: QuoteSettings[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(all));
}

export function defaultQuoteSettings(quoteId: string): QuoteSettings {
  return {
    quoteId,
    depositPct: 30,
    stages: [
      { id: "deposit", label: "Deposit", pct: 30, due: "On booking" },
      { id: "final", label: "Final", pct: 70, due: "On completion" },
    ],
    updatedAtISO: new Date().toISOString(),
  };
}

export function getQuoteSettings(quoteId: string): QuoteSettings {
  const all = loadAll();
  return all.find((x) => x.quoteId === quoteId) ?? defaultQuoteSettings(quoteId);
}

export function upsertQuoteSettings(next: QuoteSettings) {
  const all = loadAll();
  const idx = all.findIndex((x) => x.quoteId === next.quoteId);
  if (idx === -1) all.push(next);
  else all[idx] = next;
  saveAll(all);
}

export function lockQuoteSettings(quoteId: string): QuoteSettings {
  const current = getQuoteSettings(quoteId);

  const next: QuoteSettings = {
    ...current,
    locked: true,
    lockedAtISO: current.lockedAtISO ?? new Date().toISOString(),
  };

  upsertQuoteSettings(next);
  return next;
}


export function rebalanceLastStage(stages: PaymentStage[]) {
  if (stages.length <= 1) return stages;
  const head = stages.slice(0, -1);
  const headSum = head.reduce((sum, s) => sum + clampPct(s.pct), 0);
  const last = stages[stages.length - 1];
  const remaining = clampPct(100 - headSum);
  return [...head, { ...last, pct: remaining }];
}

function clampPct(v: number) {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

// Legacy exports used by older UI (kept as thin wrappers)
export { clampPct };

export function sumStagePct(stages: PaymentStage[]) {
  return stages.reduce((sum, s) => sum + clampPct(s.pct), 0);
}

export function setDepositPct(settings: QuoteSettings, depositPct: number): QuoteSettings {
  const next: QuoteSettings = {
    ...settings,
    depositPct: clampPct(depositPct),
    updatedAtISO: new Date().toISOString(),
  };
  return next;
}

