"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/Input";
import {
  Mail,
  FileText,
  Clock,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  Settings,
  Send,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/useToast";

// Types
type NotificationSettings = {
  smsEnabled: boolean;
  smsProvider: string | null;
  smsSenderId: string | null;
  smsRequireConsent: boolean;
  smsQuietHoursEnabled: boolean;
  smsQuietFrom: string | null;
  smsQuietTo: string | null;
  smsMaxPerClientPerDay: number;
  smsMaxPerJobPerDay: number;
  smsCredits: number;
  providerConfigured: boolean;
};

type NotificationRule = {
  sms: boolean;
  email: boolean;
};

type NotificationTemplate = {
  sms?: { body: string; isDefault: boolean };
  email?: { subject: string; body: string; isDefault: boolean };
};

type NotificationLog = {
  id: string;
  channel: string;
  eventKey: string;
  recipient: string;
  status: string;
  skipReason: string | null;
  errorMessage: string | null;
  cost: number | null;
  segments: number | null;
  createdAt: string;
};

// Event categories and labels
const EVENT_CATEGORIES = {
  appointments: {
    label: "Appointments & Jobs",
    events: [
      "appointmentBooked",
      "appointmentReminder24h",
      "appointmentReminder2h",
      "engineerOnTheWay",
      "jobCompleted",
    ],
  },
  quotes: {
    label: "Quotes",
    events: ["quoteSent", "quoteReminder", "quoteAccepted"],
  },
  invoices: {
    label: "Invoices & Payments",
    events: ["invoiceIssued", "invoiceOverdue", "invoiceFinalReminder", "paymentReceived"],
  },
  certificates: {
    label: "Certificates",
    events: ["certificateIssued"],
  },
  portal: {
    label: "Portal",
    events: ["portalInvite"],
  },
};

const EVENT_LABELS: Record<string, string> = {
  appointmentBooked: "Appointment Booked",
  appointmentReminder24h: "24-Hour Reminder",
  appointmentReminder2h: "2-Hour Reminder",
  engineerOnTheWay: "Engineer On The Way",
  jobCompleted: "Job Completed",
  quoteSent: "Quote Sent",
  quoteReminder: "Quote Reminder",
  quoteAccepted: "Quote Accepted",
  invoiceIssued: "Invoice Issued",
  invoiceOverdue: "Invoice Overdue",
  invoiceFinalReminder: "Final Payment Reminder",
  paymentReceived: "Payment Received",
  certificateIssued: "Certificate Issued",
  portalInvite: "Portal Invite",
};

const SKIP_REASON_LABELS: Record<string, string> = {
  noConsent: "No Consent",
  noCredits: "No Credits",
  quietHours: "Quiet Hours",
  rateLimited: "Rate Limited",
  missingPhone: "Missing Phone",
  missingEmail: "Missing Email",
  disabled: "Disabled",
  providerError: "Provider Error",
};

type Tab = "sms" | "templates" | "logs";

export function NotificationsSettings() {
  const [activeTab, setActiveTab] = useState<Tab>("sms");
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [rules, setRules] = useState<Record<string, NotificationRule>>({});
  const [templates, setTemplates] = useState<Record<string, NotificationTemplate>>({});
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logStats, setLogStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications/settings");
      const data = await res.json();
      if (data.ok) {
        setSettings(data.settings);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
    }
  }, [toast]);

  // Fetch rules
  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications/rules");
      const data = await res.json();
      if (data.ok) {
        setRules(data.rules);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications/templates");
      const data = await res.json();
      if (data.ok) {
        setTemplates(data.templates);
        setDefaults(data.defaults);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications/logs?limit=50");
      const data = await res.json();
      if (data.ok) {
        setLogs(data.logs);
        setLogStats(data.stats);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([fetchSettings(), fetchRules(), fetchTemplates(), fetchLogs()]).finally(() =>
      setLoading(false)
    );
  }, [fetchSettings, fetchRules, fetchTemplates, fetchLogs]);

  // Save settings
  const saveSettings = async (updates: Partial<NotificationSettings>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/notifications/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchSettings();
        toast({ title: "Saved", description: "Settings updated" });
      } else {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Toggle rule
  const toggleRule = async (eventKey: string, channel: "SMS" | "EMAIL", enabled: boolean) => {
    try {
      const res = await fetch("/api/admin/notifications/rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventKey, channel, enabled }),
      });
      if (res.ok) {
        await fetchRules();
      }
    } catch {
      toast({ title: "Error", description: "Failed to update rule", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-4">
        <TabButton active={activeTab === "sms"} onClick={() => setActiveTab("sms")}>
          <Send className="w-4 h-4" />
          SMS
        </TabButton>
        <TabButton active={activeTab === "templates"} onClick={() => setActiveTab("templates")}>
          <FileText className="w-4 h-4" />
          Templates
        </TabButton>
        <TabButton active={activeTab === "logs"} onClick={() => setActiveTab("logs")}>
          <Clock className="w-4 h-4" />
          Logs
        </TabButton>
      </div>

      {/* SMS Tab */}
      {activeTab === "sms" && settings && (
        <SMSTab
          settings={settings}
          rules={rules}
          onSave={saveSettings}
          onToggleRule={toggleRule}
          saving={saving}
        />
      )}

      {/* Templates Tab */}
      {activeTab === "templates" && (
        <TemplatesTab
          templates={templates}
          defaults={defaults}
          onRefresh={fetchTemplates}
        />
      )}

      {/* Logs Tab */}
      {activeTab === "logs" && (
        <LogsTab logs={logs} stats={logStats} onRefresh={fetchLogs} />
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        active
          ? "bg-[var(--primary)] text-white"
          : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]/80"
      )}
    >
      {children}
    </button>
  );
}

// SMS Tab Component
function SMSTab({
  settings,
  rules,
  onSave,
  onToggleRule,
  saving,
}: {
  settings: NotificationSettings;
  rules: Record<string, NotificationRule>;
  onSave: (updates: Partial<NotificationSettings>) => Promise<void>;
  onToggleRule: (eventKey: string, channel: "SMS" | "EMAIL", enabled: boolean) => Promise<void>;
  saving: boolean;
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSave(localSettings);
  };

  const sendTestSMS = async () => {
    if (!testPhone || !testMessage) {
      toast({ title: "Error", description: "Enter phone number and message", variant: "destructive" });
      return;
    }

    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/notifications/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, message: testMessage }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: "SMS Sent",
          description: `Message ID: ${data.messageId}, Segments: ${data.segments}`,
        });
        setTestPhone("");
        setTestMessage("");
      } else {
        toast({
          title: "Failed",
          description: data.error || "Could not send SMS",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to send test SMS", variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                settings.smsEnabled ? "bg-green-100 dark:bg-green-900/30" : "bg-[var(--muted)]"
              )}
            >
              <Send
                className={cn(
                  "w-6 h-6",
                  settings.smsEnabled ? "text-green-600" : "text-[var(--muted-foreground)]"
                )}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--foreground)]">SMS Notifications</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                {settings.smsEnabled ? "Enabled" : "Disabled"} •{" "}
                {settings.providerConfigured ? "Provider configured" : "Provider not configured"} •{" "}
                <span className="font-semibold">{settings.smsCredits}</span> credits remaining
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Toggle
              checked={localSettings.smsEnabled}
              onChange={(v) => setLocalSettings({ ...localSettings, smsEnabled: v })}
            />
          </div>
        </div>
      </div>

      {/* Provider Settings */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h4 className="font-semibold text-[var(--foreground)]">Provider Settings</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Provider
            </label>
            <select
              value={localSettings.smsProvider || "mock"}
              onChange={(e) => setLocalSettings({ ...localSettings, smsProvider: e.target.value })}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)]"
            >
              <option value="mock">Mock (Testing)</option>
              <option value="twilio">Twilio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Sender ID / From Number
            </label>
            <Input
              value={localSettings.smsSenderId || ""}
              onChange={(e) => setLocalSettings({ ...localSettings, smsSenderId: e.target.value })}
              placeholder="e.g., Quantract or +447123456789"
            />
          </div>
        </div>
      </div>

      {/* Consent & Rate Limits */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h4 className="font-semibold text-[var(--foreground)]">Consent & Rate Limits</h4>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium text-[var(--foreground)]">Require SMS Consent</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Only send SMS to clients who have opted in
            </p>
          </div>
          <Toggle
            checked={localSettings.smsRequireConsent}
            onChange={(v) => setLocalSettings({ ...localSettings, smsRequireConsent: v })}
          />
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="font-medium text-[var(--foreground)]">Quiet Hours</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Don't send SMS during specified hours
            </p>
          </div>
          <Toggle
            checked={localSettings.smsQuietHoursEnabled}
            onChange={(v) => setLocalSettings({ ...localSettings, smsQuietHoursEnabled: v })}
          />
        </div>

        {localSettings.smsQuietHoursEnabled && (
          <div className="grid grid-cols-2 gap-4 ml-4">
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">From</label>
              <Input
                type="time"
                value={localSettings.smsQuietFrom || "21:00"}
                onChange={(e) => setLocalSettings({ ...localSettings, smsQuietFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--muted-foreground)] mb-1">To</label>
              <Input
                type="time"
                value={localSettings.smsQuietTo || "08:00"}
                onChange={(e) => setLocalSettings({ ...localSettings, smsQuietTo: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Max SMS per client/day
            </label>
            <Input
              type="number"
              min={1}
              max={20}
              value={localSettings.smsMaxPerClientPerDay}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, smsMaxPerClientPerDay: parseInt(e.target.value) || 3 })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Max SMS per job/day
            </label>
            <Input
              type="number"
              min={1}
              max={20}
              value={localSettings.smsMaxPerJobPerDay}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, smsMaxPerJobPerDay: parseInt(e.target.value) || 5 })
              }
            />
          </div>
        </div>
      </div>

      {/* Event Toggles */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-6">
        <h4 className="font-semibold text-[var(--foreground)]">Event Toggles</h4>

        {Object.entries(EVENT_CATEGORIES).map(([catKey, category]) => (
          <div key={catKey} className="space-y-2">
            <h5 className="text-sm font-medium text-[var(--muted-foreground)]">{category.label}</h5>
            {category.events.map((eventKey) => {
              const rule = rules[eventKey] || { sms: true, email: true };
              return (
                <div key={eventKey} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <span className="text-sm text-[var(--foreground)]">{EVENT_LABELS[eventKey]}</span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Toggle
                        checked={rule.sms}
                        onChange={(v) => onToggleRule(eventKey, "SMS", v)}
                        size="sm"
                      />
                      <span className="text-[var(--muted-foreground)]">SMS</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Test SMS */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 space-y-4">
        <h4 className="font-semibold text-[var(--foreground)]">Send Test SMS</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Phone Number
            </label>
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+447123456789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Message</label>
            <Input
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Test message"
            />
          </div>
        </div>

        <Button onClick={sendTestSMS} disabled={sendingTest || !testPhone || !testMessage}>
          <Send className="w-4 h-4 mr-2" />
          {sendingTest ? "Sending..." : "Send Test"}
        </Button>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// Templates Tab Component
function TemplatesTab({
  templates,
  defaults,
  onRefresh,
}: {
  templates: Record<string, NotificationTemplate>;
  defaults: Record<string, string>;
  onRefresh: () => void;
}) {
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const startEditing = (eventKey: string) => {
    const template = templates[eventKey]?.sms;
    setEditBody(template?.body || defaults[eventKey] || "");
    setEditingEvent(eventKey);
  };

  const saveTemplate = async () => {
    if (!editingEvent) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/notifications/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventKey: editingEvent,
          channel: "SMS",
          templateBody: editBody,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Saved", description: "Template updated" });
        setEditingEvent(null);
        onRefresh();
      } else {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save template", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const restoreDefault = async () => {
    if (!editingEvent) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/notifications/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventKey: editingEvent,
          channel: "SMS",
          restoreDefault: true,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Restored", description: "Template restored to default" });
        setEditingEvent(null);
        onRefresh();
      }
    } catch {
      toast({ title: "Error", description: "Failed to restore", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Character count and segments
  const charCount = editBody.length;
  const segments = Math.ceil(charCount / 160) || 1;

  return (
    <div className="space-y-6">
      {/* Template Editor Modal */}
      {editingEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-[var(--border)]">
              <h3 className="text-lg font-semibold text-[var(--foreground)]">
                Edit Template: {EVENT_LABELS[editingEvent]}
              </h3>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                  SMS Template
                </label>
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] resize-none"
                />
                <div className="flex justify-between mt-2 text-xs text-[var(--muted-foreground)]">
                  <span>{charCount} characters</span>
                  <span>
                    {segments} segment{segments !== 1 ? "s" : ""} (~{segments * 4}p)
                  </span>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--foreground)] mb-2">Available Variables</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "companyName",
                    "clientName",
                    "jobDate",
                    "jobTime",
                    "jobAddress",
                    "engineerName",
                    "etaMinutes",
                    "quoteNumber",
                    "quoteLink",
                    "invoiceNumber",
                    "invoiceTotal",
                    "paymentLink",
                    "portalLink",
                  ].map((v) => (
                    <button
                      key={v}
                      onClick={() => setEditBody((prev) => prev + `{${v}}`)}
                      className="text-xs px-2 py-1 bg-[var(--muted)] rounded text-[var(--foreground)] hover:bg-[var(--muted)]/80"
                    >
                      {`{${v}}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--muted)] rounded-lg p-4">
                <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">Preview</p>
                <p className="text-sm text-[var(--foreground)]">
                  {editBody
                    .replace("{companyName}", "ACME Electrical")
                    .replace("{clientName}", "John Smith")
                    .replace("{jobDate}", "15/02/2026")
                    .replace("{jobTime}", "09:00")
                    .replace("{jobAddress}", "123 High St, London")
                    .replace("{engineerName}", "Mike")
                    .replace("{etaMinutes}", "15")
                    .replace("{quoteNumber}", "Q-001")
                    .replace("{quoteLink}", "https://...")
                    .replace("{invoiceNumber}", "INV-001")
                    .replace("{invoiceTotal}", "£250.00")
                    .replace("{paymentLink}", "https://...")
                    .replace("{portalLink}", "https://...")}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border)] flex justify-between">
              <Button variant="secondary" onClick={restoreDefault} disabled={saving}>
                Restore Default
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditingEvent(null)}>
                  Cancel
                </Button>
                <Button onClick={saveTemplate} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template List */}
      {Object.entries(EVENT_CATEGORIES).map(([catKey, category]) => (
        <div key={catKey} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <h4 className="font-semibold text-[var(--foreground)] mb-4">{category.label}</h4>

          <div className="space-y-2">
            {category.events.map((eventKey) => {
              const template = templates[eventKey]?.sms;
              const body = template?.body || defaults[eventKey] || "";
              const isCustom = template && !template.isDefault;

              return (
                <div
                  key={eventKey}
                  className="flex items-center justify-between py-3 border-b border-[var(--border)] last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--foreground)]">
                        {EVENT_LABELS[eventKey]}
                      </span>
                      {isCustom && (
                        <Badge variant="secondary" className="text-xs">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] truncate mt-1">{body}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => startEditing(eventKey)}>
                    Edit
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Logs Tab Component
function LogsTab({
  logs,
  stats,
  onRefresh,
}: {
  logs: NotificationLog[];
  stats: any;
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Sent Today" value={stats.sentToday} />
          <StatCard label="Sent This Month" value={stats.sentThisMonth} />
          <StatCard label="Skipped" value={stats.skippedThisMonth} variant="warning" />
          <StatCard label="Failed" value={stats.failedThisMonth} variant="error" />
        </div>
      )}

      {/* Refresh */}
      <div className="flex justify-end">
        <Button variant="secondary" onClick={onRefresh}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Logs Table */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">
                Time
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">
                Event
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">
                Recipient
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--muted-foreground)]">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                  No notification logs yet
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                    {new Date(log.createdAt).toLocaleString("en-GB")}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                    {EVENT_LABELS[log.eventKey] || log.eventKey}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--foreground)] font-mono">
                    {log.recipient}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        log.status === "sent"
                          ? "success"
                          : log.status === "skipped"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {log.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--muted-foreground)]">
                    {log.skipReason && SKIP_REASON_LABELS[log.skipReason]}
                    {log.errorMessage && <span className="text-red-500">{log.errorMessage}</span>}
                    {log.segments && `${log.segments} seg`}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Toggle Component
function Toggle({
  checked,
  onChange,
  size = "default",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: "default" | "sm";
}) {
  const sizeClasses = size === "sm" ? "h-5 w-9" : "h-6 w-11";
  const dotSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const translate = size === "sm" ? "translate-x-4" : "translate-x-5";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        checked ? "bg-[var(--primary)]" : "bg-[var(--muted)]",
        sizeClasses
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block transform rounded-full bg-[var(--background)] shadow ring-0 transition duration-200 ease-in-out",
          checked ? translate : "translate-x-0",
          dotSize
        )}
      />
    </button>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "warning" | "error";
}) {
  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
      <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold",
          variant === "error"
            ? "text-red-500"
            : variant === "warning"
            ? "text-amber-500"
            : "text-[var(--foreground)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}
