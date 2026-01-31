"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { Plus, Trash2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

type Overhead = {
  id: string;
  label: string;
  amountPence: number;
  frequency: string;
};

type RateCard = {
  id: string;
  name: string;
  costRatePerHour: number;
  chargeRatePerHour: number;
  isDefault: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────

function penceToPounds(p: number) {
  return (p / 100).toFixed(2);
}
function poundsToPence(v: string) {
  return Math.round(Number(v) * 100);
}

function toMonthlyPence(row: Overhead): number {
  switch (row.frequency) {
    case "weekly":
      return Math.round(row.amountPence * (52 / 12));
    case "annual":
      return Math.round(row.amountPence / 12);
    default:
      return row.amountPence;
  }
}

// ─── Component ───────────────────────────────────────────────────────

export default function FinancialsSettingsPage() {
  const { toast } = useToast();

  const [overheads, setOverheads] = useState<Overhead[]>([]);
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // New overhead form
  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newFreq, setNewFreq] = useState("monthly");

  // Working days setting
  const [workingDays, setWorkingDays] = useState(22);
  const [workingDaysSaved, setWorkingDaysSaved] = useState(22);

  // New rate card form
  const [newRcName, setNewRcName] = useState("");
  const [newRcCost, setNewRcCost] = useState("");
  const [newRcCharge, setNewRcCharge] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [oh, rc, fs] = await Promise.all([
      fetch("/api/admin/overheads").then((r) => r.json()).catch(() => ({ overheads: [] })),
      fetch("/api/admin/rate-cards").then((r) => r.json()).catch(() => ({ rateCards: [] })),
      fetch("/api/admin/settings/financials").then((r) => r.json()).catch(() => ({ settings: {} })),
    ]);
    setOverheads(Array.isArray(oh.overheads) ? oh.overheads : []);
    setRateCards(Array.isArray(rc.rateCards) ? rc.rateCards : []);
    const wd = fs.settings?.workingDaysPerMonth ?? 22;
    setWorkingDays(wd);
    setWorkingDaysSaved(wd);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ─── Overheads ──────────────────────────────────────────────

  async function addOverhead() {
    const label = newLabel.trim();
    if (!label || !newAmount) return;
    setBusy(true);
    const res = await fetch("/api/admin/overheads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ label, amountPence: poundsToPence(newAmount), frequency: newFreq }),
    }).then((r) => r.json()).catch(() => ({ ok: false }));
    if (res.ok) {
      toast({ title: "Overhead added", variant: "success" });
      setNewLabel(""); setNewAmount(""); setNewFreq("monthly");
      load();
    } else {
      toast({ title: "Failed to add overhead", variant: "destructive" });
    }
    setBusy(false);
  }

  async function deleteOverhead(id: string) {
    setBusy(true);
    await fetch(`/api/admin/overheads?id=${id}`, { method: "DELETE" }).catch(() => null);
    toast({ title: "Overhead removed", variant: "success" });
    load();
    setBusy(false);
  }

  // ─── Rate cards ─────────────────────────────────────────────

  async function addRateCard() {
    const name = newRcName.trim();
    if (!name) return;
    setBusy(true);
    const res = await fetch("/api/admin/rate-cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        costRatePerHour: Number(newRcCost) || 0,
        chargeRatePerHour: Number(newRcCharge) || 0,
      }),
    }).then((r) => r.json()).catch(() => ({ ok: false }));
    if (res.ok) {
      toast({ title: "Rate card added", variant: "success" });
      setNewRcName(""); setNewRcCost(""); setNewRcCharge("");
      load();
    } else {
      toast({ title: res.error || "Failed to add rate card", variant: "destructive" });
    }
    setBusy(false);
  }

  // ─── Working days ──────────────────────────────────────────

  async function saveWorkingDays() {
    setBusy(true);
    const res = await fetch("/api/admin/settings/financials", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workingDaysPerMonth: workingDays }),
    }).then((r) => r.json()).catch(() => ({ ok: false }));
    if (res.ok) {
      toast({ title: "Working days saved", variant: "success" });
      setWorkingDaysSaved(workingDays);
    } else {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setBusy(false);
  }

  // ─── Summary ────────────────────────────────────────────────

  const totalMonthlyPence = overheads.reduce((s, o) => s + toMonthlyPence(o), 0);

  const avgMargin = (() => {
    if (rateCards.length === 0) return null;
    const defaults = rateCards.filter((c) => c.isDefault);
    const pool = defaults.length === 1 ? defaults : rateCards;
    let tc = 0, tco = 0;
    for (const c of pool) { tc += c.chargeRatePerHour; tco += c.costRatePerHour; }
    if (tc === 0) return null;
    return ((tc - tco) / tc * 100).toFixed(1);
  })();

  return (
    <AdminSettingsShell title="Financials" subtitle="Overheads, rate cards, and break-even tracking.">
      <div className="space-y-6">
        {/* Monthly Overheads */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Overheads</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
            ) : (
              <>
                {overheads.length === 0 ? (
                  <div className="text-sm text-[var(--muted-foreground)] mb-4">
                    No overheads configured. Add your fixed costs (rent, insurance, vehicle leases, etc.) to enable break-even tracking.
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {overheads.map((o) => (
                      <div key={o.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-[var(--foreground)]">{o.label}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            £{penceToPounds(o.amountPence)} / {o.frequency}
                            {o.frequency !== "monthly" && (
                              <span className="ml-2 text-[var(--muted-foreground)]">
                                (≈ £{penceToPounds(toMonthlyPence(o))} / month)
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => deleteOverhead(o.id)}
                          disabled={busy}
                          className="p-2 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <div className="mt-3 rounded-xl bg-[var(--muted)] px-4 py-3">
                      <div className="text-xs font-semibold text-[var(--muted-foreground)]">Total monthly overhead</div>
                      <div className="text-lg font-bold text-[var(--foreground)]">£{penceToPounds(totalMonthlyPence)}</div>
                    </div>
                  </div>
                )}

                {/* Add overhead form */}
                <div className="flex flex-wrap items-end gap-2">
                  <label className="grid gap-1 flex-1 min-w-[140px]">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Label</span>
                    <input
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                      placeholder="e.g. Office rent"
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 w-28">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Amount (£)</span>
                    <input
                      type="number"
                      step="0.01"
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                      placeholder="0.00"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 w-32">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Frequency</span>
                    <select
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                      value={newFreq}
                      onChange={(e) => setNewFreq(e.target.value)}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="annual">Annual</option>
                    </select>
                  </label>
                  <Button onClick={addOverhead} disabled={busy || !newLabel.trim() || !newAmount}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Rate Cards */}
        <Card>
          <CardHeader>
            <CardTitle>Rate Cards</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
            ) : (
              <>
                {rateCards.length === 0 ? (
                  <div className="text-sm text-[var(--muted-foreground)] mb-4">
                    No rate cards yet. Add at least one to calculate margins.
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {rateCards.map((rc) => (
                      <div key={rc.id} className="flex items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3">
                        <div>
                          <div className="text-sm font-medium text-[var(--foreground)]">
                            {rc.name}
                            {rc.isDefault && (
                              <span className="ml-2 inline-block rounded bg-[var(--primary)] px-1.5 py-0.5 text-[10px] font-bold text-white">DEFAULT</span>
                            )}
                          </div>
                          <div className="text-xs text-[var(--muted-foreground)]">
                            Cost: £{rc.costRatePerHour.toFixed(2)}/hr · Charge: £{rc.chargeRatePerHour.toFixed(2)}/hr
                            {rc.chargeRatePerHour > 0 && (
                              <span className="ml-2">
                                ({((rc.chargeRatePerHour - rc.costRatePerHour) / rc.chargeRatePerHour * 100).toFixed(0)}% margin)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {avgMargin !== null && (
                      <div className="mt-3 rounded-xl bg-[var(--muted)] px-4 py-3">
                        <div className="text-xs font-semibold text-[var(--muted-foreground)]">Average margin</div>
                        <div className="text-lg font-bold text-[var(--foreground)]">{avgMargin}%</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Add rate card form */}
                <div className="flex flex-wrap items-end gap-2">
                  <label className="grid gap-1 flex-1 min-w-[140px]">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Name</span>
                    <input
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                      placeholder="e.g. Electrician"
                      value={newRcName}
                      onChange={(e) => setNewRcName(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 w-28">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Cost (£/hr)</span>
                    <input
                      type="number"
                      step="0.01"
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                      placeholder="0.00"
                      value={newRcCost}
                      onChange={(e) => setNewRcCost(e.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 w-28">
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]">Charge (£/hr)</span>
                    <input
                      type="number"
                      step="0.01"
                      className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                      placeholder="0.00"
                      value={newRcCharge}
                      onChange={(e) => setNewRcCharge(e.target.value)}
                    />
                  </label>
                  <Button onClick={addRateCard} disabled={busy || !newRcName.trim()}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        {/* Working Days */}
        <Card>
          <CardHeader>
            <CardTitle>Working Days per Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1 w-32">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Days</span>
                <input
                  type="number"
                  min={20}
                  max={26}
                  step={1}
                  className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={workingDays}
                  onChange={(e) => setWorkingDays(Math.min(26, Math.max(20, Math.round(Number(e.target.value) || 22))))}
                />
              </label>
              <Button onClick={saveWorkingDays} disabled={busy || workingDays === workingDaysSaved}>
                Save
              </Button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              Used to calculate your required daily revenue. Typical range: 20–26.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminSettingsShell>
  );
}
