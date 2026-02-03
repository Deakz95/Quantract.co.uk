'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/AppShell";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, AlertCircle, ArrowUpRight, FileText, Lock } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/useToast";
import { type Entitlements, hasEntitlement, getUnlockingPlan, getPlanLabel } from "@/lib/entitlements";

export default function SubdomainSettingsPage() {
  const [subdomain, setSubdomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch both settings and entitlements in parallel
    Promise.all([
      fetch('/api/admin/settings').then(r => r.json()),
      fetch('/api/entitlements/me').then(r => r.json()),
    ]).then(([settingsRes, entitlementsRes]) => {
      const data = settingsRes.company || settingsRes.data || {};
      setSubdomain(data.subdomain || '');
      setCustomDomain(data.customDomain || '');
      if (entitlementsRes.ok && entitlementsRes.entitlements) {
        setEntitlements(entitlementsRes.entitlements);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subdomain, customDomain }),
      });

      if (res.ok) {
        toast({ title: 'Settings saved', description: 'Your domain settings have been updated.' });
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to save settings', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  // Use entitlements — Enterprise always gets access, Pro+ gets custom domain
  const canUseSubdomain = entitlements ? hasEntitlement(entitlements, 'feature_subdomain') : false;
  const canUseCustomDomain = entitlements ? hasEntitlement(entitlements, 'feature_custom_domain') : false;
  const portalUrl = subdomain ? `https://${subdomain}.quantract.co.uk` : '';

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Dashboard", href: "/admin" },
    { label: "Settings", href: "/admin/settings" },
    { label: "Custom Domain" },
  ];

  return (
    <AppShell role="admin" title="Custom Domain" subtitle="Configure your branded portal URL">
      <Breadcrumbs items={breadcrumbItems} />
      <div className="space-y-6 max-w-2xl">

        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading...
          </div>
        ) : (
          <>
            {/* Subdomain Settings — available on most plans */}
            <Card className={!canUseSubdomain ? 'opacity-75' : ''}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Subdomain
                      {!canUseSubdomain && (
                        <Badge variant="secondary" className="gap-1">
                          <Lock className="w-3 h-3" />
                          {getPlanLabel(getUnlockingPlan('feature_subdomain'))}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>Your client portal subdomain on quantract.co.uk</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canUseSubdomain ? (
                  <div className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Upgrade Required</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Upgrade your plan to use a branded subdomain.
                        </p>
                        <Link href="/admin/settings">
                          <Button variant="gradient" size="sm" className="mt-3">
                            Upgrade Plan
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="subdomain" className="text-sm font-medium text-[var(--foreground)]">Subdomain</label>
                      <div className="flex items-center gap-2">
                        <input
                          id="subdomain"
                          value={subdomain}
                          onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          placeholder="yourcompany"
                          className="max-w-[200px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        />
                        <span className="text-[var(--muted-foreground)]">.quantract.co.uk</span>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        Only lowercase letters, numbers, and hyphens allowed
                      </p>
                    </div>

                    {subdomain && (
                      <div className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">Your Portal URL</p>
                            <p className="text-sm text-[var(--primary)]">{portalUrl}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(portalUrl)}>
                              <FileText className="w-4 h-4" />
                            </Button>
                            <a href={portalUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm">
                                <ArrowUpRight className="w-4 h-4" />
                              </Button>
                            </a>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Custom Domain (Pro+ Feature) */}
            <Card className={!canUseCustomDomain ? 'opacity-75' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                      <Settings className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Custom Domain
                        {!canUseCustomDomain && (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="w-3 h-3" />
                            {getPlanLabel(getUnlockingPlan('feature_custom_domain'))}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>Use your own domain for the client portal</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!canUseCustomDomain ? (
                  <div className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)]">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">Pro Feature</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Upgrade to Pro to use your own custom domain (e.g., portal.yourcompany.com)
                        </p>
                        <Link href="/admin/settings">
                          <Button variant="gradient" size="sm" className="mt-3">
                            Upgrade to Pro
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="customDomain" className="text-sm font-medium text-[var(--foreground)]">Custom Domain</label>
                      <input
                        id="customDomain"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                        placeholder="portal.yourcompany.com"
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                      />
                    </div>

                    {customDomain && (
                      <div className="p-4 bg-[var(--muted)] rounded-lg border border-[var(--border)] space-y-3">
                        <p className="text-sm font-medium text-[var(--foreground)]">DNS Configuration Required</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          Add the following CNAME record to your DNS settings:
                        </p>
                        <div className="bg-[var(--background)] p-3 rounded-md font-mono text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-[var(--foreground)]">
                              {customDomain.split('.')[0]} CNAME proxy.quantract.co.uk
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(`${customDomain.split('.')[0]} CNAME proxy.quantract.co.uk`)}>
                              <FileText className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                          <span className="text-[var(--muted-foreground)]">DNS changes may take up to 48 hours to propagate</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Link href="/admin/settings">
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button onClick={handleSave} disabled={saving || (!canUseSubdomain && !canUseCustomDomain)}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
