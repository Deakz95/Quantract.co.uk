"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/Input";
import { Check, Palette, RefreshCw, Settings, Sparkles } from "lucide-react";
import { themes, ThemeConfig, applyThemeToDOM, persistTheme, getThemeById } from "@/lib/themes";

type CompanySettings = {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  brandTagline?: string | null;
  logoKey?: string | null;
  themePrimary: string;
  themeAccent: string;
  themeBg: string;
  themeText: string;
  pdfFooterLine1?: string | null;
  pdfFooterLine2?: string | null;
  pdfContactDetails?: string | null;
  defaultVatRate: number;
  defaultPaymentTermsDays?: number;
  autoChaseEnabled?: boolean;
  invoiceNumberPrefix: string;
  nextInvoiceNumber: number;
  certificateNumberPrefix: string;
  nextCertificateNumber: number;
  onboardedAt?: string | null;
  markJobCompletedOnCertIssue?: boolean;
  uiMode?: string;
};

function pickSettings(json: any): CompanySettings | null {
  const s = json?.settings ?? json?.company ?? json?.data?.settings ?? null;
  if (!s) return null;
  // Provide default theme values from Midnight Dark theme
  return {
    ...s,
    themePrimary: s.themePrimary || "#6366f1",
    themeAccent: s.themeAccent || "#22d3ee",
    themeBg: s.themeBg || "#0f1115",
    themeText: s.themeText || "#f8fafc",
    uiMode: s.uiMode || "full",
  } as CompanySettings;
}

