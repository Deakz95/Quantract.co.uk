'use client';
import { ImpersonateUserButton } from '@/components/admin/ImpersonateUserButton';

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Check, Mail } from "lucide-react";

const CAPABILITIES = [
  { key: "billing.view", label: "View billing", description: "See billing and subscription info" },
  { key: "billing.manage", label: "Manage billing", description: "Update payment methods, change plans" },
  { key: "invoices.view", label: "View invoices", description: "See all invoices and payment status" },
  { key: "invoices.manage", label: "Manage invoices", description: "Send, remind, payment links" },
  { key: "planner.manage", label: "Manage planner", description: "Schedule changes and assignments" },
  { key: "expenses.manage", label: "Manage expenses", description: "Receipts and OCR processing" },
  { key: "suppliers.manage", label: "Manage suppliers", description: "Add, edit supplier details" },
  { key: "settings.manage", label: "Manage settings", description: "Company settings and branding" },
  { key: "users.manage", label: "Manage users", description: "User permissions and access" },
];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refreshUsers() {
    const res = await fetch("/api/admin/users");
    const json = await res.json();
    setUsers(json.data || []);
    setLoading(false);
  }

  useEffect(() => { refreshUsers(); }, []);

  async function selectUser(u: any) {
    setSelected(u);
    const res = await fetch(`/api/admin/users/${u.id}/permissions`);
    const json = await res.json();
    const keys = (json.data || []).filter((p: any) => p.enabled).map((p: any) => p.key);
    setEnabled(new Set(keys));
  }

  function toggle(key: string) {
    setEnabled(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/users/${selected.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: Array.from(enabled) })
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role="admin" title="Users" subtitle="Manage team members and permissions">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--primary)]" />
              <CardTitle>Team Members</CardTitle>
            </div>
            <ImpersonateUserButton users={users} />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-4 text-center text-[var(--muted-foreground)]">
                <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Loading...
              </div>
            ) : users.length === 0 ? (
              <div className="text-center p-4 text-[var(--muted-foreground)]">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No team members found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => selectUser(u)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selected?.id === u.id 
                        ? "border-[var(--primary)] bg-[var(--primary)]/5" 
                        : "border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--muted)]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-semibold text-sm">
                        {(u.name || u.email)?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[var(--foreground)] truncate">{u.name || 'No name'}</p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--primary)]" />
              <div>
                <CardTitle>Permissions</CardTitle>
                <CardDescription>Select a user to manage their access</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <div className="text-center p-8 text-[var(--muted-foreground)]">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a user from the list to edit their permissions</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selected User Info */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--muted)]">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-bold">
                    {(selected.name || selected.email)?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--foreground)]">{selected.name || 'No name'}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{selected.email}</p>
                  </div>
                </div>

                {/* Capabilities Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {CAPABILITIES.map(c => (
                    <label 
                      key={c.key} 
                      className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                        enabled.has(c.key) 
                          ? "border-[var(--primary)] bg-[var(--primary)]/5" 
                          : "border-[var(--border)] hover:border-[var(--primary)]"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        enabled.has(c.key) 
                          ? "bg-[var(--primary)] border-[var(--primary)]" 
                          : "border-[var(--border)]"
                      }`}>
                        {enabled.has(c.key) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <input type="checkbox" className="hidden" checked={enabled.has(c.key)} onChange={() => toggle(c.key)} />
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{c.label}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{c.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Capabilities add to role defaults. Changes are enforced on protected endpoints.
                  </p>
                  <Button variant="gradient" onClick={save} disabled={busy}>
                    {busy ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Save Permissions
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}


