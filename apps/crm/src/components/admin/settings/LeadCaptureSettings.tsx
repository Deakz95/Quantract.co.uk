"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  FileText,
  Plus,
  Check,
  X,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Settings,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/useToast";

// Types
type AllowedDomain = {
  id: string;
  domain: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
};

type IntegrationKey = {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string;
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
};

type FormConfig = {
  id: string;
  name: string;
  slug: string;
  defaultStageId: string | null;
  defaultOwnerId: string | null;
  requiredFields: string[];
  optionalFields: string[];
  thankYouMessage: string | null;
  redirectUrl: string | null;
  enableCaptcha: boolean;
  enableHoneypot: boolean;
  rateLimitPerMinute: number;
  isActive: boolean;
  _count?: { enquiries: number };
  createdAt: string;
};

type Tab = "domains" | "keys" | "forms" | "embed";

const TABS: { key: Tab; label: string; icon: typeof Settings; desc: string }[] = [
  { key: "domains", label: "Allowed Domains", icon: Settings, desc: "Whitelist domains for form submissions" },
  { key: "keys", label: "API Keys", icon: Lock, desc: "Manage integration keys for external systems" },
  { key: "forms", label: "Form Configs", icon: FileText, desc: "Configure form behavior and fields" },
  { key: "embed", label: "Embed Code", icon: Sparkles, desc: "Get code snippets for your website" },
];

export function LeadCaptureSettings() {
  const [activeTab, setActiveTab] = useState<Tab>("domains");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [domains, setDomains] = useState<AllowedDomain[]>([]);
  const [keys, setKeys] = useState<IntegrationKey[]>([]);
  const [forms, setForms] = useState<FormConfig[]>([]);
  const [companySlug, setCompanySlug] = useState<string>("");
  const { toast } = useToast();

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [domainsRes, keysRes, formsRes, companyRes] = await Promise.all([
        fetch("/api/admin/lead-capture/domains"),
        fetch("/api/admin/lead-capture/keys"),
        fetch("/api/admin/lead-capture/forms"),
        fetch("/api/me"),
      ]);

      // Handle API errors
      const errors: string[] = [];

      if (!domainsRes.ok) {
        errors.push("domains");
      } else {
        setDomains((await domainsRes.json()).domains || []);
      }

      if (!keysRes.ok) {
        errors.push("keys");
      } else {
        setKeys((await keysRes.json()).keys || []);
      }

      if (!formsRes.ok) {
        errors.push("forms");
      } else {
        setForms((await formsRes.json()).forms || []);
      }

      if (companyRes.ok) {
        const data = await companyRes.json();
        setCompanySlug(data.company?.slug || "");
      }

      if (errors.length > 0) {
        setError(`Failed to load: ${errors.join(", ")}`);
      }
    } catch (err) {
      console.error("Failed to load lead capture settings:", err);
      setError("Failed to load settings. Please try again.");
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // toast is intentionally excluded - it's a side-effect function that shouldn't trigger re-fetching

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  // Error state - show when all data failed to load
  if (error && domains.length === 0 && keys.length === 0 && forms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Unable to load settings</h3>
        <p className="text-sm text-[var(--muted-foreground)] mb-4">{error}</p>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all",
                active
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)]/50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-6">
        {activeTab === "domains" && (
          <DomainsTab domains={domains} onUpdate={loadData} toast={toast} />
        )}
        {activeTab === "keys" && (
          <KeysTab keys={keys} onUpdate={loadData} toast={toast} />
        )}
        {activeTab === "forms" && (
          <FormsTab forms={forms} onUpdate={loadData} toast={toast} />
        )}
        {activeTab === "embed" && (
          <EmbedTab companySlug={companySlug} forms={forms} toast={toast} />
        )}
      </div>
    </div>
  );
}

