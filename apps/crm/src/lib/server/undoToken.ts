import { createHmac } from "crypto";

const SECRET = process.env.INBOUND_KEY_SECRET || "qt-inbound-key-secret";
const UNDO_TTL_MS = 30_000; // 30 seconds

export type UndoPayload = {
  companyId: string;
  userId: string;
  entityType: "client" | "quote" | "job" | "invoice";
  entityId: string;
  undoUntil: string;
};

export function createUndoToken(companyId: string, userId: string, entityType: UndoPayload["entityType"], entityId: string) {
  const payload: UndoPayload = {
    companyId,
    userId,
    entityType,
    entityId,
    undoUntil: new Date(Date.now() + UNDO_TTL_MS).toISOString(),
  };
  const token = createHmac("sha256", SECRET).update(JSON.stringify(payload)).digest("hex");
  return { token, payload };
}

export function verifyUndoToken(token: string, payload: UndoPayload, companyId: string): { valid: boolean; error?: string } {
  const expected = createHmac("sha256", SECRET).update(JSON.stringify(payload)).digest("hex");
  if (token !== expected) return { valid: false, error: "invalid_token" };
  if (new Date(payload.undoUntil) < new Date()) return { valid: false, error: "Undo window expired (30s). The item remains in the trash." };
  if (payload.companyId !== companyId) return { valid: false, error: "forbidden" };
  return { valid: true };
}
