"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { cn } from "@/lib/cn";
import { Users, Shield, Check, X, RefreshCw, Save } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CompanyUserRow = {
  id: string;
  companyUserId: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
};

type PermissionsMap = Record<string, string[]>;

// ---------------------------------------------------------------------------
// Capabilities & role presets (mirrors @/lib/permissions.ts)
// ---------------------------------------------------------------------------

const ALL_CAPABILITIES = [
  "billing.view",
  "billing.manage",
  "invoices.view",
  "invoices.manage",
  "planner.manage",
  "expenses.manage",
  "suppliers.manage",
  "settings.manage",
  "users.manage",
  "leads.scoring",
  "maintenance.manage",
  "maintenance.view",
] as const;

type Capability = (typeof ALL_CAPABILITIES)[number];

const CAPABILITY_LABELS: Record<Capability, string> = {
  "billing.view": "View billing",
  "billing.manage": "Manage billing",
  "invoices.view": "View invoices",
  "invoices.manage": "Manage invoices",
  "planner.manage": "Manage planner",
  "expenses.manage": "Manage expenses",
  "suppliers.manage": "Manage suppliers",
  "settings.manage": "Manage settings",
  "users.manage": "Manage users",
  "leads.scoring": "Lead scoring",
  "maintenance.manage": "Manage maintenance",
  "maintenance.view": "View maintenance",
};

const ROLE_PRESETS: Record<string, Capability[]> = {
  ADMIN: [...ALL_CAPABILITIES],
  OFFICE: [
    "invoices.view",
    "planner.manage",
    "expenses.manage",
    "suppliers.manage",
    "maintenance.view",
  ],
  FINANCE: [
    "invoices.view",
    "invoices.manage",
    "expenses.manage",
    "billing.view",
  ],
  ENGINEER: [],
  CLIENT: [],
};

const VALID_ROLES = ["admin", "office", "finance", "engineer", "client"] as const;

// ---------------------------------------------------------------------------
// Helper: check if user has a capability (role default OR explicit override)
// ---------------------------------------------------------------------------

