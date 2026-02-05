"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBillingStatus } from "@/components/billing/useBillingStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useToast } from "@/components/ui/useToast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/DropdownMenu";
import { apiRequest, getApiErrorMessage } from "@/lib/apiClient";
import { getPlanDefinition, isEngineerLimitReached } from "@/lib/billing/plans";
import { toTitleCase } from "@/lib/cn";
import { Ellipsis, SquarePen, Eye, User, UserCog, Activity, Clock, Award, Briefcase } from "lucide-react";

type Engineer = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  costRatePerHour?: number;
  chargeRatePerHour?: number;
  rateCardId?: string;
  rateCardName?: string;
  rateCardCostRate?: number;
  rateCardChargeRate?: number;
  isActive?: boolean;
  createdAtISO: string;
  updatedAtISO: string;
};

type RateCard = {
  id: string;
  name: string;
  costRatePerHour: number;
  chargeRatePerHour: number;
  isDefault?: boolean;
  createdAtISO: string;
  updatedAtISO: string;
};

export default function EngineersPageClient() {
  const { toast } = useToast();
  const router = useRouter();
  const loadedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const [engineers, setEngineers] = useState<Engineer[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const [query, setQuery] = useState("");
  const [activityData, setActivityData] = useState<Record<string, { lastActive: string | null; todayJobCount: number }>>({});

  // Create engineer form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [creating, setCreating] = useState(false);

  const [rateName, setRateName] = useState("");
  const [rateCost, setRateCost] = useState("");
  const [rateCharge, setRateCharge] = useState("");
  const [rateDefault, setRateDefault] = useState(false);

  // Activity feed state
  type ActivityItem = { id: string; type: string; entityType: string; action: string; description: string; linkedEntity?: { type: string; id: string; label: string | null } | null; timestamp: string };
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [activityFilter, setActivityFilter] = useState("all");
  const [activityLoading, setActivityLoading] = useState(false);

  const { status: billingStatus } = useBillingStatus();
  const planDefinition = getPlanDefinition(billingStatus?.plan);
  const limitReached = billingStatus ? isEngineerLimitReached(billingStatus.plan, engineers.length) : false;

  const load = useCallback(async () => {
    // Abort any existing request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setLoadError(null);

    try {
      const [engineerData, rateData] = await Promise.all([
        apiRequest<{ ok: boolean; engineers: Engineer[]; error?: string }>("/api/admin/engineers", { 
          cache: "no-store",
          signal: abortRef.current.signal,
        }),
        apiRequest<{ ok: boolean; rateCards: RateCard[]; error?: string }>("/api/admin/rate-cards", { 
          cache: "no-store",
          signal: abortRef.current.signal,
        }),
      ]);

      if (!engineerData.ok) throw new Error(engineerData.error || "Failed to load engineers");

      const list = Array.isArray(engineerData.engineers) ? engineerData.engineers : [];
      setEngineers(list);

      setRateCards(rateData.ok && Array.isArray(rateData.rateCards) ? rateData.rateCards : []);

      // Fetch activity signals (non-blocking)
      fetch('/api/admin/engineers/activity')
        .then(r => r.json())
        .then(json => { if (json.ok) setActivityData(json.activity); })
        .catch(() => {});

      // Keep selection stable, but ensure something is selected if list exists
      setSelectedId((prev) => {
        if (prev && list.some((e) => e.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (error: any) {
      if (error?.name === 'AbortError') return;
      const message = getApiErrorMessage(error, "Unable to load engineers");
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load only once on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [load]);

  // Load activity feed when selected engineer changes
  useEffect(() => {
    if (!selectedId) return;
    setActivityLoading(true);
    fetch(`/api/admin/staff/${selectedId}/activity?type=${activityFilter}&limit=20`)
      .then(r => r.json())
      .then(json => { if (json.ok) setActivityItems(json.items || []); })
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, [selectedId, activityFilter]);

  const toggleActive = useCallback(
    async (engineer: Engineer) => {
      try {
        const next = engineer.isActive === false ? true : false;

        const res = await apiRequest<{ ok: boolean; error?: string }>(`/api/admin/engineers/${engineer.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ isActive: next }),
        });

        if (!res.ok) throw new Error(res.error || "Failed to update engineer");

        toast({
          title: next ? "Engineer activated" : "Engineer deactivated",
          variant: "success",
        });

        load();
      } catch (err) {
        toast({
          title: "Update failed",
          description: err instanceof Error ? err.message : "Failed to update engineer",
          variant: "destructive",
        });
      }
    },
    [load, toast]
  );

  const handleImpersonate = useCallback(
    async (engineer: Engineer) => {
      try {
        const res = await apiRequest<{ ok: boolean; error?: string }>(`/api/admin/impersonate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId: engineer.id, role: "engineer" }),
        });

        if (!res.ok) throw new Error(res.error || "Failed to impersonate");

        toast({
          title: "Impersonating engineer",
          description: `Now viewing as ${engineer.name}`,
          variant: "success",
        });

        window.location.href = "/engineer";
      } catch (err) {
        toast({
          title: "Impersonation failed",
          description: err instanceof Error ? err.message : "Failed to impersonate engineer",
          variant: "destructive",
        });
      }
    },
    [toast]
  );

  const filtered = useMemo(() => {
    // Deduplicate by id first
    const seen = new Set<string>();
    const unique = engineers.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
    const s = query.trim().toLowerCase();
    if (!s) return unique;
    return unique.filter((e) =>
      [e.name, e.email, e.id].filter(Boolean).some((v) => String(v).toLowerCase().includes(s))
    );
  }, [engineers, query]);

  const selected = useMemo(
    () => filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId]
  );

  async function updateEngineerRateCard(engineerId: string, rateCardId: string) {
    try {
      const data = await apiRequest<{ ok: boolean; engineer: Engineer; error?: string }>(`/api/admin/engineers/${engineerId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rateCardId: rateCardId || null }),
      });

      if (!data.ok) throw new Error(data.error || "Failed");

      setEngineers((prev) => prev.map((eng) => (eng.id === engineerId ? data.engineer : eng)));
      toast({ title: "Updated", description: "Rate card assigned.", variant: "success" });
    } catch (error) {
      toast({ title: "Error", description: getApiErrorMessage(error, "Could not update rate card."), variant: "destructive" });
    }
  }

  async function createRateCard() {
    const name = rateName.trim();
    if (!name) {
      toast({ title: "Missing name", description: "Enter a rate card name.", variant: "destructive" });
      return;
    }

    try {
      const data = await apiRequest<{ ok: boolean; rateCard: RateCard; error?: string }>("/api/admin/rate-cards", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          costRatePerHour: rateCost ? Number(rateCost) : undefined,
          chargeRatePerHour: rateCharge ? Number(rateCharge) : undefined,
          isDefault: rateDefault,
        }),
      });

      if (!data.ok) throw new Error(data.error || "Failed");

      setRateCards((prev) => {
        const next = rateDefault ? prev.map((card) => ({ ...card, isDefault: false })) : prev;
        return [data.rateCard, ...next];
      });

      setRateName("");
      setRateCost("");
      setRateCharge("");
      setRateDefault(false);

      toast({ title: "Rate card created", description: "Rate card saved.", variant: "success" });
    } catch (error) {
      toast({ title: "Error", description: getApiErrorMessage(error, "Could not create rate card."), variant: "destructive" });
    }
  }

  async function createEngineer() {
    const email = newEmail.trim().toLowerCase();
    if (!email) {
      toast({ title: "Missing email", description: "Email is required.", variant: "destructive" });
      return;
    }

    setCreating(true);
    try {
      const data = await apiRequest<{ ok: boolean; engineer: Engineer; error?: string }>("/api/admin/engineers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          name: newName.trim() || undefined,
          phone: newPhone.trim() || undefined,
        }),
      });

      if (!data.ok) throw new Error(data.error || "Failed to create engineer");

      toast({ title: "Engineer created", description: `${email} has been added.`, variant: "success" });
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      load();
    } catch (error) {
      toast({ title: "Error", description: getApiErrorMessage(error, "Could not create engineer."), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  }

  async function setPortalPassword(targetEmail: string, targetId?: string) {
    if (!pw || pw.length < 8 || pw !== pw2) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 8 characters and match confirmation.",
        variant: "destructive",
      });
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/admin/users/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "engineer",
          email: targetEmail,
          password: pw,
          engineerId: targetId,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "set_password_failed");

      toast({ title: "Password updated", description: `Password set for ${targetEmail}`, variant: "success" });
      setPw("");
      setPw2("");
    } catch (e: any) {
      toast({ title: "Error", description: getApiErrorMessage(e), variant: "destructive" });
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {limitReached ? (
        <div className="lg:col-span-12 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">Engineer seats maxed out</div>
          <div className="mt-1">
            Your {planDefinition.label} plan includes {planDefinition.limits.maxEngineers} engineer seat
            {planDefinition.limits.maxEngineers === 1 ? "" : "s"}. Upgrade to add more.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" disabled>
              Add engineer
            </Button>
            <Link href="/admin/billing">
              <Button type="button">Upgrade plan</Button>
            </Link>
          </div>
        </div>
      ) : null}

      <div className="lg:col-span-8">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Engineers</CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="w-[240px] max-w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-sm text-[var(--foreground)]"
                  placeholder="Search email, name…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button variant="secondary" type="button" onClick={() => load()} disabled={loading}>
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-4 items-center gap-4">
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-5" />
                    <LoadingSkeleton className="h-5" />
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <ErrorState title="Failed to load" description={loadError} onRetry={load} />
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No engineers yet"
                description="Engineers are created automatically when you schedule jobs or add new engineer emails."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-[var(--muted-foreground)]">
                      <th className="py-2">Engineer</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Updated</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                      <tr
                        key={e.id}
                        className={`border-t border-[var(--border)] ${selectedId === e.id ? "bg-[var(--muted)]" : ""}`}
                      >
                        <td className="py-3">
                          <div className="font-semibold text-[var(--foreground)]">{toTitleCase(e.name) || e.email}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">{e.email}</div>
                          {activityData[e.id] && (
                            <div className="flex gap-3 mt-0.5">
                              {activityData[e.id].todayJobCount > 0 && (
                                <span className="text-[10px] text-slate-400">{activityData[e.id].todayJobCount} job{activityData[e.id].todayJobCount === 1 ? '' : 's'} today</span>
                              )}
                              {activityData[e.id].lastActive && (
                                <span className="text-[10px] text-slate-400">Last active {(() => { const d = Math.floor((Date.now() - new Date(activityData[e.id].lastActive!).getTime()) / 86400000); return d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d}d ago`; })()}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge variant={e.isActive === false ? "secondary" : "success"}>
                            {e.isActive === false ? "Inactive" : "Active"}
                          </Badge>
                        </td>
                        <td className="py-3 text-xs text-[var(--muted-foreground)]">{new Date(e.updatedAtISO).toLocaleDateString("en-GB")}</td>
                        <td className="py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" type="button" className="h-8 w-8">
                                <Ellipsis className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/admin/engineers/${e.id}`)}>
                                <User className="w-4 h-4 mr-2" />
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSelectedId(e.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleActive(e)}>
                                <SquarePen className="w-4 h-4 mr-2" />
                                {e.isActive === false ? "Activate" : "Deactivate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleImpersonate(e)}>
                                <UserCog className="w-4 h-4 mr-2" />
                                Impersonate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-4 space-y-6">
        {/* Create engineer form */}
        <Card>
          <CardHeader>
            <CardTitle>Create engineer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Name</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)]"
                  placeholder="Engineer name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Email <span className="text-red-500">*</span></span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)]"
                  placeholder="engineer@example.com"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Phone</span>
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)]"
                  placeholder="Phone number"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </label>

              <Button type="button" onClick={createEngineer} disabled={creating || limitReached}>
                {creating ? "Creating…" : "Create engineer"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Engineer details</CardTitle>
          </CardHeader>

          <CardContent>
            {!selected ? (
              <EmptyState title="Select an engineer" description="Choose an engineer to see details." />
            ) : (
              <div className="grid gap-3 text-sm">
                <div>
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Name</div>
                  <div className="font-semibold text-[var(--foreground)]">{selected.name || "—"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Email</div>
                  <div className="text-[var(--foreground)]">{selected.email}</div>
                </div>
                {selected.phone ? (
                  <div>
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Phone</div>
                    <div className="text-[var(--foreground)]">{selected.phone}</div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Cost rate</div>
                    <div className="text-[var(--foreground)]">
                      £{(selected.costRatePerHour ?? 0).toFixed(2)}/hr
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[var(--muted-foreground)]">Charge rate</div>
                    <div className="text-[var(--foreground)]">
                      £{(selected.chargeRatePerHour ?? 0).toFixed(2)}/hr
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Rate card</div>
                  <select
                    className="mt-1 w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                    value={selected.rateCardId ?? ""}
                    onChange={(e) => updateEngineerRateCard(selected.id, e.target.value)}
                  >
                    <option value="">No rate card</option>
                    {rateCards.map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name} (£{card.costRatePerHour.toFixed(2)}/hr)
                      </option>
                    ))}
                  </select>

                  {selected.rateCardName ? (
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {selected.rateCardName} • Cost £{(selected.rateCardCostRate ?? 0).toFixed(2)}/hr • Charge £
                      {(selected.rateCardChargeRate ?? 0).toFixed(2)}/hr
                    </div>
                  ) : null}
                </div>

                <div>
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Status</div>
                  <Badge variant={selected.isActive === false ? "secondary" : "success"}>
                    {selected.isActive === false ? "Inactive" : "Active"}
                  </Badge>
                </div>

                <div className="text-xs text-[var(--muted-foreground)]">Created {new Date(selected.createdAtISO).toLocaleDateString("en-GB")}</div>
              </div>
            )}

            <div className="mt-6 border-t border-[var(--border)] pt-5 space-y-3">
              <div className="text-sm font-semibold text-[var(--foreground)]">Set portal password</div>
              <div className="text-xs text-[var(--muted-foreground)]">
                Use this if someone requests a password reset by email. (Magic-link login still works.)
              </div>

              <div className="grid gap-3">
                <input
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  type="password"
                  placeholder="New password (min 8 chars)"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  autoComplete="new-password"
                />
                <input
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  type="password"
                  placeholder="Confirm new password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  autoComplete="new-password"
                />
                <Button
                  type="button"
                  onClick={() => selected && setPortalPassword(selected.email, selected.id)}
                  disabled={pwSaving || !pw || pw.length < 8 || pw !== pw2 || !selected}
                >
                  {pwSaving ? "Saving…" : "Update password"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rate cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="grid gap-2">
                <input
                  className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  placeholder="Rate card name"
                  value={rateName}
                  onChange={(e) => setRateName(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                    placeholder="Cost rate"
                    type="number"
                    step="0.01"
                    value={rateCost}
                    onChange={(e) => setRateCost(e.target.value)}
                  />
                  <input
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                    placeholder="Charge rate"
                    type="number"
                    step="0.01"
                    value={rateCharge}
                    onChange={(e) => setRateCharge(e.target.value)}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <input type="checkbox" checked={rateDefault} onChange={(e) => setRateDefault(e.target.checked)} />
                  Set as default
                </label>

                <Button type="button" onClick={createRateCard}>
                  Add rate card
                </Button>
              </div>

              {rateCards.length === 0 ? (
                <div className="text-xs text-[var(--muted-foreground)]">No rate cards yet.</div>
              ) : (
                <div className="space-y-2">
                  {rateCards.map((card) => (
                    <div key={card.id} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-[var(--foreground)]">{card.name}</div>
                        {card.isDefault ? <Badge>Default</Badge> : null}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Cost £{card.costRatePerHour.toFixed(2)}/hr • Charge £{card.chargeRatePerHour.toFixed(2)}/hr
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--primary)]" />
                <CardTitle>Activity</CardTitle>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                { key: "all", label: "All", icon: Activity },
                { key: "jobs", label: "Jobs", icon: Briefcase },
                { key: "certs", label: "Certs", icon: Award },
                { key: "timesheets", label: "Time", icon: Clock },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setActivityFilter(f.key)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    activityFilter === f.key
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                  }`}
                >
                  <f.icon className="w-3 h-3" />
                  {f.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="text-xs text-[var(--muted-foreground)]">Select an engineer to see activity.</div>
            ) : activityLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-[var(--muted)] animate-pulse" />
                ))}
              </div>
            ) : activityItems.length === 0 ? (
              <div className="text-xs text-[var(--muted-foreground)]">No activity found for this filter.</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {activityItems.map(item => (
                  <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--background)]">
                    <div className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      item.type === "timesheet" ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
                    }`}>
                      {item.type === "timesheet" ? <Clock className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--foreground)] truncate">{item.description}</p>
                      {item.linkedEntity?.label && (
                        <p className="text-[10px] text-[var(--primary)] truncate">{item.linkedEntity.label}</p>
                      )}
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        {new Date(item.timestamp).toLocaleDateString("en-GB")} {new Date(item.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
