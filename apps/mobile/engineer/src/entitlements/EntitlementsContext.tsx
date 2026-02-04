import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export type EntitlementKey =
  | "module_crm"
  | "module_certificates"
  | "module_portal"
  | "module_tools"
  | "feature_schedule"
  | "feature_timesheets"
  | "feature_xero"
  | "feature_subdomain"
  | "feature_custom_domain"
  | "feature_dedicated_db"
  | "feature_ai_estimator"
  | "feature_remote_assist"
  | "feature_truck_inventory"
  | "feature_maintenance_alerts"
  | "feature_lead_scoring"
  | "feature_portal_timeline"
  | "feature_portal_troubleshooter"
  | "feature_scheduled_checks"
  | "limit_users"
  | "limit_legal_entities"
  | "limit_invoices_per_month"
  | "limit_certificates_per_month"
  | "limit_quotes_per_month"
  | "limit_storage_mb";

export type Entitlements = {
  plan: string;
  isEnterprise: boolean;
  isTrial: boolean;
  isTrialExpired: boolean;
  [key: string]: boolean | number | string;
};

type EntitlementsState = {
  entitlements: Entitlements | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const CACHE_KEY = "qt_entitlements_v1";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Permissive defaults to avoid blocking core engineer flows during loading/offline
const DEFAULT_ENTITLEMENTS: Entitlements = {
  plan: "trial",
  isEnterprise: false,
  isTrial: true,
  isTrialExpired: false,
  module_crm: true,
  module_certificates: true,
  module_portal: true,
  module_tools: true,
  feature_schedule: true,
  feature_timesheets: true,
  feature_xero: false,
  feature_subdomain: false,
  feature_custom_domain: false,
  feature_dedicated_db: false,
  feature_ai_estimator: false,
  feature_remote_assist: false,
  feature_truck_inventory: false,
  feature_maintenance_alerts: true,
  feature_lead_scoring: true,
  feature_portal_timeline: true,
  feature_portal_troubleshooter: true,
  feature_scheduled_checks: true,
};

const EntitlementsContext = createContext<EntitlementsState>({
  entitlements: null,
  loading: true,
  error: null,
  refetch: async () => {},
});

export function useEntitlements() {
  return useContext(EntitlementsContext);
}

/**
 * Check if the user has a specific entitlement.
 * Fail-open during loading to avoid blocking core engineer workflows.
 */
export function useHasEntitlement(key: EntitlementKey): boolean {
  const { entitlements, loading } = useEntitlements();
  if (loading || !entitlements) return true;
  return hasEntitlement(entitlements, key);
}

export function hasEntitlement(entitlements: Entitlements, key: EntitlementKey): boolean {
  if (entitlements.isEnterprise) return true;
  const value = entitlements[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  return false;
}

type CacheEntry = { at: number; entitlements: Entitlements };

async function getCached(): Promise<Entitlements | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.at > CACHE_TTL_MS) return null;
    return entry.entitlements;
  } catch {
    return null;
  }
}

async function setCache(entitlements: Entitlements): Promise<void> {
  try {
    await AsyncStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ at: Date.now(), entitlements } satisfies CacheEntry),
    );
  } catch {
    // best-effort
  }
}

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = useCallback(async () => {
    if (!token) {
      setEntitlements(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch("/api/entitlements/me");
      const data = await res.json();
      if (data?.ok && data.entitlements) {
        setEntitlements(data.entitlements);
        setError(null);
        await setCache(data.entitlements);
      } else if (res.status === 401 || res.status === 403) {
        const cached = await getCached();
        setEntitlements(cached || DEFAULT_ENTITLEMENTS);
        setError(null);
      } else {
        setError(data?.error || "Failed to load entitlements");
        const cached = await getCached();
        if (cached) setEntitlements(cached);
      }
    } catch {
      const cached = await getCached();
      setEntitlements(cached || DEFAULT_ENTITLEMENTS);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load from cache first, then fetch fresh
  useEffect(() => {
    if (!token) {
      setEntitlements(null);
      setLoading(false);
      return;
    }
    (async () => {
      const cached = await getCached();
      if (cached) {
        setEntitlements(cached);
        setLoading(false);
      }
      fetchEntitlements();
    })();
  }, [token, fetchEntitlements]);

  return (
    <EntitlementsContext.Provider value={{ entitlements, loading, error, refetch: fetchEntitlements }}>
      {children}
    </EntitlementsContext.Provider>
  );
}
