import { AppShell } from "@/components/AppShell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckoutButton, PortalButton } from "./BillingActions";
import {
  getPlanDefinition,
  getAllPlans,
  normalizePlan,
  hasAdminBypass,
  getTrialStatus,
  MODULE_PRICING,
  type Module,
} from "@/lib/billing/plans";
import { requireCompanyContext } from "@/lib/serverAuth";
import { getPrisma } from "@/lib/server/prisma";
import {
  Receipt,
  Check,
  Sparkles,
  Users,
  Zap,
  AlertCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

function formatStatus(status?: string) {
  if (!status) return "Unavailable";
  return status.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatDate(value?: Date | string | null) {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusBadgeVariant(
  status?: string
): "success" | "warning" | "destructive" | "secondary" {
  if (status === "active") return "success";
  if (status === "trialing") return "warning";
  if (status === "past_due") return "destructive";
  return "secondary";
}

const planIcons: Record<string, React.ReactNode> = {
  core: <Zap className="w-5 h-5 text-blue-500" />,
  pro: <Users className="w-5 h-5 text-violet-500" />,
  pro_plus: <Sparkles className="w-5 h-5 text-amber-500" />,
  enterprise: <Sparkles className="w-5 h-5 text-rose-500" />,
};

export default async function BillingPage() {
  const authCtx = await requireCompanyContext();
  const userEmail = authCtx.email;
  const companyId = authCtx.companyId;
  const client = getPrisma();

  let billingData: {
    plan: string | null;
    subscriptionStatus: string | null;
    currentPeriodEnd: Date | null;
    trialEnd: Date | null;
    trialStartedAt: Date | null;
    billing: {
      plan: string;
      subscriptionStatus: string;
      currentPeriodStart: Date | null;
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
      trialStartedAt: Date | null;
      trialEnd: Date | null;
      enabledModules: string[];
      extraUsers: number;
      extraEntities: number;
      extraStorageMB: number;
    } | null;
  } | null = null;

  if (client) {
    billingData = await client.company.findUnique({
      where: { id: companyId },
      select: {
        plan: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        trialEnd: true,
        trialStartedAt: true,
        billing: {
          select: {
            plan: true,
            subscriptionStatus: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            trialStartedAt: true,
            trialEnd: true,
            enabledModules: true,
            extraUsers: true,
            extraEntities: true,
            extraStorageMB: true,
          },
        },
      },
    });
  }

  const hasBypass = hasAdminBypass(userEmail);
  const billing = billingData?.billing;
  const rawPlan = billing?.plan || billingData?.plan || "trial";
  const effectivePlan = hasBypass ? "enterprise" : normalizePlan(rawPlan);
  const planDef = getPlanDefinition(
    rawPlan,
    hasBypass ? userEmail : undefined
  );

  const effectiveStatus = hasBypass
    ? "active"
    : billing?.subscriptionStatus ||
      billingData?.subscriptionStatus ||
      "inactive";

  const trialStatus = getTrialStatus(
    rawPlan,
    billing?.trialStartedAt || billingData?.trialStartedAt || null,
    hasBypass ? userEmail : undefined
  );

  const renewalDate =
    effectiveStatus === "trialing"
      ? formatDate(billing?.trialEnd || billingData?.trialEnd)
      : formatDate(billing?.currentPeriodEnd || billingData?.currentPeriodEnd);

  const enabledModules = (billing?.enabledModules || []) as Module[];

  // Plans available for checkout (exclude trial and enterprise)
  const checkoutPlans = getAllPlans().filter(
    (p) => p.id !== "trial" && p.id !== "enterprise"
  );

  return (
    <AppShell
      role="admin"
      title="Billing"
      subtitle="Manage your Quantract subscription"
    >
      <div className="space-y-8 max-w-5xl">
        {/* Current Status */}
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
            {billingData ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Plan:
                    </span>
                    <Badge variant="gradient" className="text-sm">
                      {planDef.label}
                    </Badge>
                    {hasBypass && (
                      <Badge variant="outline" className="text-xs">
                        Admin Bypass
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      Status:
                    </span>
                    <Badge variant={statusBadgeVariant(effectiveStatus)}>
                      {formatStatus(effectiveStatus)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--muted-foreground)]">
                      {effectiveStatus === "trialing"
                        ? "Trial ends:"
                        : "Renews:"}
                    </span>
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {renewalDate ?? "Not set"}
                    </span>
                  </div>
                  {trialStatus.isTrialPlan &&
                    trialStatus.daysRemaining !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4 text-[var(--warning)]" />
                        <span className="text-[var(--warning)] font-medium">
                          {trialStatus.isExpired
                            ? "Trial expired"
                            : `${trialStatus.daysRemaining} day${trialStatus.daysRemaining !== 1 ? "s" : ""} remaining`}
                        </span>
                      </div>
                    )}
                  {billing?.cancelAtPeriodEnd && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-[var(--destructive)]" />
                      <span className="text-[var(--destructive)] font-medium">
                        Cancels at period end
                      </span>
                    </div>
                  )}
                  {enabledModules.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-[var(--muted-foreground)]">
                        Modules:
                      </span>
                      {enabledModules.map((m) => (
                        <Badge key={m} variant="secondary" className="text-xs">
                          {MODULE_PRICING[m]?.label || m}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-start gap-2">
                  <PortalButton />
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Use Stripe to update payment methods or cancel.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[var(--muted-foreground)] p-4 rounded-xl bg-[var(--muted)]">
                Billing status unavailable. Please check your configuration.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Cards */}
        <div>
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">
            Available Plans
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {checkoutPlans.map((p) => {
              const isCurrent = effectivePlan === p.id;
              const isPopular = p.id === "pro";
              return (
                <Card
                  key={p.id}
                  variant="interactive"
                  className={`relative ${isPopular ? "border-[var(--primary)]" : ""}`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="gradient">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      {planIcons[p.id] || (
                        <Zap className="w-5 h-5 text-blue-500" />
                      )}
                      <CardTitle>{p.label}</CardTitle>
                    </div>
                    <CardDescription>{p.description}</CardDescription>
                    <div className="mt-3">
                      <span className="text-2xl font-bold text-[var(--foreground)]">
                        £{p.price}
                      </span>
                      <span className="text-sm text-[var(--muted-foreground)]">
                        /mo
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                        <Check className="w-4 h-4 text-[var(--success)]" />
                        {p.limits.includedUsers} users included
                      </li>
                      {p.limits.includedModules.length > 0 ? (
                        <li className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <Check className="w-4 h-4 text-[var(--success)]" />
                          All modules included
                        </li>
                      ) : (
                        <li className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <Check className="w-4 h-4 text-[var(--success)]" />
                          Add modules as needed
                        </li>
                      )}
                      {p.limits.invoicesPerMonth > 0 && (
                        <li className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <Check className="w-4 h-4 text-[var(--success)]" />
                          {p.limits.invoicesPerMonth === Infinity
                            ? "Unlimited"
                            : p.limits.invoicesPerMonth}{" "}
                          invoices/mo
                        </li>
                      )}
                      {p.limits.certificatesPerMonth > 0 && (
                        <li className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <Check className="w-4 h-4 text-[var(--success)]" />
                          {p.limits.certificatesPerMonth === Infinity
                            ? "Unlimited"
                            : p.limits.certificatesPerMonth}{" "}
                          certificates/mo
                        </li>
                      )}
                      <li className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                        <Check className="w-4 h-4 text-[var(--success)]" />
                        {p.limits.storageMB >= 1024
                          ? `${Math.round(p.limits.storageMB / 1024)}GB`
                          : `${p.limits.storageMB}MB`}{" "}
                        storage
                      </li>
                      {p.limits.includesSchedule && (
                        <li className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                          <Check className="w-4 h-4 text-[var(--success)]" />
                          Scheduling &amp; timesheets
                        </li>
                      )}
                    </ul>
                    {isCurrent ? (
                      <Badge variant="success" className="w-full justify-center py-2">
                        Current Plan
                      </Badge>
                    ) : (
                      <CheckoutButton
                        plan={p.id as "core" | "pro" | "pro_plus"}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Module Cards (only for Core plan) */}
        {effectivePlan === "core" && (
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Available Modules
            </h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Add modules to your Core plan, or upgrade to Pro to get everything
              included.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.entries(MODULE_PRICING) as [Module, (typeof MODULE_PRICING)[Module]][]).map(
                ([modId, mod]) => {
                  const isEnabled = enabledModules.includes(modId);
                  return (
                    <Card key={modId} className="relative">
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-[var(--primary)]" />
                          <CardTitle className="text-base">
                            {mod.label}
                          </CardTitle>
                        </div>
                        <div className="mt-1">
                          <span className="text-lg font-bold text-[var(--foreground)]">
                            £{mod.price}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)]">
                            /mo
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {isEnabled ? (
                          <Badge
                            variant="success"
                            className="w-full justify-center py-1.5"
                          >
                            Active
                          </Badge>
                        ) : (
                          <CheckoutButton
                            plan="core"
                            modules={[modId]}
                            label={`Add ${mod.label}`}
                            variant="outline"
                          />
                        )}
                      </CardContent>
                    </Card>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* Entitlements Debug (development only) */}
        {process.env.NODE_ENV === "development" && (
          <details className="text-xs">
            <summary className="cursor-pointer text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              Debug: Entitlements
            </summary>
            <pre className="mt-2 p-3 rounded-lg bg-[var(--muted)] overflow-auto text-[var(--muted-foreground)]">
              {JSON.stringify(
                {
                  effectivePlan,
                  effectiveStatus,
                  hasBypass,
                  enabledModules,
                  addOns: {
                    extraUsers: billing?.extraUsers || 0,
                    extraEntities: billing?.extraEntities || 0,
                    extraStorageMB: billing?.extraStorageMB || 0,
                  },
                  trialStatus,
                  limits: planDef.limits,
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </div>
    </AppShell>
  );
}
