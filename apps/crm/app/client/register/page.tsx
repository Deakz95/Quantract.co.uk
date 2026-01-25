"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ClientRegisterPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/invites/${token}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Invalid invite link");
        if (data.invite.role !== "client") throw new Error("This link is not for a client account.");
        setEmail(data.invite.email);
        setName(data.invite.name || "");
      } catch (e: any) {
        setError(e?.message || "Invalid invite");
      } finally {
        setLoading(false);
      }
    };
    if (token) load();
    else {
      setLoading(false);
      setError("Missing token");
    }
  }, [token]);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    
    try {
      // Step 1: Accept the invite and create account
      const res = await fetch(`/api/public/invites/${token}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, password: password || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to register");
      
      // Step 2: Auto-login using magic link (passwordless)
      const loginRes = await fetch("/api/auth/magic-link/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role: "client" }),
      });
      
      if (loginRes.ok) {
        // Success! Redirect to login page with success message
        router.push("/client/login?registered=true&email=" + encodeURIComponent(email));
      } else {
        // Login API failed, but registration succeeded - still redirect to login
        router.push("/client/login?message=Registration%20complete!%20Please%20log%20in.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to register");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Client registration</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <div className="grid gap-3">
              <div className="text-xs text-[var(--muted-foreground)]">Email</div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm">{email}</div>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Full name</span>
                <input 
                  className="h-9 rounded-md border border-[var(--border)] px-3 text-sm" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)}
                  disabled={submitting}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Phone (optional)</span>
                <input 
                  className="h-9 rounded-md border border-[var(--border)] px-3 text-sm" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />
              </label>

              <Button type="button" onClick={submit} disabled={submitting}>
                {submitting ? "Registering..." : "Complete registration"}
              </Button>
              <div className="text-xs text-[var(--muted-foreground)]">
                After registering, we'll send you a magic link to log in - no password needed!
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
