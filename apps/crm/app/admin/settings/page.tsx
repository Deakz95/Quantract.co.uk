'use client';

import { useEffect, useState } from 'react';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Briefcase, Zap, Receipt, AlertCircle, Users, FileText, Settings } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(j => { setData(j.company || j.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <AppShell role="admin" title="Settings" subtitle="Manage your business settings and preferences">
      {loading ? (
        <div className="p-8 text-center text-[var(--muted-foreground)]">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading settings...
        </div>
      ) : !data ? (
        <div className="p-8 text-center text-[var(--muted-foreground)]">
          Unable to load settings
        </div>
      ) : (
        <div className="space-y-6 max-w-4xl">
          {/* Company Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Company</CardTitle>
                  <CardDescription>Your business information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Company Name</label>
                  <p className="text-[var(--foreground)] font-medium">{data.brandName || 'Not set'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Tagline</label>
                  <p className="text-[var(--foreground)]">{data.brandTagline || 'Not set'}</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <Link href="/admin/settings/account">
                  <Button variant="secondary" size="sm">Edit Company Details</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Theme</CardTitle>
                  <CardDescription>Customize your brand colors</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Primary Color</label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg border border-[var(--border)]"
                      style={{ backgroundColor: data.themePrimary || '#3b82f6' }}
                    />
                    <span className="text-sm text-[var(--foreground)] font-mono">{data.themePrimary || '#3b82f6'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Accent Color</label>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg border border-[var(--border)]"
                      style={{ backgroundColor: data.themeAccent || '#06b6d4' }}
                    />
                    <span className="text-sm text-[var(--foreground)] font-mono">{data.themeAccent || '#06b6d4'}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-[var(--border)]">
                <Link href="/admin/settings/appearance">
                  <Button variant="secondary" size="sm">Customize Theme</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Billing Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle>Billing</CardTitle>
                  <CardDescription>Manage your subscription</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-[var(--muted-foreground)]">Current Plan</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--foreground)] font-semibold text-lg">{data.plan || 'Free'}</span>
                    <Badge variant={data.plan === 'Pro' ? 'success' : 'secondary'}>
                      {data.plan === 'Pro' ? 'Active' : 'Free Tier'}
                    </Badge>
                  </div>
                </div>
                <Button variant="gradient">Upgrade Plan</Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/admin/settings/subdomain">
              <Card variant="interactive" className="cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <Settings className="w-6 h-6 text-[var(--primary)]" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Custom Domain</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Branded portal URL</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/settings/terms">
              <Card variant="interactive" className="cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <FileText className="w-6 h-6 text-[var(--primary)]" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Terms & Payments</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Payment terms & T&Cs</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/settings/notifications">
              <Card variant="interactive" className="cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <AlertCircle className="w-6 h-6 text-[var(--primary)]" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Notifications</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Email & alerts</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/settings/security">
              <Card variant="interactive" className="cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <Users className="w-6 h-6 text-[var(--primary)]" />
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Security</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Password & 2FA</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
