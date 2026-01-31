"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Asset {
  id: string;
  name: string;
  type: string | null;
  manufacturer: string | null;
  model: string | null;
  serial: string | null;
  installedAt: string | null;
  nextServiceAt: string | null;
}

export default function JobAssetsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "", manufacturer: "", model: "", serial: "" });
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/admin/maintenance/assets?jobId=${jobId}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setAssets(d.data); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [jobId]);

  async function create() {
    if (!form.name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/maintenance/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, jobId }),
    });
    if (res.ok) {
      setForm({ name: "", type: "", manufacturer: "", model: "", serial: "" });
      setShowForm(false);
      load();
    }
    setSaving(false);
  }

  async function deleteAsset(id: string) {
    if (!confirm("Delete this asset?")) return;
    await fetch(`/api/admin/maintenance/assets/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Installed Assets</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add Asset"}
        </button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 mb-6 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Type (e.g. boiler)" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Manufacturer" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="border rounded px-3 py-2 text-sm" />
            <input placeholder="Serial number" value={form.serial} onChange={(e) => setForm({ ...form, serial: e.target.value })} className="border rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={create} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
            Save Asset
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : assets.length === 0 ? (
        <p className="text-gray-500">No assets recorded for this job.</p>
      ) : (
        <div className="space-y-2">
          {assets.map((asset) => (
            <div key={asset.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{asset.name}</span>
                {asset.type && <span className="text-xs text-gray-500 ml-2">{asset.type}</span>}
                {asset.manufacturer && <span className="text-xs text-gray-400 ml-2">{asset.manufacturer}</span>}
                {asset.serial && <span className="text-xs text-gray-400 ml-2">S/N: {asset.serial}</span>}
                {asset.nextServiceAt && (
                  <span className="text-xs text-orange-600 ml-2">
                    Next service: {new Date(asset.nextServiceAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <button onClick={() => deleteAsset(asset.id)} className="text-xs text-red-500 hover:text-red-700">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
