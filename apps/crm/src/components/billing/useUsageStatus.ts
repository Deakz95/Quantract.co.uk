"use client";

import { useEffect, useState, useCallback } from "react";
import type { TrialStatus, UsageStatus, UpgradeSuggestion } from "@/lib/billing/plans";

export type FullBillingStatus = {
  plan: string;
  planLabel: string;
  planPrice: number | null;
  subscriptionStatus: string;
  currentPeriodEnd: string | null;
  hasBypass: boolean;
  trial: TrialStatus;
  usage: UsageStatus;
  limitsHit: string[];
  upgradeSuggestion: UpgradeSuggestion | null;
};

export function useUsageStatus() {
  const [status, setStatus] = useState<FullBillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/billing/usage", { cache: "no-store" });
      if (!r.ok) {
        setError("Failed to load usage status");
        setStatus(null);
        return;
      }
      const data = await r.json();
      if (data.ok) {
        setStatus(data);
        setError(null);
      } else {
        setError(data.error || "Unknown error");
        setStatus(null);
      }
    } catch (err) {
      setError("Network error");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { 
    status, 
    loading, 
    error, 
    refetch,
    // Convenience helpers
    isTrialExpired: status?.trial?.isExpired ?? false,
    trialDaysRemaining: status?.trial?.daysRemaining ?? null,
    hasAnyLimitHit: (status?.limitsHit?.length ?? 0) > 0,
    canCreateQuote: !(status?.usage?.quotesLimitReached ?? false) && !(status?.trial?.isExpired ?? false),
    canCreateInvoice: !(status?.usage?.invoicesLimitReached ?? false) && !(status?.trial?.isExpired ?? false),
    canCreateJob: !(status?.usage?.jobsLimitReached ?? false) && !(status?.trial?.isExpired ?? false),
    canAddEngineer: !(status?.usage?.engineersLimitReached ?? false),
    canAddClient: !(status?.usage?.clientsLimitReached ?? false),
  };
}

// Simple hook for just checking if action is allowed
export function useCanPerformAction(action: "quote" | "invoice" | "job" | "engineer" | "client") {
  const { status, loading } = useUsageStatus();
  
  if (loading || !status) return { allowed: true, loading: true, reason: null };

  // Trial expired blocks everything
  if (status.trial?.isExpired) {
    return { 
      allowed: false, 
      loading: false, 
      reason: "trial_expired" as const,
      message: "Your trial has expired. Please upgrade to continue."
    };
  }

  switch (action) {
    case "quote":
      if (status.usage?.quotesLimitReached) {
        return {
          allowed: false,
          loading: false,
          reason: "quotes" as const,
          message: `You've reached your monthly limit of ${status.usage.quotesLimit} quotes.`
        };
      }
      break;
    case "invoice":
      if (status.usage?.invoicesLimitReached) {
        return {
          allowed: false,
          loading: false,
          reason: "invoices" as const,
          message: `You've reached your monthly limit of ${status.usage.invoicesLimit} invoices.`
        };
      }
      break;
    case "job":
      if (status.usage?.jobsLimitReached) {
        return {
          allowed: false,
          loading: false,
          reason: "jobs" as const,
          message: `You've reached your limit of ${status.usage.jobsLimit} jobs.`
        };
      }
      break;
    case "engineer":
      if (status.usage?.engineersLimitReached) {
        return {
          allowed: false,
          loading: false,
          reason: "engineers" as const,
          message: `You've reached your limit of ${status.usage.engineersLimit} engineers.`
        };
      }
      break;
    case "client":
      if (status.usage?.clientsLimitReached) {
        return {
          allowed: false,
          loading: false,
          reason: "clients" as const,
          message: `You've reached your limit of ${status.usage.clientsLimit} clients.`
        };
      }
      break;
  }

  return { allowed: true, loading: false, reason: null, message: null };
}
