import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutButton, PortalButton } from "./BillingActions";
import { getPlanDefinition } from "@/lib/billing/plans";
import { Receipt, Check, Sparkles, Users, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

type BillingStatus = {
  plan?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: string | null;
  trialEnd?: string | null;
};

async function loadStatus(): Promise<BillingStatus | null> {
  try {
    const r = await fetch(process.env.NEXT_PUBLIC_APP_URL + "/api/admin/billing/status", { cache: "no-store" });
    if (!r.ok) return null;
    return (await r.json().catch(() => null)) as BillingStatus | null;
  } catch {
    return null;
  }
}

function formatStatus(status?: string) {
  if (!status) return "Unavailable";
  return status.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function BillingPage() {
  const status = await loadStatus();
  const planDefinition = getPlanDefinition(status?.plan);
  const renewalDate = status?.subscriptionStatus === "trialing" ? formatDate(status?.trialEnd) : formatDate(status?.currentPeriodEnd);

  return (
    <AppShell role="admin" title="Billing" subtitle="Manage your Quantract subscription">
      <div className="space-y-6 max-w-5xl">
        {/* Current Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Current Status</CardTitle>
                <CardDescription>Your subscription details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {status ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--muted-foreground)]">Plan:</span>
                    <Badge variant="gradient" className="text-sm">{planDefinition.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--muted-foreground)]">Status:</span>
                    <Badge variant={status.subscriptionStatus === 'active' ? 'success' : 'warning'}>
                      {formatStatus(status.subscriptionStatus)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {status.subscriptionStatus === "trialing" ? "Trial ends:" : "Renews:"}
                    </span>
                    <span className="text-sm font-medium text-[var(--foreground)]">{renewalDate ?? "Not set"}</span>
                  </div>
                </div>
                <div className="flex flex-col items-start gap-2">
                  <PortalButton />
                  <p className="text-xs text-[var(--muted-foreground)]">Use Stripe to update payment methods or cancel.</p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[var(--muted-foreground)] p-4 rounded-xl bg-[var(--muted)]">
                Billing status unavailable. Please check your configuration.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Plans */}
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Available Plans</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card variant="interactive" className="relative">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-500" />
                  <CardTitle>Solo</CardTitle>
                </div>
                <CardDescription>Perfect for individual contractors</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {['1 company', 'Admin + 1 engineer', 'Quotes, jobs, certs, invoices'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <Check className="w-4 h-4 text-[var(--success)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <CheckoutButton plan="solo" />
              </CardContent>
            </Card>

            <Card variant="interactive" className="relative border-[var(--primary)]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="gradient">Most Popular</Badge>
              </div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-violet-500" />
                  <CardTitle>Team</CardTitle>
                </div>
                <CardDescription>For growing businesses</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {['Up to 5 engineers', 'Scheduling + timesheets', 'Client portal'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <Check className="w-4 h-4 text-[var(--success)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <CheckoutButton plan="team" />
              </CardContent>
            </Card>

            <Card variant="interactive" className="relative">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <CardTitle>Pro</CardTitle>
                </div>
                <CardDescription>For established companies</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6">
                  {['Unlimited engineers', 'Xero integration-ready', 'Priority support'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <Check className="w-4 h-4 text-[var(--success)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <CheckoutButton plan="pro" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
