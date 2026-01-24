import Stripe from "stripe";

/**
 * Minimal Stripe helpers.
 *
 * Env vars:
 * - STRIPE_SECRET_KEY
 * - STRIPE_WEBHOOK_SECRET (for webhook verification)
 * - APP_BASE_URL (e.g. https://app.yourdomain.com)
 */

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

export function appBaseUrl() {
  const base = (process.env.APP_BASE_URL || "").trim();
  if (base) return base.replace(/\/$/, "");
  // Fallback for local dev
  return "http://localhost:3000";
}
