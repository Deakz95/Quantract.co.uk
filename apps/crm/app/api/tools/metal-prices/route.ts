export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimitByIp, createRateLimitResponse } from "@/lib/server/rateLimitMiddleware";

/**
 * Metal price tracker API — mock provider with configurable real API slot.
 *
 * GET /api/tools/metal-prices
 *
 * Returns copper and aluminium prices in GBP/kg.
 * Uses a configurable provider interface. Currently returns mock data
 * with realistic prices. To connect a real provider, set METAL_PRICE_API_KEY
 * and implement the fetch in fetchRealPrices().
 *
 * Cache: 1 hour server-side via in-memory cache.
 */

interface MetalPrices {
  copper: { price: number; unit: string; currency: string; change24h: number };
  aluminium: { price: number; unit: string; currency: string; change24h: number };
  source: string;
  timestamp: string;
  cached: boolean;
}

let cachedPrices: MetalPrices | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Mock prices — realistic LME-based values in GBP/kg */
function getMockPrices(): MetalPrices {
  // Base prices with small daily variation for realism
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const copperBase = 7.85 + Math.sin(dayOfYear * 0.1) * 0.3;
  const aluBase = 2.15 + Math.sin(dayOfYear * 0.15) * 0.1;

  return {
    copper: {
      price: Math.round(copperBase * 100) / 100,
      unit: "kg",
      currency: "GBP",
      change24h: Math.round((Math.sin(dayOfYear * 0.3) * 2) * 100) / 100,
    },
    aluminium: {
      price: Math.round(aluBase * 100) / 100,
      unit: "kg",
      currency: "GBP",
      change24h: Math.round((Math.sin(dayOfYear * 0.25) * 1.5) * 100) / 100,
    },
    source: "Mock data (configure METAL_PRICE_API_KEY for live prices)",
    timestamp: new Date().toISOString(),
    cached: false,
  };
}

// Placeholder for real API integration
// async function fetchRealPrices(): Promise<MetalPrices | null> {
//   const apiKey = process.env.METAL_PRICE_API_KEY;
//   if (!apiKey) return null;
//   // Implement fetch to metalpriceapi.com or similar
//   return null;
// }

// Infra rate limiting (Vercel/Cloudflare) is primary; this is an app-layer backstop.
export async function GET(req: Request) {
  try {
    const rl = rateLimitByIp(req as NextRequest, { limit: 30, windowMs: 60_000 }, "metal:ip");
    if (!rl.ok) {
      return createRateLimitResponse({
        error: "Too many requests. Please try again shortly.",
        resetAt: rl.resetAt,
      });
    }

    // Check cache
    if (cachedPrices && Date.now() < cacheExpiry) {
      return NextResponse.json({ ok: true, ...cachedPrices, cached: true });
    }

    // Try real provider first (when implemented)
    // const realPrices = await fetchRealPrices();
    // if (realPrices) { ... }

    // Fall back to mock
    const prices = getMockPrices();
    cachedPrices = prices;
    cacheExpiry = Date.now() + CACHE_TTL_MS;

    return NextResponse.json({ ok: true, ...prices });
  } catch {
    // If provider is down, return cached data or error
    if (cachedPrices) {
      return NextResponse.json({ ok: true, ...cachedPrices, cached: true, stale: true });
    }
    return NextResponse.json(
      { ok: false, error: "Metal price data unavailable. Please try again later." },
      { status: 503 }
    );
  }
}
