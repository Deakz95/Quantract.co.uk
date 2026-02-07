"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/Dialog";
import { Users, Shield, RefreshCw, Settings, AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StaffMember = {
  id: string;
  companyUserId: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  capabilities: string[];
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROLE_DEFS = [
  { key: "admin", label: "Admin", description: "Full access to all features", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
  { key: "office", label: "Office Staff", description: "Back-office: planner, expenses, suppliers", color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
  { key: "engineer", label: "Engineer", description: "Field access via engineer portal", color: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400" },
  { key: "client", label: "Client", description: "Client portal access", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
] as const;

const ACCOUNTS_DEF = {
  key: "accounts",
  label: "Accounts",
  description: "Finance and billing permissions",
  color: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400",
};

/**
 * Derive which primary-role checkboxes should be checked from a stored role.
 * The stored role is the highest-priority role. We only check that one.
 * Exception: "finance" (legacy) maps to accounts-only.
 */
function roleToChecked(role: string): string[] {
  const r = role.toLowerCase();
  if (r === "finance") return []; // legacy finance → accounts-only
  if (["admin", "office", "engineer", "client"].includes(r)) return [r];
  return [];
}

function hasAccountsAccess(member: StaffMember): boolean {
  return (
    member.capabilities.includes("accounts.access") ||
    member.role.toLowerCase() === "finance"
  );
}

/**
 * Resolve display role by priority (for badge ordering).
 */
function resolvePrimaryRole(roles: string[]): string {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("office")) return "office";
  if (roles.includes("engineer")) return "engineer";
  if (roles.includes("client")) return "client";
  return "client";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StaffPage() {
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [adminCount, setAdminCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [checkedRoles, setCheckedRoles] = useState<string[]>([]);
  const [accountsChecked, setAccountsChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ---- Fetch ----
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/staff");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load staff");
      }
      const data = await res.json();
      setMembers(data.members ?? []);
      setAdminCount(data.adminCount ?? 0);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Open dialog ----
  function openEditor(member: StaffMember) {
    setEditMember(member);
    setCheckedRoles(roleToChecked(member.role));
    setAccountsChecked(hasAccountsAccess(member));
    setSaveError(null);
  }

  function closeEditor() {
    setEditMember(null);
    setCheckedRoles([]);
    setAccountsChecked(false);
    setSaveError(null);
  }

  // ---- Toggle handlers ----
  function toggleRole(key: string) {
    setCheckedRoles((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]
    );
  }

  // ---- Derived validation ----
  const resolved = useMemo(() => resolvePrimaryRole(checkedRoles), [checkedRoles]);

  const isAccountsOnly = checkedRoles.length === 0 && accountsChecked;
  const nothingSelected = checkedRoles.length === 0 && !accountsChecked;

  // Accounts disallowed with engineer
  const accountsDisabled = resolved === "engineer" && checkedRoles.length > 0;

  // Auto-uncheck accounts if engineer becomes the resolved role
  useEffect(() => {
    if (accountsDisabled && accountsChecked) {
      setAccountsChecked(false);
    }
  }, [accountsDisabled, accountsChecked]);

  // Last-admin guard (client-side hint)
  const isLastAdmin =
    editMember?.role === "admin" && adminCount <= 1;
  const removingLastAdmin = isLastAdmin && !checkedRoles.includes("admin");

  const canSave = !nothingSelected && !removingLastAdmin;

  // ---- Save ----
  async function handleSave() {
    if (!editMember || !canSave) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: editMember.id,
          roles: checkedRoles,
          accounts: accountsChecked,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update roles");
      closeEditor();
      await fetchData();
    } catch (err: any) {
      setSaveError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  // ---- Role badges ----
  function renderBadges(member: StaffMember) {
    const badges: { label: string; color: string }[] = [];
    const r = member.role.toLowerCase();

    if (r === "finance") {
      // Legacy finance → show as "Accounts"
      badges.push({ label: ACCOUNTS_DEF.label, color: ACCOUNTS_DEF.color });
    } else {
      const def = ROLE_DEFS.find((d) => d.key === r);
      if (def) badges.push({ label: def.label, color: def.color });

      if (hasAccountsAccess(member) && r !== "finance") {
        badges.push({ label: ACCOUNTS_DEF.label, color: ACCOUNTS_DEF.color });
      }
    }

    if (badges.length === 0) {
      badges.push({ label: r, color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" });
    }

    return (
      <div className="flex flex-wrap gap-1">
        {badges.map((b) => (
          <span
            key={b.label}
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${b.color}`}
          >
            {b.label}
          </span>
        ))}
      </div>
    );
  }

  return (
    <AppShell role="admin" title="Staff" subtitle="Manage team roles and access">
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Shield className="h-4 w-4" />
            <span>
              {members.length} member{members.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
          </div>
        )}

        {/* Table */}
        {!loading && members.length > 0 && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                      <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Roles</th>
                      <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">Status</th>
                      <th className="px-4 py-3 text-right font-medium text-[var(--muted-foreground)]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr
                        key={m.companyUserId}
                        className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
                            {m.name || "Unnamed"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">{m.email}</td>
                        <td className="px-4 py-3">{renderBadges(m)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={m.isActive ? "success" : "secondary"}>
                            {m.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEditor(m)}>
                            <Settings className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!loading && members.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
            <Users className="mb-3 h-10 w-10" />
            <p className="text-sm">No staff members found.</p>
          </div>
        )}
      </div>

      {/* ---- Edit Roles & Access Dialog ---- */}
      <Dialog open={!!editMember} onOpenChange={(v) => !v && closeEditor()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roles & Access</DialogTitle>
            <DialogDescription>
              {editMember?.name || editMember?.email || "Staff member"}
              {editMember?.name ? ` (${editMember.email})` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-5">
              {/* Primary Roles */}
              <div>
                <div className="text-sm font-medium text-[var(--foreground)] mb-2">Primary Roles</div>
                <div className="space-y-2">
                  {ROLE_DEFS.map((def) => (
                    <label
                      key={def.key}
                      className="flex items-start gap-3 rounded-lg border border-[var(--border)] p-3 cursor-pointer hover:bg-[var(--muted)]/50 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checkedRoles.includes(def.key)}
                        onChange={() => toggleRole(def.key)}
                        className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                      />
                      <div>
                        <div className="text-sm font-medium text-[var(--foreground)]">{def.label}</div>
                        <div className="text-xs text-[var(--muted-foreground)]">{def.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Access */}
              <div>
                <div className="text-sm font-medium text-[var(--foreground)] mb-2">Additional Access</div>
                <label
                  className={`flex items-start gap-3 rounded-lg border border-[var(--border)] p-3 transition-colors ${
                    accountsDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:bg-[var(--muted)]/50"
                  }`}
                  title={accountsDisabled ? "Accounts cannot be combined with Engineer role" : undefined}
                >
                  <input
                    type="checkbox"
                    checked={accountsChecked}
                    onChange={(e) => setAccountsChecked(e.target.checked)}
                    disabled={accountsDisabled}
                    className="mt-0.5 h-4 w-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  <div>
                    <div className="text-sm font-medium text-[var(--foreground)]">{ACCOUNTS_DEF.label}</div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {accountsDisabled
                        ? "Cannot be combined with Engineer role"
                        : ACCOUNTS_DEF.description}
                    </div>
                  </div>
                </label>
                {isAccountsOnly && (
                  <div className="mt-2 text-xs text-[var(--muted-foreground)] bg-[var(--muted)] rounded-md px-3 py-2">
                    External accountant: accounts-only access with no primary portal role.
                  </div>
                )}
              </div>

              {/* Warnings */}
              {nothingSelected && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  At least one role or Accounts must be selected.
                </div>
              )}
              {removingLastAdmin && (
                <div className="flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  Cannot remove Admin — this is the only admin in the company.
                </div>
              )}
              {saveError && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  {saveError}
                </div>
              )}
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={closeEditor} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!canSave || saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
