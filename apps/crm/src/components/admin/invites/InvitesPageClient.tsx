"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/useToast";

type Invite = {
  id: string;
  role: "client" | "engineer";
  email: string;
  name?: string | null;
  token: string;
  expiresAt?: string | null;
  usedAt?: string | null;
  createdAt: string;
};

export default function InvitesPageClient() {
  const { toast } = useToast();
  const loadedRef = useRef(false);
  
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"client" | "engineer">("client");

  // Remove toast from dependencies to prevent infinite loop
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/invites", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to load invites");
      setInvites(data.invites || []);
    } catch (e: any) {
      console.error("Failed to load invites:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load only once on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  const createInvite = useCallback(async () => {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, email: e, name: name.trim() || undefined, expiresDays: 14 }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to create invite");

      const link = `${window.location.origin}${data.links.register}`;
      await navigator.clipboard.writeText(link).catch(() => {});

      toast({
        title: "Invite created",
        description: "Link copied to clipboard.",
        variant: "success",
      });

      setEmail("");
      setName("");
      await load();
    } catch (err: any) {
      toast({
        title: "Failed to create invite",
        description: err?.message || "Failed to create invite",
        variant: "destructive",
      });
    }
  }, [email, name, role, load, toast]);

  const revoke = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/admin/invites/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to revoke invite");

        toast({
          title: "Invite revoked",
          variant: "success",
        });

        await load();
      } catch (err: any) {
        toast({
          title: "Failed to revoke invite",
          description: err?.message || "Failed to revoke invite",
          variant: "destructive",
        });
      }
    },
    [load, toast]
  );

  const rows = useMemo(() => invites, [invites]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Invites</CardTitle>
        <Button type="button" variant="secondary" onClick={load}>
          Refresh
        </Button>
      </CardHeader>

      <CardContent>
        <div className="grid gap-3 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 md:grid-cols-4">
          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-[var(--muted-foreground)]">Role</label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="client">Client</option>
              <option value="engineer">Engineer</option>
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-[var(--muted-foreground)]">Name (optional)</label>
            <input
              className="mt-1 h-9 w-full rounded-md border border-[var(--border)] px-3 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Smith"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-[var(--muted-foreground)]">Email</label>
            <div className="mt-1 flex gap-2">
              <input
                className="h-9 flex-1 rounded-md border border-[var(--border)] px-3 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
              <Button type="button" onClick={createInvite}>
                Create invite
              </Button>
            </div>
            <div className="mt-2 text-xs text-[var(--muted-foreground)]">Creates a 14-day link and copies it to your clipboard.</div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--muted-foreground)]">
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Status</th>
                <th className="py-2">Created</th>
                <th className="py-2"></th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="py-6 text-[var(--muted-foreground)]" colSpan={5}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="py-6 text-[var(--muted-foreground)]" colSpan={5}>
                    No invites yet.
                  </td>
                </tr>
              ) : (
                rows.map((i) => (
                  <tr key={i.id} className="border-t border-[var(--border)]">
                    <td className="py-3">
                      <div className="font-semibold text-[var(--foreground)]">{i.email}</div>
                      {i.name ? <div className="text-xs text-[var(--muted-foreground)]">{i.name}</div> : null}
                    </td>

                    <td className="py-3">
                      <Badge>{i.role}</Badge>
                    </td>

                    <td className="py-3">
                      <Badge>{i.usedAt ? "Used" : "Active"}</Badge>
                    </td>

                    <td className="py-3 text-xs text-[var(--muted-foreground)]">{new Date(i.createdAt).toLocaleDateString("en-GB")}</td>

                    <td className="py-3 text-right space-x-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const link =
                            i.role === "client"
                              ? `${window.location.origin}/client/register?token=${i.token}`
                              : `${window.location.origin}/engineer/register?token=${i.token}`;

                          navigator.clipboard.writeText(link).catch(() => {});
                          toast({ title: "Link copied", variant: "success" });
                        }}
                      >
                        Copy link
                      </Button>

                      {!i.usedAt ? (
                        <Button type="button" variant="secondary" onClick={() => void revoke(i.id)}>
                          Revoke
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
