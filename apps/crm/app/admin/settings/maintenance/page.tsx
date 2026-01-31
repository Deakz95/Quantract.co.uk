"use client";

import { useEffect, useState } from "react";

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
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-6">Maintenance Rules</h1>

      <div className="border rounded-lg p-4 mb-6 bg-gray-50">
        <h2 className="text-sm font-semibold mb-3">New Rule</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            placeholder="Rule name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
          <input
            placeholder="Asset type (optional)"
            value={assetType}
            onChange={(e) => setAssetType(e.target.value)}
            className="border rounded px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <input
              placeholder="Interval (days)"
              type="number"
              value={intervalDays}
              onChange={(e) => setIntervalDays(e.target.value)}
              className="border rounded px-3 py-2 text-sm flex-1"
            />
            <button
              onClick={createRule}
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : rules.length === 0 ? (
        <p className="text-gray-500">No rules yet. Create one above.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{rule.name}</span>
                {rule.assetType && <span className="text-xs text-gray-500 ml-2">Type: {rule.assetType}</span>}
                {rule.intervalDays && <span className="text-xs text-gray-500 ml-2">{rule.intervalDays}d interval</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleRule(rule.id, rule.isActive)}
                  className={`px-2 py-1 text-xs rounded ${rule.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-500"}`}
                >
                  {rule.isActive ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
