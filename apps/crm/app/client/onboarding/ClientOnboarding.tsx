"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ClientOnboarding() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/client";

  const [loading, setLoading] = useState(false);
  const [billingSame, setBillingSame] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    serviceAddress1: "",
    serviceAddress2: "",
    serviceCity: "",
    serviceCounty: "",
    servicePostcode: "",
    serviceCountry: "UK",
    billingAddress1: "",
    billingAddress2: "",
    billingCity: "",
    billingCounty: "",
    billingPostcode: "",
    billingCountry: "UK",
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
          serviceAddress1: form.serviceAddress1,
          serviceAddress2: form.serviceAddress2 || undefined,
          serviceCity: form.serviceCity,
          serviceCounty: form.serviceCounty || undefined,
          servicePostcode: form.servicePostcode,
          serviceCountry: form.serviceCountry,
          billingSameAsService: billingSame,
          billingAddress1: billingSame ? undefined : form.billingAddress1,
          billingAddress2: billingSame ? undefined : form.billingAddress2,
          billingCity: billingSame ? undefined : form.billingCity,
          billingCounty: billingSame ? undefined : form.billingCounty,
          billingPostcode: billingSame ? undefined : form.billingPostcode,
          billingCountry: billingSame ? undefined : form.billingCountry,
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--muted)]">
      <div className="w-full max-w-xl bg-[var(--background)] rounded-2xl shadow p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Complete your profile</h1>
          <p className="text-[var(--muted-foreground)]">Add your details to continue.</p>
        </div>

        {err ? <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{err}</div> : null}

        <div className="grid grid-cols-1 gap-3">
          <input className="border rounded px-3 py-2" placeholder="Full name" value={form.name} onChange={(e)=>update("name", e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Phone (optional)" value={form.phone} onChange={(e)=>update("phone", e.target.value)} />
        </div>

        <div className="pt-2">
          <h2 className="font-medium">Service address</h2>
          <div className="grid grid-cols-1 gap-3 mt-2">
            <input className="border rounded px-3 py-2" placeholder="Address line 1" value={form.serviceAddress1} onChange={(e)=>update("serviceAddress1", e.target.value)} />
            <input className="border rounded px-3 py-2" placeholder="Address line 2 (optional)" value={form.serviceAddress2} onChange={(e)=>update("serviceAddress2", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" placeholder="City" value={form.serviceCity} onChange={(e)=>update("serviceCity", e.target.value)} />
              <input className="border rounded px-3 py-2" placeholder="County (optional)" value={form.serviceCounty} onChange={(e)=>update("serviceCounty", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="border rounded px-3 py-2" placeholder="Postcode" value={form.servicePostcode} onChange={(e)=>update("servicePostcode", e.target.value)} />
              <input className="border rounded px-3 py-2" placeholder="Country" value={form.serviceCountry} onChange={(e)=>update("serviceCountry", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={billingSame} onChange={(e)=>setBillingSame(e.target.checked)} />
            Billing address is the same as service address
          </label>
        </div>

        {!billingSame ? (
          <div className="pt-1">
            <h2 className="font-medium">Billing address</h2>
            <div className="grid grid-cols-1 gap-3 mt-2">
              <input className="border rounded px-3 py-2" placeholder="Address line 1" value={form.billingAddress1} onChange={(e)=>update("billingAddress1", e.target.value)} />
              <input className="border rounded px-3 py-2" placeholder="Address line 2 (optional)" value={form.billingAddress2} onChange={(e)=>update("billingAddress2", e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <input className="border rounded px-3 py-2" placeholder="City" value={form.billingCity} onChange={(e)=>update("billingCity", e.target.value)} />
                <input className="border rounded px-3 py-2" placeholder="County (optional)" value={form.billingCounty} onChange={(e)=>update("billingCounty", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input className="border rounded px-3 py-2" placeholder="Postcode" value={form.billingPostcode} onChange={(e)=>update("billingPostcode", e.target.value)} />
                <input className="border rounded px-3 py-2" placeholder="Country" value={form.billingCountry} onChange={(e)=>update("billingCountry", e.target.value)} />
              </div>
            </div>
          </div>
        ) : null}

        <button
          className="w-full rounded-xl bg-[var(--background)] text-white py-2 font-medium disabled:opacity-50"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}
