"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { getApiErrorMessage } from "@/lib/apiClient";

type MeResponse = {
  ok: boolean;
  user?: { email: string; role: string; hasPassword: boolean };
  error?: string;
};

export function PasswordChangeCard() {
  const { toast } = useToast();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [current, setCurrent] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/me");
        const json = (await res.json()) as MeResponse;
        if (alive) setMe(json);
      } catch {
        if (alive) setMe({ ok: false, error: "load_failed" });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const needsCurrent = Boolean(me?.ok && me.user?.hasPassword);

  const canSave = useMemo(() => {
    if (!next1 || next1.length < 8) return false;
    if (next1 !== next2) return false;
    if (needsCurrent && current.length < 6) return false;
    return true;
  }, [next1, next2, needsCurrent, current]);

  async function onSave() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: needsCurrent ? current : undefined,
          newPassword: next1,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "save_failed");

      toast({
        title: needsCurrent ? "Password updated" : "Password set",
        variant: "success",
      });

      setCurrent("");
      setNext1("");
      setNext2("");

      // refresh hasPassword
      const m = await fetch("/api/auth/me");
      setMe((await m.json()) as MeResponse);
    } catch (e: any) {
      toast({
        title: "Password update failed",
        description: getApiErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account security</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
        ) : !me?.ok ? (
          <div className="text-sm text-red-600">Unable to load account details.</div>
        ) : (
          <>
            <div className="text-sm text-[var(--muted-foreground)]">
              Signed in as <span className="font-medium text-[var(--foreground)]">{me.user?.email}</span> ({me.user?.role})
            </div>

            {needsCurrent && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Current password</label>
                <input
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  type="password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  {needsCurrent ? "New password" : "Set a password"}
                </label>
                <input
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  type="password"
                  value={next1}
                  onChange={(e) => setNext1(e.target.value)}
                  autoComplete="new-password"
                />
                <div className="text-xs text-[var(--muted-foreground)]">Minimum 8 characters.</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">Confirm password</label>
                <input
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]"
                  type="password"
                  value={next2}
                  onChange={(e) => setNext2(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={onSave} disabled={!canSave || saving}>
                {saving ? "Saving…" : needsCurrent ? "Update password" : "Set password"}
              </Button>

              {next1 && next2 && next1 !== next2 && (
                <div className="text-xs text-red-600">Passwords do not match.</div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
