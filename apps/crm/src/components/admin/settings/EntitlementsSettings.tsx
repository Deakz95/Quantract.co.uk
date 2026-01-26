"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Briefcase,
  FileText,
  BadgeCheck,
  Inbox,
  Receipt,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  Clock,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/cn";

type EntitlementsData = {
  plan: {
    tier: string;
    label: string;
    description: string;
    price: number | null;
  };
  trial: {
    isTrialPlan: boolean;
    trialStartedAt: string | null;
    trialEndsAt: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
  };
  subscription: {
    status: string;
    hasStripe: boolean;
    hasSubscription: boolean;
  };
  entitlements: {
    enabledModules: string[];
    extraUsers: number;
    extraEntities: number;
    extraStorageMB: number;
  };
  features: Record<string, boolean>;
  limits: Record<string, number | boolean>;
  usage: {
    usersCount: number;
    entitiesCount: number;
    invoicesThisMonth: number;
    certificatesThisMonth: number;
    quotesThisMonth: number;
    storageUsedMB: number;
    usageResetAt: string | null;
  };
  usageStatus: {
    usersCount: number;
    usersLimit: number;
    usersRemaining: number;
    usersLimitReached: boolean;
    entitiesCount: number;
    entitiesLimit: number;
    entitiesRemaining: number;
    entitiesLimitReached: boolean;
    invoicesUsed: number;
    invoicesLimit: number;
    invoicesRemaining: number;
    invoicesLimitReached: boolean;
    certificatesUsed: number;
    certificatesLimit: number;
    certificatesRemaining: number;
    certificatesLimitReached: boolean;
    quotesUsed: number;
    quotesLimit: number;
    quotesRemaining: number;
    quotesLimitReached: boolean;
  };
  enterpriseCheck: {
    needed: boolean;
    reasons: string[];
  };
  modulePricing: Record<string, { price: number; label: string }>;
};

