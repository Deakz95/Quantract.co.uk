"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, Mail, Check } from "lucide-react";

type Settings = {
  paymentTermsDays?: number;
  enableAutoChase?: boolean;
  autoChaseFirstDays?: number;
  autoChaseSecondDays?: number;
  autoChaseThirdDays?: number;
  termsAndConditions?: string;
  quoteValidityDays?: number;
};

export default function TermsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [paymentTermsDays, setPaymentTermsDays] = useState(30);
  const [enableAutoChase, setEnableAutoChase] = useState(true);
  const [autoChaseFirstDays, setAutoChaseFirstDays] = useState(7);
  const [autoChaseSecondDays, setAutoChaseSecondDays] = useState(14);
  const [autoChaseThirdDays, setAutoChaseThirdDays] = useState(21);
  const [quoteValidityDays, setQuoteValidityDays] = useState(30);
  const [termsAndConditions, setTermsAndConditions] = useState(`TERMS AND CONDITIONS

1. PAYMENT TERMS
Payment is due within the number of days specified on the invoice from the date of issue. Late payments may incur additional charges.

2. SCOPE OF WORK
All work will be carried out in accordance with the latest edition of BS 7671 (IET Wiring Regulations) and any other relevant British Standards.

3. WARRANTY
All workmanship is guaranteed for 12 months from the date of completion. This warranty covers defects in materials and workmanship but excludes damage caused by misuse, neglect, or third-party interference.

4. VARIATIONS
Any variations to the agreed scope of work must be confirmed in writing. Additional charges may apply for work outside the original specification.

5. ACCESS
The client must provide safe and clear access to all work areas. Any delays caused by lack of access may result in additional charges.

6. MATERIALS
Unless otherwise specified, all materials supplied will be of good quality and fit for purpose. The client may request specific brands or specifications at additional cost.

7. CERTIFICATES
Appropriate electrical certificates will be provided upon completion of the work, including:
- Electrical Installation Certificate (EIC)
- Minor Electrical Installation Works Certificate (MEIWC)
- Electrical Installation Condition Report (EICR)

8. CANCELLATION
Cancellation within 48 hours of scheduled work may incur a cancellation fee of up to 50% of the quoted amount.

9. LIABILITY
Our liability is limited to the value of the contract. We maintain appropriate professional indemnity and public liability insurance.

10. DISPUTES
Any disputes will be resolved through negotiation in the first instance. If necessary, disputes may be referred to an appropriate alternative dispute resolution service.`);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/terms", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && data.settings) {
        const s = data.settings;
        if (s.paymentTermsDays !== undefined) setPaymentTermsDays(s.paymentTermsDays);
        if (s.enableAutoChase !== undefined) setEnableAutoChase(s.enableAutoChase);
        if (s.autoChaseFirstDays !== undefined) setAutoChaseFirstDays(s.autoChaseFirstDays);
        if (s.autoChaseSecondDays !== undefined) setAutoChaseSecondDays(s.autoChaseSecondDays);
        if (s.autoChaseThirdDays !== undefined) setAutoChaseThirdDays(s.autoChaseThirdDays);
        if (s.quoteValidityDays !== undefined) setQuoteValidityDays(s.quoteValidityDays);
        if (s.termsAndConditions) setTermsAndConditions(s.termsAndConditions);
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function saveSettings() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings/terms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paymentTermsDays,
          enableAutoChase,
          autoChaseFirstDays,
          autoChaseSecondDays,
          autoChaseThirdDays,
          quoteValidityDays,
          termsAndConditions,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to save");
      setMessage({ type: "success", text: "Settings saved successfully!" });
    } catch (e: any) {
      setMessage({ type: "error", text: e?.message || "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell role="admin" title="Terms & Payments" subtitle="Configure payment terms, auto-chase, and terms & conditions">
        <div className="p-8 text-center text-[var(--muted-foreground)]">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          Loading settings...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="admin" title="Terms & Payments" subtitle="Configure payment terms, auto-chase, and terms & conditions">
      <div className="max-w-4xl space-y-6">
        {message && (
          <div className={`p-4 rounded-xl ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message.text}
          </div>
        )}

        {/* Payment Terms */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Payment Terms</CardTitle>
                <CardDescription>Set default payment terms for invoices</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <label className="grid gap-1">
                <span className="text-sm font-medium text-[var(--muted-foreground)]">Default payment terms (days)</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="h-11 w-full max-w-xs rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)]"
                  value={paymentTermsDays}
                  onChange={(e) => setPaymentTermsDays(Number(e.target.value))}
                />
                <span className="text-xs text-[var(--muted-foreground)]">Number of days from invoice date that payment is due</span>
              </label>

              <label className="grid gap-1">
                <span className="text-sm font-medium text-[var(--muted-foreground)]">Quote validity (days)</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  className="h-11 w-full max-w-xs rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm text-[var(--foreground)]"
                  value={quoteValidityDays}
                  onChange={(e) => setQuoteValidityDays(Number(e.target.value))}
                />
                <span className="text-xs text-[var(--muted-foreground)]">How long quotes remain valid before expiring</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Auto-Chase Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Late Payment Reminders</CardTitle>
                <CardDescription>Automatic follow-up emails for overdue invoices</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableAutoChase}
                  onChange={(e) => setEnableAutoChase(e.target.checked)}
                  className="w-5 h-5 rounded border-[var(--border)]"
                />
                <div>
                  <span className="font-medium text-[var(--foreground)]">Enable automatic payment reminders</span>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Send automatic follow-up emails when invoices are overdue. Reminders stop when the invoice is marked as paid.
                  </p>
                </div>
                <Badge variant={enableAutoChase ? "success" : "secondary"} className="ml-auto">
                  {enableAutoChase ? "Active" : "Disabled"}
                </Badge>
              </label>

              {enableAutoChase && (
                <div className="grid gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                  <div className="text-sm font-medium text-[var(--muted-foreground)]">Reminder schedule (days after due date):</div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-[var(--muted-foreground)]">First reminder</span>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
                        value={autoChaseFirstDays}
                        onChange={(e) => setAutoChaseFirstDays(Number(e.target.value))}
                      />
                      <span className="text-xs text-[var(--muted-foreground)]">days overdue</span>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-[var(--muted-foreground)]">Second reminder</span>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
                        value={autoChaseSecondDays}
                        onChange={(e) => setAutoChaseSecondDays(Number(e.target.value))}
                      />
                      <span className="text-xs text-[var(--muted-foreground)]">days overdue</span>
                    </label>

                    <label className="grid gap-1">
                      <span className="text-xs font-medium text-[var(--muted-foreground)]">Final reminder</span>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        className="h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
                        value={autoChaseThirdDays}
                        onChange={(e) => setAutoChaseThirdDays(Number(e.target.value))}
                      />
                      <span className="text-xs text-[var(--muted-foreground)]">days overdue</span>
                    </label>
                  </div>

                  <div className="text-xs text-[var(--muted-foreground)] p-3 rounded-lg bg-[var(--muted)]">
                    <strong>How it works:</strong> When a client accepts a quote, a job is created. When you send an invoice,
                    the system tracks the due date. If payment isn't received, automatic reminders are sent at the intervals above.
                    Reminders stop when you mark the job/invoice as paid or close it.
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle>Terms & Conditions</CardTitle>
                <CardDescription>Default terms included with quotes and invoices</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <textarea
                className="min-h-[400px] rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-mono text-[var(--foreground)]"
                value={termsAndConditions}
                onChange={(e) => setTermsAndConditions(e.target.value)}
                placeholder="Enter your terms and conditions..."
              />
              <div className="text-xs text-[var(--muted-foreground)]">
                These terms will be included on your quotes and invoices. Customize them to match your business requirements.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Reset
          </Button>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
