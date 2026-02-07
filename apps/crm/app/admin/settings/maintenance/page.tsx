"use client";

import { useEffect, useState } from "react";
import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { Button } from "@/components/ui/button";
import { Plus, Settings, Trash2 } from "lucide-react";

interface Rule {
  id: string;
  name: string;
  isActive: boolean;
  assetType: string | null;
  intervalDays: number | null;
  action: any;
}

export default function MaintenanceSettingsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("");
  const [intervalDays, setIntervalDays] = useState("");
  const [saving, setSaving] = useState(false);

  function loadRules() {
    fetch("/api/admin/maintenance/rules")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setRules(d.data); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadRules(); }, []);

  async function createRule() {
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/maintenance/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        assetType: assetType.trim() || null,
        intervalDays: intervalDays ? Number(intervalDays) : null,
        action: { createAlert: true },
      }),
    });
    if (res.ok) {
      setName("");
      setAssetType("");
      setIntervalDays("");
      loadRules();
    }
    setSaving(false);
  }

  async function toggleRule(id: string, isActive: boolean) {
    await fetch(`/api/admin/maintenance/rules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    loadRules();
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this rule?")) return;
    await fetch(`/api/admin/maintenance/rules/${id}`, { method: "DELETE" });
    loadRules();
  }

  return (
    <AdminSettingsShell title="Maintenance Rules" subtitle="Configure automated maintenance schedules and alerts">
      <div className="space-y-4">
        {/* Create form */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
          <div className="text-sm font-semibold text-[var(--foreground)]">New Rule</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              placeholder="Rule name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
            <input
              placeholder="Asset type (optional)"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
            <div className="flex gap-2">
              <input
                placeholder="Interval (days)"
                type="number"
                value={intervalDays}
                onChange={(e) => setIntervalDays(e.target.value)}
                className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm flex-1 bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              />
              <Button size="sm" onClick={createRule} disabled={saving || !name.trim()}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Rules list */}
        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <Settings className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">No maintenance rules yet</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Create a rule above to automate maintenance alerts for your assets.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div key={rule.id} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm text-[var(--foreground)]">{rule.name}</span>
                  {rule.assetType && <span className="text-xs text-[var(--muted-foreground)] ml-2">Type: {rule.assetType}</span>}
                  {rule.intervalDays && <span className="text-xs text-[var(--muted-foreground)] ml-2">{rule.intervalDays}d interval</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => toggleRule(rule.id, rule.isActive)}
                    className={rule.isActive ? "text-green-700 dark:text-green-400" : "text-[var(--muted-foreground)]"}
                  >
                    {rule.isActive ? "Active" : "Inactive"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteRule(rule.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminSettingsShell>
  );
}