export function EntitlementsSettings() {
  const [data, setData] = useState<EntitlementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/entitlements");
      const json = await res.json();
      if (json.ok) {
        setData(json);
        setError(null);
      } else {
        setError(json.error || "Failed to load entitlements");
      }
    } catch {
      setError("Failed to fetch entitlements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
        {error || "Failed to load data"}
        <Button variant="ghost" size="sm" onClick={fetchData} className="ml-4">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Entitlements & Usage</h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            View your current plan, limits, and usage counters for debugging.
          </p>
        </div>
        <Button variant="secondary" onClick={fetchData} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Trial Warning */}
      {data.trial.isTrialPlan && (
        <div
          className={cn(
            "rounded-xl p-4 border",
            data.trial.isExpired
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
              : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
          )}
        >
          <div className="flex items-start gap-3">
            <Clock
              className={cn(
                "w-5 h-5 mt-0.5",
                data.trial.isExpired ? "text-red-500" : "text-amber-500"
              )}
            />
            <div>
              <h4
                className={cn(
                  "font-semibold",
                  data.trial.isExpired
                    ? "text-red-700 dark:text-red-300"
                    : "text-amber-700 dark:text-amber-300"
                )}
              >
                {data.trial.isExpired ? "Trial Expired" : "Trial Active"}
              </h4>
              <p
                className={cn(
                  "text-sm",
                  data.trial.isExpired
                    ? "text-red-600 dark:text-red-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {data.trial.isExpired
                  ? "Your trial has ended. Upgrade to continue using Quantract."
                  : `${data.trial.daysRemaining} days remaining. Trial ends ${data.trial.trialEndsAt ? new Date(data.trial.trialEndsAt).toLocaleDateString() : "soon"}.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Enterprise Recommendation */}
      {data.enterpriseCheck.needed && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 mt-0.5 text-purple-500" />
            <div>
              <h4 className="font-semibold text-purple-700 dark:text-purple-300">
                Enterprise Recommended
              </h4>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                Your usage suggests you may benefit from Enterprise plan:
              </p>
              <ul className="text-sm text-purple-600 dark:text-purple-400 mt-1 list-disc list-inside">
                {data.enterpriseCheck.reasons.map((reason, i) => (
                  <li key={i}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Plan Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm text-[var(--muted-foreground)]">Current Plan</p>
              <h4 className="text-lg font-bold text-[var(--foreground)]">{data.plan.label}</h4>
            </div>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">{data.plan.description}</p>
          {data.plan.price !== null && (
            <p className="mt-2 text-2xl font-bold text-[var(--primary)]">
              £{data.plan.price}
              <span className="text-sm font-normal text-[var(--muted-foreground)]">/month</span>
            </p>
          )}
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <p className="text-sm text-[var(--muted-foreground)] mb-2">Subscription Status</p>
          <Badge
            variant={data.subscription.status === "active" ? "success" : "secondary"}
            className="text-sm"
          >
            {data.subscription.status}
          </Badge>
          <div className="mt-4 space-y-1 text-sm">
            <p className="flex items-center gap-2">
              {data.subscription.hasStripe ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-[var(--muted-foreground)]" />
              )}
              <span className={data.subscription.hasStripe ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
                Stripe Connected
              </span>
            </p>
            <p className="flex items-center gap-2">
              {data.subscription.hasSubscription ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <X className="w-4 h-4 text-[var(--muted-foreground)]" />
              )}
              <span className={data.subscription.hasSubscription ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"}>
                Active Subscription
              </span>
            </p>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <p className="text-sm text-[var(--muted-foreground)] mb-2">Enabled Modules</p>
          <div className="flex flex-wrap gap-2">
            {data.entitlements.enabledModules.length > 0 ? (
              data.entitlements.enabledModules.map((mod) => (
                <Badge key={mod} variant="gradient" className="text-xs">
                  {data.modulePricing[mod]?.label || mod}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">No modules enabled</p>
            )}
          </div>
          {(data.entitlements.extraUsers > 0 ||
            data.entitlements.extraEntities > 0 ||
            data.entitlements.extraStorageMB > 0) && (
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)] mb-2">Purchased Add-ons:</p>
              {data.entitlements.extraUsers > 0 && (
                <p className="text-sm">+{data.entitlements.extraUsers} extra users</p>
              )}
              {data.entitlements.extraEntities > 0 && (
                <p className="text-sm">+{data.entitlements.extraEntities} extra entities</p>
              )}
              {data.entitlements.extraStorageMB > 0 && (
                <p className="text-sm">+{Math.round(data.entitlements.extraStorageMB / 1024)}GB storage</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Usage Meters */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h4 className="text-lg font-semibold text-[var(--foreground)] mb-4">Usage This Period</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UsageMeter
            icon={Users}
            label="Users"
            used={data.usageStatus.usersCount}
            limit={data.usageStatus.usersLimit}
            limitReached={data.usageStatus.usersLimitReached}
          />
          <UsageMeter
            icon={Briefcase}
            label="Legal Entities"
            used={data.usageStatus.entitiesCount}
            limit={data.usageStatus.entitiesLimit}
            limitReached={data.usageStatus.entitiesLimitReached}
          />
          <UsageMeter
            icon={FileText}
            label="Invoices (this month)"
            used={data.usageStatus.invoicesUsed}
            limit={data.usageStatus.invoicesLimit}
            limitReached={data.usageStatus.invoicesLimitReached}
          />
          <UsageMeter
            icon={BadgeCheck}
            label="Certificates (this month)"
            used={data.usageStatus.certificatesUsed}
            limit={data.usageStatus.certificatesLimit}
            limitReached={data.usageStatus.certificatesLimitReached}
          />
          <UsageMeter
            icon={Receipt}
            label="Quotes (this month)"
            used={data.usageStatus.quotesUsed}
            limit={data.usageStatus.quotesLimit}
            limitReached={data.usageStatus.quotesLimitReached}
          />
          <UsageMeter
            icon={Inbox}
            label="Storage"
            used={data.usage.storageUsedMB}
            limit={data.limits.storage_mb as number}
            unit="MB"
            limitReached={false}
          />
        </div>
        {data.usage.usageResetAt && (
          <p className="text-xs text-[var(--muted-foreground)] mt-4">
            Monthly counters reset: {new Date(data.usage.usageResetAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Feature Flags */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <h4 className="text-lg font-semibold text-[var(--foreground)] mb-4">Feature Access</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <FeatureFlag label="CRM Module" enabled={data.features.module_crm} />
          <FeatureFlag label="Certificates Module" enabled={data.features.module_certificates} />
          <FeatureFlag label="Customer Portal" enabled={data.features.module_portal} />
          <FeatureFlag label="Tools Pack" enabled={data.features.module_tools} />
          <FeatureFlag label="Schedule & Planner" enabled={data.features.feature_schedule} />
          <FeatureFlag label="Timesheets" enabled={data.features.feature_timesheets} />
          <FeatureFlag label="Xero Integration" enabled={data.features.feature_xero} />
          <FeatureFlag label="Custom Subdomain" enabled={data.features.feature_subdomain} />
          <FeatureFlag label="Dedicated Database" enabled={data.features.feature_dedicated_db} />
        </div>
      </div>

      {/* Raw Limits (Debug) */}
      <details className="bg-[var(--muted)] rounded-xl p-4">
        <summary className="cursor-pointer text-sm font-medium text-[var(--muted-foreground)]">
          Raw Limits (Debug)
        </summary>
        <pre className="mt-4 text-xs overflow-auto">
          {JSON.stringify(data.limits, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function UsageMeter({
  icon: Icon,
  label,
  used,
  limit,
  unit = "",
  limitReached,
}: {
  icon: React.ElementType;
  label: string;
  used: number;
  limit: number;
  unit?: string;
  limitReached: boolean;
}) {
  const isUnlimited = !Number.isFinite(limit);
  const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const isWarning = percentage >= 80;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("w-4 h-4", limitReached ? "text-red-500" : "text-[var(--muted-foreground)]")} />
          <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
        </div>
        {limitReached && <AlertTriangle className="w-4 h-4 text-red-500" />}
      </div>
      <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all",
            limitReached ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-[var(--primary)]"
          )}
          style={{ width: isUnlimited ? "0%" : `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
        <span>
          {used.toLocaleString()}
          {unit && ` ${unit}`}
        </span>
        <span>{isUnlimited ? "Unlimited" : `${limit.toLocaleString()}${unit && ` ${unit}`}`}</span>
      </div>
    </div>
  );
}

function FeatureFlag({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border",
        enabled
          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
          : "bg-[var(--muted)] border-[var(--border)]"
      )}
    >
      {enabled ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <X className="w-4 h-4 text-[var(--muted-foreground)]" />
      )}
      <span
        className={cn(
          "text-sm",
          enabled ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
        )}
      >
        {label}
      </span>
    </div>
  );
}
