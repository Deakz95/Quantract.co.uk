'use client';

import { useState } from "react";

export default function SignUpPage() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [name,setName]=useState("");
  const [error,setError]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);

  async function submit(e: React.FormEvent){
    e.preventDefault();
    setBusy(true); setError(null);

    const res = await fetch("/api/better-auth/sign-up/email",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ email, password, name })
    });
    const json = await res.json().catch(()=>null);
    if(!res.ok){
      setError(json?.error?.message || "Sign up failed");
      setBusy(false);
      return;
    }
    window.location.href="/admin/dashboard";
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white border rounded p-4 space-y-3">
        <h1 className="text-xl font-semibold">Create account</h1>
        <div className="space-y-1">
          <label className="text-sm">Name</label>
          <input className="w-full border rounded px-3 py-2" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input className="w-full border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button disabled={busy} className="w-full border rounded px-3 py-2 disabled:opacity-50">
          {busy ? "Creating…" : "Create account"}
        </button>
        <a className="text-sm underline" href="/auth/sign-in">Back to sign in</a>
      </form>
    </div>
  );
}
