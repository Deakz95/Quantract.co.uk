"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function EngineerOnboarding() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/engineer";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    county: "",
    postcode: "",
    country: "UK",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelationship: "",
  });

  function update(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || undefined,
          address1: form.address1,
          address2: form.address2 || undefined,
          city: form.city,
          county: form.county || undefined,
          postcode: form.postcode,
          country: form.country,
          emergencyName: form.emergencyName,
          emergencyPhone: form.emergencyPhone,
          emergencyRelationship: form.emergencyRelationship || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Could not save profile");
        return;
      }
      router.replace(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Complete your profile</h1>
          <p className="text-slate-600">Address and emergency contact are required.</p>
        </div>

        {err ? <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{err}</div> : null}

        <div className="grid grid-cols-1 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Full name" value={form.name} onChange={(e)=>update("name", e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Phone (optional)" value={form.phone} onChange={(e)=>update("phone", e.target.value)} />
        </div>

        <div className="pt-2">
          <h2 className="font-medium">Address</h2>
          <div className="grid grid-cols-1 gap-3 mt-2">
            <input className="border rounded px-3 py-2" placeholder="Address line 1" value={form.address1} onChange={(e)=>update("address1", e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="Address line 2 (optional)" value={form.address2} onChange={(e)=>update("address2", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" placeholder="City" value={form.city} onChange={(e)=>update("city", e.target.value)} />
              <input className="border rounded px-3 py-2" placeholder="County (optional)" value={form.county} onChange={(e)=>update("county", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" placeholder="Postcode" value={form.postcode} onChange={(e)=>update("postcode", e.target.value)} />
              <input className="border rounded px-3 py-2" placeholder="Country" value={form.country} onChange={(e)=>update("country", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <h2 className="font-medium">Emergency contact</h2>
          <div className="grid grid-cols-1 gap-3 mt-2">
            <input className="border rounded px-3 py-2" placeholder="Name" value={form.emergencyName} onChange={(e)=>update("emergencyName", e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="Phone" value={form.emergencyPhone} onChange={(e)=>update("emergencyPhone", e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="Relationship (optional)" value={form.emergencyRelationship} onChange={(e)=>update("emergencyRelationship", e.target.value)} />
          </div>
        </div>

        <button
          className="w-full rounded-xl bg-slate-900 text-white py-2 font-medium disabled:opacity-50"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
