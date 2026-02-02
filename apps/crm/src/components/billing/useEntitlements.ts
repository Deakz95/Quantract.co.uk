"use client";

import { useEffect, useState, useCallback } from "react";
import type { EntitlementKey } from "@/lib/billing/plans";

export type EntitlementsPayload = {
  ok: boolean;
  plan: string;
  planLabel: string;
  subscriptionStatus: string;
  trial: { active: boolean; expired: boolean; daysRemaining: number | null };
  features: Record<string, boolean>;
  limits: Record<string, number | boolean>;
};

/**
 * Client-side hook to fetch the current company's entitlements.
 * Calls GET /api/entitlements/me (available to all roles).
 */
export function useEntitlements() {
  const [data, setData] = useState<EntitlementsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/entitlements/me", { cache: "no-store" });
      if (!r.ok) {
        setData(null);
        return;
      }
      const json = await r.json();
      if (json.ok) {
        setData(json);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const hasFeature = (key: EntitlementKey): boolean => {
    if (loading || !data) return true; // allow by default while loading
    return data.features[key] ?? false;
  };

  return { data, loading, refetch, hasFeature };
}
