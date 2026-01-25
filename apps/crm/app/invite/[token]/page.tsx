"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type InviteInfo = {
  role: "client" | "engineer" | string;
  email: string;
  name: string | null;
  expiresAtISO: string | null;
  company: { id: string; name: string; slug: string };
};

const FormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120, "Name is too long"),
    phone: z.string().trim().max(40, "Phone is too long").optional().or(z.literal("")),
    password: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (v) => {
      const p = v.password || "";
      const c = v.confirmPassword || "";
      if (!p && !c) return true;
      return p.length >= 6 && p === c;
    },
    { message: "Passwords must match and be at least 6 characters", path: ["confirmPassword"] }
  );

function roleLabel(role: string) {
  const r = String(role).toLowerCase();
  if (r === "client") return "Client";
  if (r === "engineer") return "Engineer";
  return r;
}

export default function InviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const sp = useSearchParams();
  const next = sp.get("next") || null;

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/public/invites/${encodeURIComponent(token)}`);
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Invite not found");
        const inv = j?.invite as InviteInfo;
        if (!cancelled) {
          setInvite(inv);
          setName(inv?.name || "");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Could not load invite");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const validation = useMemo(() => {
    return FormSchema.safeParse({ name, phone, password, confirmPassword });
  }, [name, phone, password, confirmPassword]);

  async function onAccept(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!token) return;
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || "Please check the form");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/public/invites/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          password: password ? password : null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || "Could not accept invite");
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const postAcceptHref = useMemo(() => {
    if (!invite) return "/";
    const r = String(invite.role).toLowerCase();
    if (r === "client") return `/client/login?next=${encodeURIComponent(next || "/client")}`;
    if (r === "engineer") return `/engineer/login?next=${encodeURIComponent(next || "/engineer")}`;
    return "/";
  }, [invite, next]);

  return (
    <div className="min-h-screen bg-[var(--muted)] flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{done ? "Invite accepted" : "You're invited"}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <div className="animate-pulse">
                <div className="h-4 bg-[var(--muted)] rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-[var(--muted)] rounded w-1/2"></div>
              </div>
              <div className="text-sm text-[var(--muted-foreground)]">Loading your invitation...</div>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="rounded-md bg-rose-50 border border-rose-200 p-4">
                <div className="font-semibold text-rose-900 mb-2">Unable to Load Invitation</div>
                <div className="text-sm text-rose-800">{error}</div>
              </div>
              {error.includes("expired") || error.includes("Expired") ? (
                <div className="text-sm text-[var(--muted-foreground)]">
                  This invitation link has expired. Please contact your administrator to request a new invitation.
                </div>
              ) : error.includes("used") || error.includes("Already used") ? (
                <div className="text-sm text-[var(--muted-foreground)]">
                  This invitation has already been accepted. You can <Link href="/client/login" className="underline text-blue-600">sign in here</Link>.
                </div>
              ) : (
                <div className="text-sm text-[var(--muted-foreground)]">
                  If you continue to experience issues, please contact support or request a new invitation link.
                </div>
              )}
            </div>
          ) : !invite ? (
            <div className="space-y-4">
              <div className="rounded-md bg-amber-50 border border-amber-200 p-4">
                <div className="font-semibold text-amber-900 mb-2">Invitation Not Found</div>
                <div className="text-sm text-amber-800">
                  This invitation link is invalid or has been removed.
                </div>
              </div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Please contact your administrator to request a new invitation.
              </div>
            </div>
          ) : done ? (
            <div className="space-y-4">
              <div className="rounded-md bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
                Account setup complete for <strong>{invite.email}</strong> ({roleLabel(invite.role)} at <strong>{invite.company.name}</strong>).
              </div>
              <div className="text-sm text-[var(--muted-foreground)]">
                Next step: sign in to your portal.
              </div>
              <div className="flex flex-col gap-2">
                <Link href={postAcceptHref}>
                  <Button className="w-full">Continue to sign in</Button>
                </Link>
                <Link className="text-sm underline text-[var(--muted-foreground)] text-center" href="/support">
                  Need help?
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-[var(--background)] p-3 text-sm text-[var(--muted-foreground)]">
                <div>
                  <span className="text-[var(--muted-foreground)]">Company:</span> <strong>{invite.company.name}</strong>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)]">Role:</span> <strong>{roleLabel(invite.role)}</strong>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)]">Email:</span> <strong>{invite.email}</strong>
                </div>
                {invite.expiresAtISO ? (
                  <div>
                    <span className="text-[var(--muted-foreground)]">Expires:</span> {new Date(invite.expiresAtISO).toLocaleString()}
                  </div>
                ) : null}
              </div>

              <form onSubmit={onAccept} className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Your name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                    placeholder="Jane Doe"
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Phone (optional)</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                    placeholder="+44 …"
                    autoComplete="tel"
                  />
                </div>

                <div className="rounded-md bg-[var(--muted)] border border-[var(--border)] p-3">
                  <div className="text-sm font-medium text-[var(--foreground)]">Set a password (optional)</div>
                  <div className="text-xs text-[var(--muted-foreground)]">You can also sign in via magic link later.</div>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-[var(--muted-foreground)]">Password</label>
                      <input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="mt-1 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                        placeholder="••••••••"
                        type="password"
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-[var(--muted-foreground)]">Confirm</label>
                      <input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="mt-1 w-full rounded-md border border-[var(--border)] px-3 py-2 text-sm"
                        placeholder="••••••••"
                        type="password"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                </div>

                {validation.success ? null : (
                  <div className="text-sm text-rose-700">{validation.error.issues[0]?.message}</div>
                )}

                <Button type="submit" className="w-full" disabled={busy || !validation.success}>
                  {busy ? "Accepting…" : "Accept invite"}
                </Button>

                <div className="text-sm text-[var(--muted-foreground)] flex justify-between">
                  <Link className="underline" href="/">
                    Back
                  </Link>
                  <Link className="underline" href="/support">
                    Support
                  </Link>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
