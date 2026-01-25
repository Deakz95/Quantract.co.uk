'use client';

import { useState, useEffect } from 'react';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Settings, FileText } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/useToast";

interface NotificationSettings {
  emailNewJob: boolean;
  emailJobComplete: boolean;
  emailQuoteAccepted: boolean;
  emailPaymentReceived: boolean;
  emailWeeklyDigest: boolean;
  notifyEmail: string;
}

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNewJob: true,
    emailJobComplete: true,
    emailQuoteAccepted: true,
    emailPaymentReceived: true,
    emailWeeklyDigest: false,
    notifyEmail: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(j => {
        const data = j.company || j.data || {};
        setSettings({
          emailNewJob: data.emailNewJob ?? true,
          emailJobComplete: data.emailJobComplete ?? true,
          emailQuoteAccepted: data.emailQuoteAccepted ?? true,
          emailPaymentReceived: data.emailPaymentReceived ?? true,
          emailWeeklyDigest: data.emailWeeklyDigest ?? false,
          notifyEmail: data.notifyEmail || data.email || '',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast({ title: 'Settings saved', description: 'Your notification preferences have been updated.' });
      } else {
        toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof NotificationSettings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    }
  };

  return (
    <AppShell role="admin" title="Notifications" subtitle="Manage email and alert preferences">
      <div className="space-y-6 max-w-2xl">
        {/* Back Link */}
        <Link href="/admin/settings" className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </Link>

        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading...
          </div>
        ) : (
          <>
            {/* Email Address */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Notification Email</CardTitle>
                    <CardDescription>Where to send email notifications</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <label htmlFor="notifyEmail" className="text-sm font-medium text-[var(--foreground)]">Email Address</label>
                  <input
                    id="notifyEmail"
                    type="email"
                    value={settings.notifyEmail}
                    onChange={(e) => setSettings(prev => ({ ...prev, notifyEmail: e.target.value }))}
                    placeholder="notifications@yourcompany.com"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Job Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Job Notifications</CardTitle>
                    <CardDescription>Get notified about job updates</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">New Job Created</p>
                    <p className="text-sm text-[var(--muted-foreground)]">When a new job is added to the system</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.emailNewJob}
                    onClick={() => toggle('emailNewJob')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.emailNewJob ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--background)] shadow ring-0 transition duration-200 ease-in-out ${
                        settings.emailNewJob ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Job Completed</p>
                    <p className="text-sm text-[var(--muted-foreground)]">When a job is marked as complete</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.emailJobComplete}
                    onClick={() => toggle('emailJobComplete')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.emailJobComplete ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--background)] shadow ring-0 transition duration-200 ease-in-out ${
                        settings.emailJobComplete ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Quote Accepted</p>
                    <p className="text-sm text-[var(--muted-foreground)]">When a client accepts a quote</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.emailQuoteAccepted}
                    onClick={() => toggle('emailQuoteAccepted')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.emailQuoteAccepted ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--background)] shadow ring-0 transition duration-200 ease-in-out ${
                        settings.emailQuoteAccepted ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Payment Received</p>
                    <p className="text-sm text-[var(--muted-foreground)]">When a payment is received</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.emailPaymentReceived}
                    onClick={() => toggle('emailPaymentReceived')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.emailPaymentReceived ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--background)] shadow ring-0 transition duration-200 ease-in-out ${
                        settings.emailPaymentReceived ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Digest Emails */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Digest Emails</CardTitle>
                    <CardDescription>Summary reports</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-[var(--foreground)]">Weekly Digest</p>
                    <p className="text-sm text-[var(--muted-foreground)]">Weekly summary of all activity</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.emailWeeklyDigest}
                    onClick={() => toggle('emailWeeklyDigest')}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      settings.emailWeeklyDigest ? 'bg-[var(--primary)]' : 'bg-[var(--muted)]'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-[var(--background)] shadow ring-0 transition duration-200 ease-in-out ${
                        settings.emailWeeklyDigest ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-3">
              <Link href="/admin/settings">
                <Button variant="secondary">Cancel</Button>
              </Link>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