export function CompanySettingsForm(props: { mode: "settings" | "onboarding" }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState<CompanySettings | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/admin/settings", { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.ok) throw new Error(json?.error || "failed_to_load");

        const settings = pickSettings(json);
        if (!settings) throw new Error("failed_to_load");

        if (alive) {
          setForm(settings);
          // Try to match current colors to a preset
          const matched = themes.find(
            (t) => t.tokens.primary.toLowerCase() === settings.themePrimary?.toLowerCase()
          );
          if (matched) {
            setSelectedPalette(matched.id);
            // Apply the matched theme to ensure all tokens are set
            applyThemeToDOM(matched);
          }
        }
      } catch (e: any) {
        if (alive) setError(e?.message || "failed_to_load");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const vatPct = useMemo(() => {
    const v = form?.defaultVatRate ?? 0.2;
    return Math.round(v * 100);
  }, [form?.defaultVatRate]);

  function applyPalette(theme: ThemeConfig) {
    if (!form) return;
    setSelectedPalette(theme.id);
    setForm({
      ...form,
      themePrimary: theme.tokens.primary,
      themeAccent: theme.tokens.accent,
      themeBg: theme.tokens.bg,
      themeText: theme.tokens.text,
    });

    // Apply complete theme to DOM
    applyThemeToDOM(theme);
    persistTheme(theme.id);
  }

  function applyCustomColor(key: keyof Pick<CompanySettings, 'themePrimary' | 'themeAccent' | 'themeBg' | 'themeText'>, value: string) {
    if (!form) return;
    setSelectedPalette(null);
    setForm({ ...form, [key]: value });

    const root = document.documentElement;
    if (key === 'themePrimary') {
      root.style.setProperty("--primary", value);
      root.style.setProperty("--ring", value);
      root.style.setProperty("--qt-theme-primary", value);
    } else if (key === 'themeAccent') {
      root.style.setProperty("--accent", value);
      root.style.setProperty("--qt-theme-accent", value);
    } else if (key === 'themeBg') {
      root.style.setProperty("--background", value);
      root.style.setProperty("--qt-theme-bg", value);
    } else if (key === 'themeText') {
      root.style.setProperty("--foreground", value);
      root.style.setProperty("--card-foreground", value);
      root.style.setProperty("--qt-theme-text", value);
    }
  }

  async function save(markOnboarded: boolean) {
    if (!form) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandName: form.brandName,
          brandTagline: form.brandTagline,
          defaultVatRate: form.defaultVatRate,
          invoiceNumberPrefix: form.invoiceNumberPrefix,
          nextInvoiceNumber: form.nextInvoiceNumber,
          certificateNumberPrefix: form.certificateNumberPrefix,
          nextCertificateNumber: form.nextCertificateNumber,
          themePrimary: form.themePrimary,
          themeAccent: form.themeAccent,
          themeBg: form.themeBg,
          themeText: form.themeText,
          pdfFooterLine1: form.pdfFooterLine1,
          pdfFooterLine2: form.pdfFooterLine2,
          pdfContactDetails: form.pdfContactDetails,
          defaultPaymentTermsDays: form.defaultPaymentTermsDays ?? 14,
          autoChaseEnabled: Boolean(form.autoChaseEnabled),
          markJobCompletedOnCertIssue: Boolean(form.markJobCompletedOnCertIssue),
          uiMode: form.uiMode,
          markOnboarded,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "save_failed");

      if (markOnboarded) {
        document.cookie = "qt_onboarded=1; path=/; samesite=lax";
        window.location.href = "/admin";
        return;
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e?.message || "save_failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file: File) {
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const res = await fetch("/api/admin/settings/logo", {
        method: "PUT",
        headers: { "Content-Type": "image/png" },
        body: buf,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || "logo_upload_failed");
      setForm((c) => (c ? { ...c, logoKey: json.logoKey } : c));
    } catch (e: any) {
      setError(e?.message || "logo_upload_failed");
    }
  }

  async function runAutoChase(dryRun: boolean) {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/invoices/auto-chase/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) throw new Error(json?.error || (dryRun ? "dry_run_failed" : "auto_chase_failed"));

      if (dryRun) {
        alert(`Dry run: would send ${json.sent} reminders (examined ${json.examined}).`);
      } else {
        alert(`Auto-chase run complete. Examined ${json.examined}, sent ${json.sent}, skipped ${json.skipped}.`);
      }
    } catch (e: any) {
      setError(e?.message || (dryRun ? "dry_run_failed" : "auto_chase_failed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-[var(--muted-foreground)]">Loading settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (!form) {
    return (
      <Card className="border-[var(--error)]/30 bg-[var(--error)]/5">
        <CardContent className="p-6 text-center text-[var(--error)]">
          Failed to load settings{error ? `: ${error}` : ""}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Complexity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--primary)]" />
            <CardTitle>Navigation Complexity</CardTitle>
          </div>
          <CardDescription>Choose how many features are visible in your sidebar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              {
                id: "simple",
                title: "Simple",
                count: 6,
                desc: "Dashboard, Jobs, Quotes, Invoices, Schedule, Clients. Best for small teams or solo operators.",
              },
              {
                id: "standard",
                title: "Standard",
                count: 10,
                desc: "Adds Certificates, Engineers, Reports, Timesheets. Good for growing teams.",
              },
              {
                id: "full",
                title: "Full",
                count: "All",
                desc: "Everything visible. All tools, office, sales, and admin sections. For power users.",
              },
            ] as const).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setForm({ ...form, uiMode: opt.id })}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left hover:scale-[1.02] ${
                  form.uiMode === opt.id
                    ? "border-[var(--primary)] shadow-lg ring-2 ring-[var(--primary)]/30 bg-[var(--primary)]/5"
                    : "border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--card)]"
                }`}
              >
                {form.uiMode === opt.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--primary)] flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className="font-semibold text-sm text-[var(--foreground)]">{opt.title}</div>
                <div className="text-xs text-[var(--muted-foreground)] mt-1">{opt.count} nav items</div>
                <p className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed">{opt.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color Palettes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-[var(--primary)]" />
            <CardTitle>Color Palette</CardTitle>
          </div>
          <CardDescription>Choose a preset theme or customize your own colors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => applyPalette(theme)}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left hover:scale-[1.02] overflow-hidden ${
                  selectedPalette === theme.id
                    ? "border-[var(--primary)] shadow-lg ring-2 ring-[var(--primary)]/30"
                    : "border-[var(--border)] hover:border-[var(--primary)]/50"
                }`}
                style={{
                  backgroundColor: theme.tokens.bg,
                  borderColor: selectedPalette === theme.id ? theme.tokens.primary : theme.tokens.border,
                }}
              >
                {selectedPalette === theme.id && (
                  <div
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: theme.tokens.primary }}
                  >
                    <Check className="w-4 h-4" style={{ color: theme.tokens.primaryContrast }} />
                  </div>
                )}
                <div className={`w-full h-8 rounded-lg bg-gradient-to-r ${theme.preview} mb-3`} />
                <div
                  className="font-semibold text-sm"
                  style={{ color: theme.tokens.text }}
                >
                  {theme.name}
                </div>
                <div
                  className="text-xs"
                  style={{ color: theme.tokens.textMuted }}
                >
                  {theme.description}
                </div>
                {/* Mini preview of buttons/badges */}
                <div className="mt-2 flex gap-1">
                  <span
                    className="px-2 py-0.5 text-[10px] rounded-full font-medium"
                    style={{
                      backgroundColor: theme.tokens.primary,
                      color: theme.tokens.primaryContrast,
                    }}
                  >
                    Button
                  </span>
                  <span
                    className="px-2 py-0.5 text-[10px] rounded-full font-medium"
                    style={{
                      backgroundColor: theme.tokens.surface2,
                      color: theme.tokens.text,
                      border: `1px solid ${theme.tokens.border}`,
                    }}
                  >
                    Badge
                  </span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            <CardTitle>Custom Colors</CardTitle>
          </div>
          <CardDescription>Fine-tune each color individually</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { key: "themePrimary" as const, label: "Primary", desc: "Main brand color" },
              { key: "themeAccent" as const, label: "Accent", desc: "Secondary highlights" },
              { key: "themeBg" as const, label: "Background", desc: "Page background" },
              { key: "themeText" as const, label: "Text", desc: "Main text color" },
            ]).map(({ key, label, desc }) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form[key]}
                    onChange={(e) => applyCustomColor(key, e.target.value)}
                    className="h-10 w-14 rounded-lg border border-[var(--border)] cursor-pointer"
                  />
                  <Input
                    value={form[key]}
                    onChange={(e) => applyCustomColor(key, e.target.value)}
                    className="flex-1 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>Your company identity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Brand Name</label>
              <Input
                value={form.brandName}
                onChange={(e) => setForm({ ...form, brandName: e.target.value })}
                placeholder="Your Company Name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Tagline (optional)</label>
              <Input
                value={form.brandTagline ?? ""}
                onChange={(e) => setForm({ ...form, brandTagline: e.target.value || null })}
                placeholder="Your tagline or slogan"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Logo (PNG)</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/png"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadLogo(f);
                  }}
                  className="flex-1 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[var(--primary)] file:text-[var(--primary-foreground)] file:font-semibold file:cursor-pointer hover:file:bg-[var(--primary-dark)]"
                />
                {form.logoKey && (
                  <Badge variant="success">
                    <Check className="w-3 h-3 mr-1" /> Uploaded
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defaults & Numbering */}
      <Card>
        <CardHeader>
          <CardTitle>Defaults & Numbering</CardTitle>
          <CardDescription>Business defaults and document numbering</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Default VAT Rate</label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={vatPct}
                  onChange={(e) => {
                    const pct = Number(e.target.value || 0);
                    setForm({ ...form, defaultVatRate: pct / 100 });
                  }}
                  className="flex-1"
                />
                <span className="text-[var(--muted-foreground)]">%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Payment Terms (days)</label>
              <Input
                type="number"
                min={0}
                value={form.defaultPaymentTermsDays ?? 14}
                onChange={(e) =>
                  setForm({
                    ...form,
                    defaultPaymentTermsDays: Math.max(0, Math.floor(Number(e.target.value || 0))),
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Auto Invoice Chasing</label>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] cursor-pointer hover:bg-[var(--muted)] transition-colors">
                <input
                  type="checkbox"
                  checked={Boolean(form.autoChaseEnabled)}
                  onChange={(e) => setForm({ ...form, autoChaseEnabled: e.target.checked })}
                  className="w-4 h-4 accent-[var(--primary)]"
                />
                <span className="text-sm text-[var(--foreground)]">Enable auto reminders</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Invoice Prefix</label>
              <Input
                value={form.invoiceNumberPrefix}
                onChange={(e) => setForm({ ...form, invoiceNumberPrefix: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Next Invoice #</label>
              <Input
                type="number"
                value={form.nextInvoiceNumber}
                onChange={(e) => setForm({ ...form, nextInvoiceNumber: Math.max(1, Math.floor(Number(e.target.value || 1))) })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Certificate Prefix</label>
              <Input
                value={form.certificateNumberPrefix}
                onChange={(e) => setForm({ ...form, certificateNumberPrefix: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" disabled={saving} onClick={() => void runAutoChase(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Dry Run Chase
            </Button>
            <Button variant="secondary" disabled={saving} onClick={() => void runAutoChase(false)}>
              Run Auto-Chase
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job & Certificate */}
      <Card>
        <CardHeader>
          <CardTitle>Job & Certificate</CardTitle>
          <CardDescription>Automation between jobs and certificates</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border)] cursor-pointer hover:bg-[var(--muted)] transition-colors">
            <input
              type="checkbox"
              checked={Boolean(form.markJobCompletedOnCertIssue)}
              onChange={(e) => setForm({ ...form, markJobCompletedOnCertIssue: e.target.checked })}
              className="w-4 h-4 mt-0.5 accent-[var(--primary)]"
            />
            <div>
              <span className="text-sm font-medium text-[var(--foreground)]">Auto-complete jobs when certificate issued</span>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">When a certificate is issued for a job, automatically mark the job as completed</p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* PDF Footer */}
      <Card>
        <CardHeader>
          <CardTitle>PDF Footer</CardTitle>
          <CardDescription>Footer text for generated documents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Footer Line 1</label>
              <Input
                value={form.pdfFooterLine1 ?? ""}
                onChange={(e) => setForm({ ...form, pdfFooterLine1: e.target.value })}
                placeholder="e.g. Company Reg • VAT • UTR"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--foreground)]">Footer Line 2</label>
              <Input
                value={form.pdfFooterLine2 ?? ""}
                onChange={(e) => setForm({ ...form, pdfFooterLine2: e.target.value })}
                placeholder="e.g. Address • Phone • Email"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-[var(--foreground)]">Contact Details</label>
            <textarea
              rows={3}
              value={form.pdfContactDetails ?? ""}
              onChange={(e) => setForm({ ...form, pdfContactDetails: e.target.value || null })}
              placeholder={"e.g. 123 Main Street, London\nPhone: 020 1234 5678\nEmail: info@example.com"}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] resize-y"
            />
            <p className="text-xs text-[var(--muted-foreground)]">Multi-line contact details shown at the bottom of generated PDFs</p>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <div className="rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/5 p-4 text-sm text-[var(--error)]">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/5 p-4 text-sm text-[var(--success)] flex items-center gap-2">
          <Check className="w-4 h-4" />
          Settings saved successfully!
        </div>
      )}

      {/* Save Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button variant="gradient" disabled={saving} onClick={() => void save(false)}>
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-[var(--primary-foreground)] border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>

        {props.mode === "onboarding" && (
          <Button variant="default" disabled={saving} onClick={() => void save(true)}>
            Finish Onboarding
          </Button>
        )}
      </div>
    </div>
  );
}
