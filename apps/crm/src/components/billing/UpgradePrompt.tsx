"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Zap, Check, X } from "lucide-react";
import Link from "next/link";

export type UpgradePromptProps = {
  reason: string;
  currentPlan: string;
  suggestedPlan: string;
  benefit: string;
  onDismiss?: () => void;
  variant?: "modal" | "banner" | "inline";
};

const PLAN_PRICES: Record<string, number> = {
  solo: 19,
  team: 49,
  pro: 99,
};

const PLAN_FEATURES: Record<string, string[]> = {
  solo: [
    "20 quotes per month",
    "15 invoices per month",
    "10 clients",
    "Custom subdomain",
  ],
  team: [
    "100 quotes per month",
    "75 invoices per month",
    "5 engineers",
    "50 clients",
    "Schedule & timesheets",
    "20% off Certs app",
  ],
  pro: [
    "Unlimited quotes",
    "Unlimited invoices",
    "Unlimited engineers",
    "Unlimited clients",
    "Certs app included",
    "Priority support",
  ],
};

export function UpgradePrompt({
  reason,
  currentPlan,
  suggestedPlan,
  benefit,
  onDismiss,
  variant = "modal",
}: UpgradePromptProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const price = PLAN_PRICES[suggestedPlan] || 0;
  const features = PLAN_FEATURES[suggestedPlan] || [];

  if (variant === "banner") {
    return (
      <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-[var(--foreground)]">{reason}</p>
              <p className="text-sm text-[var(--muted-foreground)]">{benefit}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/billing">
              <Button variant="gradient" size="sm">
                <Zap className="w-4 h-4 mr-1" />
                Upgrade to {suggestedPlan.charAt(0).toUpperCase() + suggestedPlan.slice(1)}
              </Button>
            </Link>
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={handleDismiss}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className="bg-[var(--muted)] border border-[var(--border)] rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-[var(--foreground)]">{reason}</span>
        </div>
        <Link href="/admin/billing">
          <Button variant="outline" size="sm">Upgrade</Button>
        </Link>
      </div>
    );
  }

  // Modal variant
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-xl">{reason}</CardTitle>
          <CardDescription className="mt-2">{benefit}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-[var(--muted)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <Badge variant="secondary" className="mb-1">Recommended</Badge>
                <h3 className="font-semibold text-lg">
                  {suggestedPlan.charAt(0).toUpperCase() + suggestedPlan.slice(1)} Plan
                </h3>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold">£{price}</span>
                <span className="text-[var(--muted-foreground)]">/mo</span>
              </div>
            </div>
            <ul className="space-y-2">
              {features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleDismiss}>
              Maybe Later
            </Button>
            <Link href="/admin/billing" className="flex-1">
              <Button variant="gradient" className="w-full">
                <Zap className="w-4 h-4 mr-1" />
                Upgrade Now
              </Button>
            </Link>
          </div>

          <p className="text-xs text-center text-[var(--muted-foreground)]">
            Cancel anytime. No long-term contracts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Trial expiration specific prompt
export function TrialExpiredPrompt({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <UpgradePrompt
      reason="Your 14-day trial has ended"
      currentPlan="trial"
      suggestedPlan="solo"
      benefit="Upgrade now to continue managing your quotes and invoices"
      onDismiss={onDismiss}
      variant="modal"
    />
  );
}

// Trial warning banner (shows days remaining)
export function TrialWarningBanner({ daysRemaining }: { daysRemaining: number }) {
  if (daysRemaining > 7) return null;

  return (
    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">
              {daysRemaining === 0 
                ? "Your trial ends today!" 
                : daysRemaining === 1 
                  ? "Your trial ends tomorrow!" 
                  : `${daysRemaining} days left in your trial`}
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Upgrade now to keep all your data and continue using Quantract
            </p>
          </div>
        </div>
        <Link href="/admin/billing">
          <Button variant="gradient" size="sm">
            View Plans
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Usage warning (shows when approaching limit)
export function UsageWarningBanner({ 
  type, 
  used, 
  limit 
}: { 
  type: "quotes" | "invoices"; 
  used: number; 
  limit: number;
}) {
  const remaining = limit - used;
  const percentage = (used / limit) * 100;

  if (percentage < 80) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-[var(--foreground)]">
              {remaining === 0 
                ? `You've used all your ${type} this month` 
                : `Only ${remaining} ${type} remaining this month`}
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              {used} of {limit} {type} used
            </p>
          </div>
        </div>
        <Link href="/admin/billing">
          <Button variant="outline" size="sm">
            Upgrade
          </Button>
        </Link>
      </div>
      {/* Progress bar */}
      <div className="mt-3 h-2 bg-[var(--muted)] rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${
            percentage >= 100 ? "bg-rose-500" : percentage >= 90 ? "bg-amber-500" : "bg-blue-500"
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}