function userHasCapability(
  role: string,
  overrides: string[],
  cap: Capability,
): boolean {
  if (overrides.includes(cap)) return true;
  const roleKey = role.toUpperCase();
  return (ROLE_PRESETS[roleKey] || []).includes(cap);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RolesPage() {
  const [users, setUsers] = useState<CompanyUserRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [togglingCap, setTogglingCap] = useState<string | null>(null);

  // ---- Fetch data ----
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load roles");
      }
      const data = await res.json();
      setUsers(data.users ?? []);
      setPermissions(data.permissions ?? {});
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Change role ----
  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingRole(userId);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update role");
      }
      // Optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
    } catch (err: any) {
      setError(err.message || "Failed to update role");
    } finally {
      setUpdatingRole(null);
    }
  };

  // ---- Toggle capability override ----
  const handleToggleCapability = async (userId: string, cap: Capability) => {
    const key = `${userId}:${cap}`;
    setTogglingCap(key);

    const current = permissions[userId] || [];
    const isExplicit = current.includes(cap);
    const roleKey =
      users.find((u) => u.id === userId)?.role.toUpperCase() || "";
    const isFromRoleDefault = (ROLE_PRESETS[roleKey] || []).includes(cap);

    // Determine updated overrides list
    let updated: string[];
    if (isExplicit) {
      // Remove explicit override
      updated = current.filter((c) => c !== cap);
    } else {
      // Add explicit override (only makes sense if role doesn't already grant it)
      if (isFromRoleDefault) {
        // Role already grants it -- nothing to toggle via overrides
        setTogglingCap(null);
        return;
      }
      updated = [...current, cap];
    }

    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: updated }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update permissions");
      }
      // Optimistic update
      setPermissions((prev) => ({ ...prev, [userId]: updated }));
    } catch (err: any) {
      setError(err.message || "Failed to update permissions");
    } finally {
      setTogglingCap(null);
    }
  };

  // ---- Render ----
  return (
    <AppShell
      role="admin"
      title="Roles & Permissions"
      subtitle="Manage user roles and capability overrides."
    >
      <div className="space-y-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Shield className="h-4 w-4" />
            <span>
              {users.length} user{users.length !== 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)]",
              loading && "opacity-50 cursor-not-allowed",
            )}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
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
        {!loading && users.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                  <th className="sticky left-0 z-10 bg-[var(--card)] px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--muted-foreground)]">
                    Role
                  </th>
                  {ALL_CAPABILITIES.map((cap) => (
                    <th
                      key={cap}
                      className="px-2 py-3 text-center font-medium text-[var(--muted-foreground)]"
                      title={CAPABILITY_LABELS[cap]}
                    >
                      <span className="block max-w-[80px] truncate text-xs">
                        {CAPABILITY_LABELS[cap]}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const userOverrides = permissions[user.id] || [];
                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/40 transition-colors"
                    >
                      {/* Name */}
                      <td className="sticky left-0 z-10 bg-[var(--card)] px-4 py-3 font-medium text-[var(--foreground)]">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
                          {user.name || "Unnamed"}
                          {!user.isActive && (
                            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-600 dark:bg-red-950 dark:text-red-400">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {user.email}
                      </td>

                      {/* Role dropdown */}
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          disabled={updatingRole === user.id}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value)
                          }
                          className={cn(
                            "rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]",
                            updatingRole === user.id &&
                              "opacity-50 cursor-not-allowed",
                          )}
                        >
                          {VALID_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </option>
                          ))}
                        </select>
                        {updatingRole === user.id && (
                          <Save className="ml-2 inline h-3.5 w-3.5 animate-pulse text-[var(--primary)]" />
                        )}
                      </td>

                      {/* Capability cells */}
                      {ALL_CAPABILITIES.map((cap) => {
                        const has = userHasCapability(
                          user.role,
                          userOverrides,
                          cap,
                        );
                        const isRoleDefault = (
                          ROLE_PRESETS[user.role.toUpperCase()] || []
                        ).includes(cap);
                        const isExplicitOverride = userOverrides.includes(cap);
                        const cellKey = `${user.id}:${cap}`;
                        const isToggling = togglingCap === cellKey;

                        return (
                          <td
                            key={cap}
                            className="px-2 py-3 text-center"
                          >
                            <button
                              onClick={() =>
                                handleToggleCapability(user.id, cap)
                              }
                              disabled={isToggling}
                              title={
                                isRoleDefault
                                  ? `Granted by ${user.role} role`
                                  : isExplicitOverride
                                    ? "Explicit override (click to remove)"
                                    : "Click to grant"
                              }
                              className={cn(
                                "inline-flex h-7 w-7 items-center justify-center rounded-md transition",
                                has
                                  ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
                                  : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600",
                                isExplicitOverride &&
                                  "ring-2 ring-[var(--primary)] ring-offset-1",
                                !isRoleDefault &&
                                  !isToggling &&
                                  "hover:bg-[var(--muted)] cursor-pointer",
                                isRoleDefault && "cursor-default",
                                isToggling && "opacity-50 cursor-wait",
                              )}
                            >
                              {has ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty state */}
        {!loading && users.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--muted-foreground)]">
            <Users className="mb-3 h-10 w-10" />
            <p className="text-sm">No users found in this company.</p>
          </div>
        )}

        {/* Legend */}
        {!loading && users.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--muted-foreground)]">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-green-100 dark:bg-green-950">
                <Check className="h-3 w-3 text-green-700 dark:text-green-400" />
              </span>
              Granted
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-gray-100 dark:bg-gray-800">
                <X className="h-3 w-3 text-gray-400 dark:text-gray-600" />
              </span>
              Not granted
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-green-100 ring-2 ring-[var(--primary)] ring-offset-1 dark:bg-green-950">
                <Check className="h-3 w-3 text-green-700 dark:text-green-400" />
              </span>
              Explicit override
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