// Domains Tab
function DomainsTab({
  domains,
  onUpdate,
  toast,
}: {
  domains: AllowedDomain[];
  onUpdate: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [domainToDelete, setDomainToDelete] = useState<AllowedDomain | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleAdd = async () => {
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/lead-capture/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Domain added" });
        setNewDomain("");
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to add domain",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Request failed", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const requestDelete = (domain: AllowedDomain) => {
    setDomainToDelete(domain);
  };

  const handleDelete = async () => {
    if (!domainToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/lead-capture/domains/${domainToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Domain deleted" });
        onUpdate();
      } else {
        toast({ title: "Error", description: data.error || "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Request failed", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDomainToDelete(null);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/lead-capture/domains/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json();
      if (data.ok) {
        onUpdate();
      }
    } catch {
      toast({ title: "Error", description: "Request failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Allowed Domains</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Only forms submitted from these domains will be accepted. Use *.example.com for subdomains.
        </p>
      </div>

      {/* Add new domain */}
      <div className="flex gap-2">
        <Input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com or *.example.com"
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd} disabled={adding || !newDomain.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Domain
        </Button>
      </div>

      {/* Domain list */}
      {domains.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No domains configured. Add your first domain above.</p>
          <p className="text-xs mt-1">Without domains, forms from any origin will be accepted.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)]"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-[var(--muted-foreground)]" />
                <span className="font-mono text-sm">{domain.domain}</span>
                {domain.isVerified && (
                  <Badge variant="default" className="text-xs">Verified</Badge>
                )}
                {!domain.isActive && (
                  <Badge variant="secondary" className="text-xs">Disabled</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(domain.id, domain.isActive)}
                  className="p-2 rounded hover:bg-[var(--muted)]"
                  title={domain.isActive ? "Disable" : "Enable"}
                >
                  {domain.isActive ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </button>
                <button
                  onClick={() => requestDelete(domain)}
                  className="p-2 rounded hover:bg-[var(--muted)] text-red-500"
                  title="Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(domainToDelete)}
        title="Delete domain?"
        message={domainToDelete ? `This will remove "${domainToDelete.domain}" from the allowed domains list.` : ""}
        confirmLabel="Delete domain"
        onCancel={() => setDomainToDelete(null)}
        onConfirm={handleDelete}
        busy={deleting}
      />
    </div>
  );
}

// Keys Tab
function KeysTab({
  keys,
  onUpdate,
  toast,
}: {
  keys: IntegrationKey[];
  onUpdate: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [newKeyName, setNewKeyName] = useState("");
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<IntegrationKey | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/lead-capture/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewKey(data.secret);
        setNewKeyName("");
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create key",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Request failed", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const requestDelete = (key: IntegrationKey) => {
    setKeyToDelete(key);
  };

  const handleDelete = async () => {
    if (!keyToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/lead-capture/keys/${keyToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Key deleted" });
        onUpdate();
      } else {
        toast({ title: "Error", description: data.error || "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Request failed", variant: "destructive" });
    } finally {
      setDeleting(false);
      setKeyToDelete(null);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/lead-capture/keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json();
      if (data.ok) {
        onUpdate();
      }
    } catch {
      toast({ title: "Error", description: "Request failed", variant: "destructive" });
    }
  };

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">API Keys</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Generate API keys for programmatic access. Keys are shown only once when created.
        </p>
      </div>

      {/* New key display */}
      {newKey && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-600 mb-2">
                Save this key now - it won't be shown again!
              </p>
              <div className="flex gap-2">
                <code className="flex-1 p-2 rounded bg-[var(--muted)] font-mono text-xs break-all">
                  {newKey}
                </code>
                <Button size="sm" variant="outline" onClick={copyKey}>
                  {copiedKey ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => setNewKey(null)}
              >
                I've saved it
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create new key */}
      <div className="flex gap-2">
        <Input
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g., Main Website)"
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button onClick={handleCreate} disabled={adding || !newKeyName.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          Create Key
        </Button>
      </div>

      {/* Key list */}
      {keys.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No API keys created yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)]"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <span className="font-medium">{key.name}</span>
                  {!key.isActive && (
                    <Badge variant="secondary" className="text-xs">Disabled</Badge>
                  )}
                  {key.expiresAt && new Date(key.expiresAt) < new Date() && (
                    <Badge variant="destructive" className="text-xs">Expired</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-[var(--muted-foreground)]">
                  <span className="font-mono">{key.keyPrefix}...</span>
                  <span>Used {key.usageCount} times</span>
                  {key.lastUsedAt && (
                    <span>Last used {new Date(key.lastUsedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(key.id, key.isActive)}
                  className="p-2 rounded hover:bg-[var(--muted)]"
                  title={key.isActive ? "Disable" : "Enable"}
                >
                  {key.isActive ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </button>
                <button
                  onClick={() => requestDelete(key)}
                  className="p-2 rounded hover:bg-[var(--muted)] text-red-500"
                  title="Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(keyToDelete)}
        title="Delete API key?"
        message={keyToDelete ? `This will permanently delete the API key "${keyToDelete.name}". This action cannot be undone.` : ""}
        confirmLabel="Delete key"
        onCancel={() => setKeyToDelete(null)}
        onConfirm={handleDelete}
        busy={deleting}
      />
    </div>
  );
}

// Forms Tab
function FormsTab({
  forms,
  onUpdate,
  toast,
}: {
  forms: FormConfig[];
  onUpdate: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [newFormName, setNewFormName] = useState("");
  const [adding, setAdding] = useState(false);
  const [formToDelete, setFormToDelete] = useState<FormConfig | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleCreate = async () => {
    if (!newFormName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/admin/lead-capture/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFormName }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Form created" });
        setNewFormName("");
        onUpdate();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create form",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Error", description: "Request failed", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const requestDelete = (form: FormConfig) => {
    setFormToDelete(form);
  };

  const handleDelete = async () => {
    if (!formToDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/lead-capture/forms/${formToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Success", description: "Form deleted" });
        onUpdate();
      } else {
        toast({ title: "Error", description: data.message || data.error || "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Request failed", variant: "destructive" });
    } finally {
      setDeleting(false);
      setFormToDelete(null);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/lead-capture/forms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json();
      if (data.ok) {
        onUpdate();
      }
    } catch {
      toast({ title: "Error", description: "Request failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Form Configurations</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Create different form configs for different pages or campaigns with unique settings.
        </p>
      </div>

      {/* Create new form */}
      <div className="flex gap-2">
        <Input
          value={newFormName}
          onChange={(e) => setNewFormName(e.target.value)}
          placeholder="Form name (e.g., Contact Page, Landing Page)"
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />
        <Button onClick={handleCreate} disabled={adding || !newFormName.trim()}>
          <Plus className="w-4 h-4 mr-2" />
          Create Form
        </Button>
      </div>

      {/* Form list */}
      {forms.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No form configurations yet.</p>
          <p className="text-xs mt-1">A default form will be used for submissions without a form slug.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {forms.map((form) => (
            <div
              key={form.id}
              className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)]"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <span className="font-medium">{form.name}</span>
                  {!form.isActive && (
                    <Badge variant="secondary" className="text-xs">Disabled</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-[var(--muted-foreground)]">
                  <span className="font-mono">slug: {form.slug}</span>
                  <span>{form._count?.enquiries || 0} enquiries</span>
                  <span>Required: {form.requiredFields.join(", ")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(form.id, form.isActive)}
                  className="p-2 rounded hover:bg-[var(--muted)]"
                  title={form.isActive ? "Disable" : "Enable"}
                >
                  {form.isActive ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <X className="w-4 h-4 text-red-500" />
                  )}
                </button>
                <button
                  onClick={() => requestDelete(form)}
                  className="p-2 rounded hover:bg-[var(--muted)] text-red-500"
                  title="Delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(formToDelete)}
        title="Delete form configuration?"
        message={formToDelete ? `This will permanently delete the form configuration "${formToDelete.name}".` : ""}
        confirmLabel="Delete form"
        onCancel={() => setFormToDelete(null)}
        onConfirm={handleDelete}
        busy={deleting}
      />
    </div>
  );
}

// Embed Tab
function EmbedTab({
  companySlug,
  forms,
  toast,
}: {
  companySlug: string;
  forms: FormConfig[];
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [selectedForm, setSelectedForm] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const apiEndpoint = companySlug
    ? `${baseUrl}/api/public/tenants/${companySlug}/enquiries`
    : `${baseUrl}/api/public/tenants/YOUR_COMPANY_SLUG/enquiries`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied", description: "Code copied to clipboard" });
  };

  const htmlFormCode = `<!-- Quantract Lead Capture Form -->
<form id="qt-lead-form" onsubmit="submitQtForm(event)">
  <input type="text" name="name" placeholder="Your Name" required />
  <input type="email" name="email" placeholder="Email Address" required />
  <input type="tel" name="phone" placeholder="Phone Number" />
  <textarea name="message" placeholder="Your Message"></textarea>
  <!-- Honeypot - leave hidden -->
  <input type="text" name="_hp" style="display:none" tabindex="-1" autocomplete="off" />
  <button type="submit">Send Enquiry</button>
</form>

<script>
async function submitQtForm(e) {
  e.preventDefault();
  const form = e.target;
  const data = Object.fromEntries(new FormData(form));
  data.pageUrl = window.location.href;
  data.referrer = document.referrer;
  ${selectedForm ? `data.formSlug = "${selectedForm}";` : ""}

  // Get UTM params from URL
  const params = new URLSearchParams(window.location.search);
  ['utmSource', 'utmMedium', 'utmCampaign', 'utmTerm', 'utmContent'].forEach(key => {
    const paramKey = key.replace('utm', 'utm_').toLowerCase();
    if (params.get(paramKey)) data[key] = params.get(paramKey);
  });

  try {
    const res = await fetch("${apiEndpoint}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.ok) {
      alert("Thank you! We'll be in touch soon.");
      form.reset();
    } else {
      alert("Error: " + (result.error || "Please try again"));
    }
  } catch (err) {
    alert("Network error. Please try again.");
  }
}
</script>`;

  const fetchExample = `// JavaScript fetch example
const submitEnquiry = async (formData) => {
  const response = await fetch("${apiEndpoint}", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // For API key auth (optional):
      // "X-QT-Key": "your_api_key",
      // "X-QT-Signature": generateSignature(timestamp, body, keyHash)
    },
    body: JSON.stringify({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      message: formData.message,
      pageUrl: window.location.href,
      referrer: document.referrer,
      ${selectedForm ? `formSlug: "${selectedForm}",` : ""}
    })
  });

  return response.json();
};`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Embed Code</h3>
        <p className="text-sm text-[var(--muted-foreground)]">
          Add lead capture to your website using these code snippets.
        </p>
      </div>

      {/* Form selector */}
      {forms.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-2">Form Configuration (optional)</label>
          <select
            value={selectedForm}
            onChange={(e) => setSelectedForm(e.target.value)}
            className="w-full p-2 rounded-lg border border-[var(--border)] bg-[var(--background)]"
          >
            <option value="">Default (no form config)</option>
            {forms
              .filter((f) => f.isActive)
              .map((form) => (
                <option key={form.id} value={form.slug}>
                  {form.name} ({form.slug})
                </option>
              ))}
          </select>
        </div>
      )}

      {/* API Endpoint */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">API Endpoint</label>
          <button
            onClick={() => copyToClipboard(apiEndpoint, "endpoint")}
            className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            {copied === "endpoint" ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            Copy
          </button>
        </div>
        <code className="block p-3 rounded-lg bg-[var(--muted)] font-mono text-sm break-all">
          POST {apiEndpoint}
        </code>
      </div>

      {/* HTML Form */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">HTML Form Example</label>
          <button
            onClick={() => copyToClipboard(htmlFormCode, "html")}
            className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            {copied === "html" ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            Copy
          </button>
        </div>
        <pre className="p-3 rounded-lg bg-[var(--muted)] font-mono text-xs overflow-x-auto max-h-64 overflow-y-auto">
          {htmlFormCode}
        </pre>
      </div>

      {/* Fetch Example */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">JavaScript Fetch Example</label>
          <button
            onClick={() => copyToClipboard(fetchExample, "fetch")}
            className="text-xs text-[var(--primary)] hover:underline flex items-center gap-1"
          >
            {copied === "fetch" ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            Copy
          </button>
        </div>
        <pre className="p-3 rounded-lg bg-[var(--muted)] font-mono text-xs overflow-x-auto max-h-48 overflow-y-auto">
          {fetchExample}
        </pre>
      </div>

      {/* Test Submission */}
      <div className="pt-4 border-t border-[var(--border)]">
        <h4 className="text-sm font-medium mb-2">Test Your Integration</h4>
        <p className="text-xs text-[var(--muted-foreground)] mb-3">
          Submit a test enquiry to verify everything is working correctly.
        </p>
        <TestSubmissionForm apiEndpoint={apiEndpoint} formSlug={selectedForm} toast={toast} />
      </div>
    </div>
  );
}

// Test Submission Form
function TestSubmissionForm({
  apiEndpoint,
  formSlug,
  toast,
}: {
  apiEndpoint: string;
  formSlug: string;
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [testData, setTestData] = useState({
    name: "Test User",
    email: "test@example.com",
    phone: "07123456789",
    message: "This is a test enquiry from the admin panel.",
  });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testData,
          formSlug: formSlug || undefined,
          pageUrl: window.location.href,
          referrer: "Admin Test Panel",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({
          title: "Test Successful",
          description: `Enquiry created with ID: ${data.enquiryId}`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: data.error || "Unknown error",
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Network Error",
        description: "Failed to connect to API",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)]">
      <div className="grid grid-cols-2 gap-3">
        <Input
          value={testData.name}
          onChange={(e) => setTestData({ ...testData, name: e.target.value })}
          placeholder="Name"
        />
        <Input
          value={testData.email}
          onChange={(e) => setTestData({ ...testData, email: e.target.value })}
          placeholder="Email"
        />
        <Input
          value={testData.phone}
          onChange={(e) => setTestData({ ...testData, phone: e.target.value })}
          placeholder="Phone"
        />
        <Input
          value={testData.message}
          onChange={(e) => setTestData({ ...testData, message: e.target.value })}
          placeholder="Message"
        />
      </div>
      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Mail className="w-4 h-4 mr-2" />
            Send Test Enquiry
          </>
        )}
      </Button>
    </div>
  );
}
