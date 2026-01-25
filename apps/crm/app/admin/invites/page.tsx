"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Plus, Users, Clock } from "lucide-react";

type Invite = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  token: string;
  usedAt?: string | null;
  createdAt: string;
};

export default function InvitesPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"client" | "engineer">("client");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadInvites = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/invites", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `Failed: ${res.status}`);
      setInvites(Array.isArray(data.invites) ? data.invites : []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load invites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const createInvite = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) {
      setMessage({ type: "error", text: "Enter a valid email address" });
      return;
    }

    setCreating(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role, email: e, name: name.trim() || undefined, expiresDays: 14 }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to create invite");

      const link = `${window.location.origin}${data.links.register}`;
      await navigator.clipboard.writeText(link).catch(() => {});

      setMessage({ type: "success", text: "Invite created! Link copied to clipboard." });
      setEmail("");
      setName("");
      setShowForm(false);
      await loadInvites();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to create invite" });
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (invite: Invite) => {
    const link = invite.role === "client"
      ? `${window.location.origin}/client/register?token=${invite.token}`
      : `${window.location.origin}/engineer/register?token=${invite.token}`;
    
    await navigator.clipboard.writeText(link).catch(() => {});
    setMessage({ type: "success", text: "Link copied to clipboard!" });
  };

  const revokeInvite = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/invites/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to revoke invite");
      setMessage({ type: "success", text: "Invite revoked" });
      await loadInvites();
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Failed to revoke invite" });
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "success" | "warning" | "secondary"> = {
      admin: "success",
      engineer: "warning",
      client: "secondary",
    };
    return <Badge variant={variants[role?.toLowerCase()] || "secondary"}>{role || 'User'}</Badge>;
  };

  const formatDate = (date: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <AppShell role="admin" title="Invites" subtitle="Manage pending invitations">
      <div className="space-y-6">
        {/* Message toast */}
        {message && (
          <div className={`p-4 rounded-xl ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message.text}
          </div>
        )}

        {/* Header Actions */}
        <div className="flex justify-end">
          <Button variant="gradient" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Send Invite
          </Button>
        </div>

        {/* Invite Form Modal */}
        {showForm && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Create New Invite</h3>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Role</label>
                  <select
                    className="mt-1 w-full h-10 rounded-xl border border-[var(--border)] px-3 text-sm"
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                  >
                    <option value="client">Client</option>
                    <option value="engineer">Engineer</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Name (optional)</label>
                  <input
                    className="mt-1 w-full h-10 rounded-xl border border-[var(--border)] px-3 text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Smith"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Email *</label>
                  <input
                    className="mt-1 w-full h-10 rounded-xl border border-[var(--border)] px-3 text-sm"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    type="email"
                  />
                </div>
                
                <div className="text-xs text-[var(--muted-foreground)]">
                  Creates a 14-day invite link. The link will be copied to your clipboard.
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button onClick={createInvite} disabled={creating}>
                    {creating ? "Creating..." : "Create Invite"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invites List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-[var(--muted-foreground)]">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                Loading invites...
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <div className="text-[var(--error)] mb-4">{error}</div>
                <Button variant="secondary" onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            ) : invites.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No pending invites</h3>
                <p className="text-[var(--muted-foreground)] mb-4">Invite team members to join your workspace</p>
                <Button variant="gradient" onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {invites.map((invite) => (
                  <div key={invite.id} className="p-4 flex items-center justify-between hover:bg-[var(--muted)] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{invite.email}</p>
                        {invite.name && <p className="text-xs text-[var(--muted-foreground)]">{invite.name}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {getRoleBadge(invite.role)}
                          <Badge variant={invite.usedAt ? "success" : "secondary"}>
                            {invite.usedAt ? "Used" : "Pending"}
                          </Badge>
                          <span className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Sent {formatDate(invite.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => copyLink(invite)}>
                        Copy Link
                      </Button>
                      {!invite.usedAt && (
                        <Button variant="ghost" size="sm" className="text-[var(--error)]" onClick={() => revokeInvite(invite.id)}>
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
