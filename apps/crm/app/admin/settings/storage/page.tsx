'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/AppShell";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { EntitlementGate, useHasEntitlement } from "@/components/EntitlementGate";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

type UsageData = {
  bytesUsed: number;
  bytesLimit: number | null;
  percentUsed: number;
  plan: string;
  canUpgrade: boolean;
};

type StorageSettings = {
  provider: string;
  externalBaseUrl: string | null;
  externalNamingPattern: string | null;
  notes: string | null;
};

export default function StorageSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const hasByos = useHasEntitlement("feature_byos_storage");

  // BYOS state
  const [storageSettings, setStorageSettings] = useState<StorageSettings | null>(null);
  const [byosLoading, setByosLoading] = useState(true);
  const [byosProvider, setByosProvider] = useState("internal");
  const [byosBaseUrl, setByosBaseUrl] = useState("");
  const [byosPattern, setByosPattern] = useState("");
  const [byosSaving, setByosSaving] = useState(false);
  const [byosMessage, setByosMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/storage/usage')
      .then(r => r.json())
      .then((res) => {
        if (res.ok) {
          setUsage(res);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch BYOS settings
    fetch('/api/admin/storage/settings')
      .then(r => r.json())
      .then((res) => {
        if (res.ok && res.settings) {
          setStorageSettings(res.settings);
          setByosProvider(res.settings.provider);
          setByosBaseUrl(res.settings.externalBaseUrl || "");
          setByosPattern(res.settings.externalNamingPattern || "");
        }
        setByosLoading(false);
      })
      .catch(() => setByosLoading(false));
  }, []);

  const handleByosSave = async () => {
    setByosSaving(true);
    setByosMessage(null);
    try {
      const res = await fetch('/api/admin/storage/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: byosProvider,
          externalBaseUrl: byosBaseUrl || null,
          externalNamingPattern: byosPattern || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStorageSettings(data.settings);
        setByosMessage({ type: "success", text: "Storage settings saved." });
      } else {
        setByosMessage({ type: "error", text: data.error === "upgrade_required" ? "This feature requires Pro Plus or Enterprise." : data.error || "Failed to save." });
      }
    } catch {
      setByosMessage({ type: "error", text: "Network error." });
    } finally {
      setByosSaving(false);
    }
  };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/admin" },
    { label: "Settings", href: "/admin/settings" },
    { label: "Storage" },
  ];

  const barColor = !usage
    ? "bg-gray-300"
    : usage.percentUsed >= 90
      ? "bg-red-500"
      : usage.percentUsed >= 75
        ? "bg-amber-500"
        : "bg-green-500";

  return (
    <AppShell role="admin" title="Storage" subtitle="Monitor your file storage usage">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="space-y-6 max-w-2xl">
        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading...
          </div>
        ) : usage ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Storage Usage</CardTitle>
                    <CardDescription>
                      {usage.bytesLimit
                        ? `${formatBytes(usage.bytesUsed)} of ${formatBytes(usage.bytesLimit)} used`
                        : `${formatBytes(usage.bytesUsed)} used (unlimited plan)`
                      }
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="w-full h-4 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${usage.bytesLimit ? Math.min(100, usage.percentUsed) : 0}%` }}
                    />
                  </div>
                  {usage.bytesLimit && (
                    <div className="flex justify-between text-sm text-[var(--muted-foreground)]">
                      <span>{usage.percentUsed}% used</span>
                      <span>{formatBytes(usage.bytesLimit - usage.bytesUsed)} remaining</span>
                    </div>
                  )}
                </div>

                {/* Warning message */}
                {usage.bytesLimit && usage.percentUsed >= 90 && (
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      {usage.percentUsed >= 100
                        ? "Storage full — uploads are blocked until you upgrade or free up space."
                        : "Storage almost full — consider upgrading your plan to avoid upload interruptions."
                      }
                    </p>
                  </div>
                )}

                {/* Upgrade CTA */}
                {usage.canUpgrade && usage.bytesLimit && usage.percentUsed >= 75 && (
                  <div className="flex justify-end">
                    <Link href="/admin/settings">
                      <Button variant="gradient" className="gap-2">
                        Upgrade Plan
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plan info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[var(--muted-foreground)]">Current Plan</dt>
                    <dd className="font-medium text-[var(--foreground)] capitalize">{usage.plan.replace('_', ' ')}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--muted-foreground)]">Storage Limit</dt>
                    <dd className="font-medium text-[var(--foreground)]">
                      {usage.bytesLimit ? formatBytes(usage.bytesLimit) : 'Unlimited'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--muted-foreground)]">Used</dt>
                    <dd className="font-medium text-[var(--foreground)]">{formatBytes(usage.bytesUsed)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            Failed to load storage usage.
          </div>
        )}

        {/* BYOS Storage Provider */}
        <EntitlementGate entitlement="feature_byos_storage" fallback={
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>External Storage (BYOS)</CardTitle>
                  <CardDescription>Available on Pro Plus and Enterprise plans</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--muted-foreground)]">
                Bring your own storage — link documents to external URLs (Google Drive, SharePoint, etc.) instead of using internal storage.
              </p>
              <div className="mt-4">
                <Link href="/admin/settings">
                  <Button variant="gradient" size="sm" className="gap-2">
                    Upgrade Plan
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        }>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                  <ExternalLink className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>External Storage (BYOS)</CardTitle>
                  <CardDescription>Link new documents to external URLs instead of internal storage</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {byosLoading ? (
                <div className="p-4 text-center text-[var(--muted-foreground)]">Loading...</div>
              ) : (
                <>
                  {/* Info banner */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                      When using external storage, new documents will be referenced by URL. Existing documents will remain in internal storage. You are responsible for ensuring external URLs remain accessible.
                    </p>
                  </div>

                  {/* Provider selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--foreground)]">Storage Provider</label>
                    <select
                      value={byosProvider}
                      onChange={(e) => setByosProvider(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    >
                      <option value="internal">Internal (default)</option>
                      <option value="external_url">External URL</option>
                    </select>
                  </div>

                  {/* External URL fields */}
                  {byosProvider === "external_url" && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--foreground)]">Base Folder URL</label>
                        <input
                          type="url"
                          value={byosBaseUrl}
                          onChange={(e) => setByosBaseUrl(e.target.value)}
                          placeholder="https://drive.google.com/drive/folders/..."
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Must be an HTTPS URL. This is the root folder where your documents are stored externally.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--foreground)]">Naming Pattern (optional)</label>
                        <input
                          type="text"
                          value={byosPattern}
                          onChange={(e) => setByosPattern(e.target.value)}
                          placeholder="{type}/{year}/{filename}"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                        />
                        <p className="text-xs text-[var(--muted-foreground)]">
                          Optional pattern for organizing files. Placeholders: {"{type}"}, {"{year}"}, {"{filename}"}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Save button */}
                  <div className="flex items-center gap-3">
                    <Button onClick={handleByosSave} disabled={byosSaving}>
                      {byosSaving ? "Saving..." : "Save Settings"}
                    </Button>
                    {byosMessage && (
                      <span className={`text-sm ${byosMessage.type === "success" ? "text-green-600" : "text-red-600"}`}>
                        {byosMessage.text}
                      </span>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </EntitlementGate>
      </div>
    </AppShell>
  );
}
