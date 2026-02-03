"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  Check,
  Sparkles,
  Users,
  Zap,
  AlertTriangle,
  Clock,
  Settings,
  ArrowRight,
} from "lucide-react";
import { MODULE_CATALOG } from "@/lib/billing/catalog";
import { getPlanDefinition, type PlanTier, type Module } from "@/lib/billing/plans";

function AlertBanner({
  variant = "warning",
  icon: Icon,
  children,
}: {
  variant?: "warning" | "error";
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const colors =
    variant === "error"
      ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400"
      : "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400";

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border ${colors}`}>
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="text-sm">{children}</div>
    </div>
  );
}

type BillingStatus = {
  ok: boolean;
  plan: string;
  planLabel: string;
  subscriptionStatus: string;
  currentPeriodSparklest?: string | null;
  currentPeriodEnd?: string | null;
  trialEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  hasBypass?: boolean;
  trial?: {
    isTrialPlan: boolean;
    daysRemaining: number | null;
    isExpired: boolean;
    trialEndsAt: string | null;
  };
  modules?: string[];
  addOns?: {
    extraUsers: number;
    extraEntities: number;
    extraStorageMB: number;
  };
};

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status?: string) {
  if (!status) return "Unavailable";
  return status.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function CheckoutButton({ plan }: { plan: "core" | "pro" | "pro_plus" }) {
  const [busy, setBusy] = useState(false);

  async function handleCheckout() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error ?? "Checkout failed");
      if (d?.url) window.location.href = d.url;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Checkout failed";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  const planDef = getPlanDefinition(plan);

  return (
    <Button
      variant="gradient"
      onClick={handleCheckout}
      disabled={busy}
      className="w-full"
    >
      {busy ? "Redirecting…" : `Upgrade to ${planDef.label}`}
    </Button>
  );
}

function PortalButton({ variant = "secondary" }: { variant?: "secondary" | "default" }) {
  const [busy, setBusy] = useState(false);

  async function handlePortal() {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/billing/portal", { method: "POST" });
      const d = await r.json().catch(() => null);
      if (!r.ok) throw new Error(d?.error ?? "Portal failed");
      if (d?.url) window.location.href = d.url;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Portal failed";
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant={variant} onClick={handlePortal} disabled={busy}>
      <Settings className="w-4 h-4 mr-2" />
      {busy ? "Opening…" : "Manage in Stripe"}
    </Button>
  );
}

export function BillingSettings() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/billing/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setStatus(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-[var(--muted-foreground)]">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        Loading billing information...
      </div>
    );
  }

  if (!status) {
    return (
      <AlertBanner variant="error" icon={AlertTriangle}>
        Unable to load billing information. Please check your configuration.
      </AlertBanner>
    );
  }

  const isTrialing = status.trial?.isTrialPlan && !status.trial.isExpired;
  const isTrialExpired = status.trial?.isTrialPlan && status.trial.isExpired;
  const daysRemaining = status.trial?.daysRemaining ?? 0;
  const showUpgradeOptions = status.plan === "trial" || status.plan === "core";
  // Use a function to check plan to avoid TypeScript's control flow narrowing
  const isPlan = (plan: string) => status.plan === plan;

  return (
    <div className="space-y-6">
      {/* Trial Warning Banner */}
      {isTrialing && daysRemaining <= 7 && (
        <AlertBanner icon={Clock}>
          Your trial ends in{" "}
          <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong>.
          Upgrade now to keep access to all features.
        </AlertBanner>
      )}

      {isTrialExpired && (
        <AlertBanner variant="error" icon={AlertTriangle}>
          Your trial has expired. Upgrade to continue using Quantract.
        </AlertBanner>
      )}

      {status.cancelAtPeriodEnd && (
        <AlertBanner icon={AlertTriangle}>
          Your subscription is scheduled to cancel on{" "}
          <strong>{formatDate(status.currentPeriodEnd)}</strong>.
          You can reactivate from the Stripe portal.
        </AlertBanner>
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </div>
            {status.hasBypass && (
              <Badge variant="outline" className="text-purple-600 border-purple-300">
                <Sparkles className="w-3 h-3 mr-1" />
                Admin Bypass
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--muted-foreground)]">Plan:</span>
                <Badge variant="gradient" className="text-sm px-3 py-1">
                  {status.planLabel}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[var(--muted-foreground)]">Status:</span>
                <Badge
                  variant={
                    status.subscriptionStatus === "active" || status.subscriptionStatus === "trialing"
                      ? "success"
                      : status.subscriptionStatus === "past_due"
                      ? "warning"
                      : "secondary"
                  }
                >
                  {formatStatus(status.subscriptionStatus)}
                </Badge>
              </div>
              {!isTrialing && status.currentPeriodEnd && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {status.cancelAtPeriodEnd ? "Cancels:" : "Renews:"}
                  </span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {formatDate(status.currentPeriodEnd)}
                  </span>
                </div>
              )}
              {isTrialing && status.trial?.trialEndsAt && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--muted-foreground)]">Trial ends:</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {formatDate(status.trial.trialEndsAt)} ({daysRemaining} days remaining)
                  </span>
                </div>
              )}

              {/* Enabled Modules */}
              {status.modules && status.modules.length > 0 && (
                <div className="flex items-start gap-3">
                  <span className="text-sm text-[var(--muted-foreground)]">Modules:</span>
                  <div className="flex flex-wrap gap-2">
                    {status.modules.map((m) => (
                      <Badge key={m} variant="outline" className="text-xs">
                        {MODULE_CATALOG[m as Module]?.label || m}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Add-ons */}
              {status.addOns && (status.addOns.extraUsers > 0 || status.addOns.extraEntities > 0 || status.addOns.extraStorageMB > 0) && (
                <div className="flex items-start gap-3">
                  <span className="text-sm text-[var(--muted-foreground)]">Add-ons:</span>
                  <div className="flex flex-wrap gap-2">
                    {status.addOns.extraUsers > 0 && (
                      <Badge variant="outline" className="text-xs">
                        +{status.addOns.extraUsers} users
                      </Badge>
                    )}
                    {status.addOns.extraEntities > 0 && (
                      <Badge variant="outline" className="text-xs">
                        +{status.addOns.extraEntities} entities
                      </Badge>
                    )}
                    {status.addOns.extraStorageMB > 0 && (
                      <Badge variant="outline" className="text-xs">
                        +{Math.round(status.addOns.extraStorageMB / 1024)}GB storage
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col items-start gap-3">
              <PortalButton />
              <p className="text-xs text-[var(--muted-foreground)] max-w-[200px]">
                Update payment methods, view invoices, or cancel subscription.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      {showUpgradeOptions && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Upgrade Your Plan
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Core Plan */}
            <Card
              variant="interactive"
              className={`relative ${isPlan("core") ? "border-[var(--primary)] border-2" : ""}`}
            >
              {isPlan("core") && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="success">Current Plan</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <CardTitle>Core</CardTitle>
                </div>
                <CardDescription>Foundation plan - add modules as needed</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-[var(--foreground)]">£19</span>
                  <span className="text-[var(--muted-foreground)]">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {[
                    "3 users included",
                    "1 legal entity",
                    "50 quotes/month",
                    "Add modules as needed",
                    "Custom subdomain",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <Check className="w-4 h-4 text-[var(--success)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {isPlan("trial") && <CheckoutButton plan="core" />}
                {isPlan("core") && (
                  <Button variant="secondary" disabled className="w-full">
                    Current Plan
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card
              variant="interactive"
              className={`relative border-[var(--primary)] ${isPlan("pro") ? "border-2" : ""}`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="gradient">
                  {isPlan("pro") ? "Current Plan" : "Most Popular"}
                </Badge>
              </div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-violet-500" />
                  <CardTitle>Pro</CardTitle>
                </div>
                <CardDescription>Everything included - best value</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-[var(--foreground)]">£79</span>
                  <span className="text-[var(--muted-foreground)]">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {[
                    "10 users included",
                    "2 legal entities",
                    "All modules included",
                    "500 invoices/month",
                    "300 certificates/month",
                    "Xero integration",
                    "100GB storage",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <Check className="w-4 h-4 text-[var(--success)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {!isPlan("pro") && !isPlan("pro_plus") && !isPlan("enterprise") && (
                  <CheckoutButton plan="pro" />
                )}
                {isPlan("pro") && (
                  <Button variant="secondary" disabled className="w-full">
                    Current Plan
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Pro Plus Plan */}
            <Card
              variant="interactive"
              className={`relative ${isPlan("pro_plus") ? "border-[var(--primary)] border-2" : ""}`}
            >
              {isPlan("pro_plus") && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="success">Current Plan</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <CardTitle>Pro Plus</CardTitle>
                </div>
                <CardDescription>Pro with advanced AI and higher limits</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-[var(--foreground)]">£149</span>
                  <span className="text-[var(--muted-foreground)]">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {[
                    "20 users included",
                    "3 legal entities",
                    "All Pro features",
                    "1,000 invoices/month",
                    "500 certificates/month",
                    "200GB storage",
                    "Priority support",
                  ].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <Check className="w-4 h-4 text-[var(--success)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {!isPlan("pro_plus") && !isPlan("enterprise") && (
                  <CheckoutButton plan="pro_plus" />
                )}
                {isPlan("pro_plus") && (
                  <Button variant="secondary" disabled className="w-full">
                    Current Plan
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Enterprise CTA */}
          <Card className="mt-4 bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700">
            <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Need Enterprise?</h3>
                  <p className="text-sm text-slate-400">
                    Dedicated infrastructure, unlimited users, custom SLAs, and white-glove onboarding.
                  </p>
                </div>
              </div>
              <Button variant="secondary" className="whitespace-nowrap">
                Contact Sales
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
