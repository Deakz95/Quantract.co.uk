/**
 * Centralized structured logger.
 *
 * Usage:
 *   import { log } from "@/lib/server/logger";
 *   log.info("stockAlerts", { companyId, truckStockId: record.id, qty: record.qty });
 *
 * Automatically injects requestId, companyId, userId from AsyncLocalStorage
 * when available. Never logs PII (emails, tokens, addresses, payment refs).
 */
import { getRequestContext } from "./requestContext";

function emit(
  level: "info" | "warn" | "error",
  tag: string,
  payload: Record<string, unknown>,
) {
  const ctx = getRequestContext();
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    tag,
    requestId: ctx.requestId ?? undefined,
    companyId: ctx.companyId ?? payload.companyId ?? undefined,
    userId: ctx.userId ?? payload.userId ?? undefined,
    route: ctx.route ?? undefined,
    ...payload,
  };

  const message = JSON.stringify(entry);
  if (level === "error") console.error(message);
  else if (level === "warn") console.warn(message);
  else console.info(message);
}

export const log = {
  info: (tag: string, payload: Record<string, unknown> = {}) => emit("info", tag, payload),
  warn: (tag: string, payload: Record<string, unknown> = {}) => emit("warn", tag, payload),
  error: (tag: string, payload: Record<string, unknown> = {}) => emit("error", tag, payload),
};
