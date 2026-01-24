// src/lib/quoteMath.ts
export type QuoteLine = {
  id: string;
  description: string;
  qty: number;
  unit: string; // e.g. "each", "day", "hr"
  rate: number; // GBP
};

export function clampMoney(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function lineTotal(line: QuoteLine) {
  return clampMoney((line.qty || 0) * (line.rate || 0));
}

export function subtotal(lines: QuoteLine[]) {
  return clampMoney(lines.reduce((acc, l) => acc + lineTotal(l), 0));
}

export function vatAmount(sub: number, vatRate: number) {
  return clampMoney(sub * vatRate);
}

export function grandTotal(sub: number, vat: number) {
  return clampMoney(sub + vat);
}
