"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminRegisterPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
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
        if (data.invite.role !== "admin" && data.invite.role !== "office") {
          throw new Error("This link is not for an admin or office account.");
        }
        setEmail(data.invite.email);
        setInviteRole(data.invite.role);
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
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/public/invites/${token}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, phone, password }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to register");

      router.push("/admin/login?registered=true&email=" + encodeURIComponent(email));
    } catch (e: any) {
      setError(e?.message || "Failed to register");
      setSubmitting(false);
    }
  };

  const roleLabel = inviteRole === "office" ? "Office Staff" : "Admin";

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>{roleLabel} Registration</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-[var(--muted-foreground)]">Loading...</div>
          ) : error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : (
            <div className="grid gap-3">
              <div className="text-xs text-[var(--muted-foreground)]">Email</div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm">{email}</div>

              <div className="text-xs text-[var(--muted-foreground)]">Role</div>
              <div className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-3 py-2 text-sm">{roleLabel}</div>

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

              <label className="grid gap-1">
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">Password *</span>
                <input
                  type="password"
                  className="h-9 rounded-md border border-[var(--border)] px-3 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  placeholder="Min 8 characters"
                />
              </label>

              <Button type="button" onClick={submit} disabled={submitting}>
                {submitting ? "Registering..." : "Complete registration"}
              </Button>
              <div className="text-xs text-[var(--muted-foreground)]">
                After registering you can log in with your email and password.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
