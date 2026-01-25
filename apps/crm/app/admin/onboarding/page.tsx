"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminOnboarding() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/admin";
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/profile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data?.error || "Could not save profile"); return; }
      router.replace(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl mb-4">
            <span className="text-white font-bold text-2xl">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Welcome to Quantract</h1>
          <p className="text-[var(--muted-foreground)] mt-1">Let's finish setting up your profile</p>
        </div>

        <div className="bg-[var(--card)] rounded-2xl shadow-lg p-6 space-y-6 border border-[var(--border)]">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Create Your Profile</h2>
            <p className="text-sm text-[var(--muted-foreground)]">Enter your name to get started</p>
          </div>

          {err && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4">
              <p className="text-sm font-medium text-red-700">Error</p>
              <p className="text-xs text-red-600 mt-0.5">{err}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--muted-foreground)]">Your Name</label>
            <input
              type="text"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <button
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-medium hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            onClick={submit}
            disabled={loading || !name.trim()}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              "Continue →"
            )}
          </button>

          <p className="text-xs text-[var(--muted-foreground)] text-center">
            You'll be able to update this later in settings
          </p>
        </div>
      </div>
    </div>
  );
}
