"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type Entitlements, type EntitlementKey, hasEntitlement, getUnlockingPlan, getPlanLabel } from "@/lib/entitlements";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

// ============ Context ============

type EntitlementsContextValue = {
  entitlements: Entitlements | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

const EntitlementsContext = createContext<EntitlementsContextValue>({
  entitlements: null,
  loading: true,
  error: null,
  refetch: () => {},
});

export function useEntitlements() {
  return useContext(EntitlementsContext);
}

/**
 * Check if the user has a specific entitlement.
 * Returns false while loading or on error (fail-safe: lock features).
 */
export function useHasEntitlement(key: EntitlementKey): boolean {
  const { entitlements, loading, error } = useEntitlements();
  if (loading || error || !entitlements) return false;
  return hasEntitlement(entitlements, key);
}

// ============ Provider ============

export function EntitlementsProvider({ children }: { children: ReactNode }) {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/entitlements/me");
      const data = await res.json();
      if (data.ok && data.entitlements) {
        setEntitlements(data.entitlements);
      } else {
        setError(data.error || "Failed to load entitlements");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntitlements();
  }, []);

  return (
    <EntitlementsContext.Provider value={{ entitlements, loading, error, refetch: fetchEntitlements }}>
      {children}
    </EntitlementsContext.Provider>
  );
}

// ============ Gate Component ============

type EntitlementGateProps = {
  /** The entitlement key to check */
  entitlement: EntitlementKey;
  /** Content to show when entitled */
  children: ReactNode;
  /** Content to show when not entitled (optional) */
  fallback?: ReactNode;
  /** Show a badge indicating the required plan (default: true) */
  showBadge?: boolean;
  /** Show nothing when not entitled (instead of fallback/badge) */
  hideWhenLocked?: boolean;
};

/**
 * Conditionally render content based on entitlement.
 *
 * Usage:
 *   <EntitlementGate entitlement="feature_custom_domain">
 *     <CustomDomainForm />
 *   </EntitlementGate>
 */
export function EntitlementGate({
  entitlement,
  children,
  fallback,
  showBadge = true,
  hideWhenLocked = false,
}: EntitlementGateProps) {
  const { entitlements, loading } = useEntitlements();

  // While loading, render nothing (fail-safe)
  if (loading) return null;

  // Check entitlement
  const hasAccess = entitlements ? hasEntitlement(entitlements, entitlement) : false;

  if (hasAccess) {
    return <>{children}</>;
  }

  // Not entitled
  if (hideWhenLocked) return null;

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showBadge) {
    const requiredPlan = getUnlockingPlan(entitlement);
    return <LockedFeatureBadge plan={requiredPlan} />;
  }

  return null;
}

// ============ Helper Components ============

function LockedFeatureBadge({ plan }: { plan: string }) {
  return (
    <Badge variant="secondary" className="gap-1">
      <Lock className="w-3 h-3" />
      {getPlanLabel(plan as any)}
    </Badge>
  );
}

type LockedOverlayProps = {
  entitlement: EntitlementKey;
  children: ReactNode;
  message?: string;
};

/**
 * Wrap content with a locked overlay when entitlement is missing.
 * The content is still visible but with reduced opacity and overlay.
 */
export function LockedOverlay({ entitlement, children, message }: LockedOverlayProps) {
  const hasAccess = useHasEntitlement(entitlement);

  if (hasAccess) {
    return <>{children}</>;
  }

  const requiredPlan = getUnlockingPlan(entitlement);

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-[var(--background)]/80 rounded-lg">
        <div className="text-center p-4">
          <Badge variant="secondary" className="gap-1 mb-2">
            <Lock className="w-3 h-3" />
            {getPlanLabel(requiredPlan as any)}
          </Badge>
          {message && <p className="text-sm text-[var(--muted-foreground)]">{message}</p>}
        </div>
      </div>
    </div>
  );
}
