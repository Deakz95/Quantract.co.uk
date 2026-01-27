"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import LineItemsEditor, { LineItem } from "@/components/shared/LineItemsEditor";
import { FormField, FormInput, FormSelect, FormTextarea, LoadingSpinner } from "@/components/ui/FormField";
import { useFormValidation, type ValidationSchema } from "@/hooks/useFormValidation";

type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

type Site = {
  id: string;
  clientId: string;
  name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  county?: string;
  postcode?: string;
  country?: string;
};

type Quote = {
  id: string;
  clientName?: string;
  clientEmail?: string;
  siteAddress?: string;
  status?: string;
  subtotal?: number;
  vat?: number;
  total?: number;
  notes?: string;
  items?: LineItem[];
  createdAtISO?: string;
};

function displayAddress(c: Client) {
  return [c.address1, c.address2, c.city, c.county, c.postcode, c.country].filter(Boolean).join(", ");
}

export default function QuoteCreateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"new" | "edit">("new");
  const [fromPointCounter, setFromPointCounter] = useState(false);

  // Existing quotes for edit mode
  const [existingQuotes, setExistingQuotes] = useState<Quote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState("");

  // Client and site selection
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [sites, setSites] = useState<Site[]>([]);
  const [siteId, setSiteId] = useState<string>("");

  // Form fields
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", qty: 1, unitPrice: 0 }]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Templates
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // Validation schema for quote form
  const validationSchema: ValidationSchema = useMemo(() => ({
    clientId: { required: "Client is required" },
    clientName: { required: "Client name is required" },
  }), []);

  const { errors: validationErrors, touched, validateField, validateAll, setFieldTouched, clearErrors } = useFormValidation<{ clientId: string; clientName: string }>(validationSchema);

  const handleBlur = useCallback(
    (field: "clientId" | "clientName") => {
      setFieldTouched(field);
      if (field === "clientId") {
        validateField(field, clientId);
      } else if (field === "clientName") {
        validateField(field, clientName);
      }
    },
    [clientId, clientName, setFieldTouched, validateField]
  );

  // Check if form is valid for submission
  const canSubmit = useMemo(() => {
    const name = clientName.trim();
    const validItems = items.filter((x) => x.description.trim().length);
    // Client name required, at least one line item
    return Boolean(name && validItems.length > 0);
  }, [clientName, items]);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/clients", { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setClients(data.clients as Client[]);
    } catch {
      // ignore
    }
  }, []);

  const loadQuotes = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/quotes", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.quotes)) {
        // Only show draft quotes for editing
        setExistingQuotes(data.quotes.filter((q: Quote) => q.status === "draft" || !q.status));
      }
    } catch {
      // ignore
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/quote-templates", { cache: "no-store" });
      const data = await res.json();
      if (data.ok && Array.isArray(data.templates)) {
        setTemplates(data.templates);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadSites = useCallback(async (forClientId: string) => {
    if (!forClientId) {
      setSites([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/sites?clientId=${encodeURIComponent(forClientId)}`, { cache: "no-store" });
      const data = await res.json();
      if (data.ok) setSites(Array.isArray(data.sites) ? (data.sites as Site[]) : []);
    } catch {
      setSites([]);
    }
  }, []);

  useEffect(() => {
    loadClients();
    loadQuotes();
    loadTemplates();
  }, [loadClients, loadQuotes, loadTemplates]);

  // Handle incoming data from Point Counter tool
  useEffect(() => {
    const from = searchParams.get("from");
    const itemsParam = searchParams.get("items");
    const source = searchParams.get("source");

    if (from === "point-counter" && itemsParam) {
      setFromPointCounter(true);

      // Parse items: "Socket Outlet:5,Light Point:10,..."
      const parsedItems: LineItem[] = itemsParam.split(",").map((itemStr: string) => {
        const [name, count] = itemStr.split(":");
        return {
          description: decodeURIComponent(name || ""),
          qty: parseInt(count, 10) || 1,
          unitPrice: 0, // User will fill in prices
        };
      }).filter((item: LineItem) => item.description && item.qty > 0);

      if (parsedItems.length > 0) {
        setItems(parsedItems);

        // Add source as note
        if (source) {
          setNotes(`Point count from: ${decodeURIComponent(source)}\n\nPlease add your prices per point above.`);
        }

        toast({
          title: "Points imported",
          description: `${parsedItems.length} point types imported from Point Counter. Add your prices below.`,
          variant: "success",
        });
      }
    }
  }, [searchParams, toast]);

  // Handle template selection
  useEffect(() => {
    if (!selectedTemplateId) return;
    const template = templates.find((t) => t.id === selectedTemplateId);
    if (!template) return;

    setItems(template.items || [{ description: "", qty: 1, unitPrice: 0 }]);
    if (template.notes) setNotes(template.notes);

    toast({
      title: "Template loaded",
      description: `Applied "${template.name}" template`,
      variant: "success",
    });
  }, [selectedTemplateId, templates, toast]);

  useEffect(() => {
    setSiteId("");
    loadSites(clientId);
    if (!clientId) return;
    const c = clients.find((x) => x.id === clientId);
    if (!c) return;
    setClientName((prev) => (prev.trim().length ? prev : c.name));
    setClientEmail((prev) => (prev.trim().length ? prev : c.email));
    setSiteAddress((prev) => (prev.trim().length ? prev : displayAddress(c)));
  }, [clientId, clients, loadSites]);

  useEffect(() => {
    if (!siteId) return;
    const s = sites.find((x) => x.id === siteId);
    if (!s) return;
    const addr = [s.address1, s.address2, s.city, s.county, s.postcode, s.country].filter(Boolean).join(", ");
    if (addr) setSiteAddress(addr);
  }, [siteId, sites]);

  // Load quote data when selecting an existing quote
  useEffect(() => {
    if (!selectedQuoteId) {
      // Reset form
      setClientName("");
      setClientEmail("");
      setSiteAddress("");
      setNotes("");
      setItems([{ description: "", qty: 1, unitPrice: 0 }]);
      return;
    }

    async function loadQuote() {
      try {
        const res = await fetch(`/api/admin/quotes/${selectedQuoteId}`, { cache: "no-store" });
        const data = await res.json();
        if (data.ok && data.quote) {
          const q = data.quote;
          setClientName(q.clientName || "");
          setClientEmail(q.clientEmail || "");
          setSiteAddress(q.siteAddress || "");
          setNotes(q.notes || "");
          if (q.items && q.items.length > 0) {
            setItems(q.items.map((item: any) => ({
              description: item.description || "",
              qty: item.qty || item.quantity || 1,
              unitPrice: item.unitPrice || 0,
            })));
          }
        }
      } catch (err) {
        console.error("Could not load quote:", err);
      }
    }
    loadQuote();
  }, [selectedQuoteId]);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!clientName.trim()) {
      newErrors.clientName = "Client name is required";
    }

    const validItems = items.filter((x) => x.description.trim().length);
    if (validItems.length === 0) {
      newErrors.items = "At least one line item is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function create() {
    if (!validate()) {
      toast({
        title: "Validation errors",
        description: "Please fix the errors below before saving",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const endpoint = mode === "edit" && selectedQuoteId
        ? `/api/admin/quotes/${selectedQuoteId}`
        : "/api/admin/quotes";
      const method = mode === "edit" && selectedQuoteId ? "PATCH" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: clientId || undefined,
          siteId: siteId || undefined,
          clientName,
          clientEmail,
          siteAddress,
          notes,
          items: items.filter((x) => x.description.trim().length),
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Save failed");

      toast({ title: mode === "edit" ? "Quote updated" : "Quote created", description: "Opening quote…" });
      router.push(`/admin/quotes/${data.quote.id}`);
    } catch (e: any) {
      toast({ title: "Couldn't save quote", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role="admin" title={mode === "edit" ? "Edit Quote" : "Create Quote"} subtitle={mode === "edit" ? "Modify an existing quote" : "Create a new quote for a client"}>
      <div className="mx-auto max-w-4xl">
        {/* Mode selector */}
        <div className="flex gap-2 mb-6">
          <Button
            type="button"
            variant={mode === "new" ? "default" : "secondary"}
            onClick={() => { setMode("new"); setSelectedQuoteId(""); }}
          >
            New Quote
          </Button>
          <Button
            type="button"
            variant={mode === "edit" ? "default" : "secondary"}
            onClick={() => setMode("edit")}
          >
            Edit Existing
          </Button>
        </div>

        {fromPointCounter && (
          <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <div className="font-semibold text-blue-400">Imported from Point Counter</div>
                <div className="text-sm text-[var(--muted-foreground)]">Your point counts have been added below. Set your prices per point to complete the quote.</div>
              </div>
            </div>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{mode === "edit" ? "Edit existing quote" : "Create new quote"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {mode === "edit" && (
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Select quote to edit</span>
                  <select
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)]"
                    value={selectedQuoteId}
                    onChange={(e) => setSelectedQuoteId(e.target.value)}
                  >
                    <option value="">— Select a quote —</option>
                    {existingQuotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.clientName || q.clientEmail || "Unknown"} - £{(q.total || 0).toFixed(2)} ({new Date(q.createdAtISO || "").toLocaleDateString("en-GB")})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {mode === "new" && templates.length > 0 && (
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                    Use template (optional)
                  </span>
                  <select
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)]"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    <option value="">— Start from scratch —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.category ? `(${t.category})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {mode === "new" && (
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                    Select existing client (autofills details below)
                  </span>
                  <select
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-medium text-[var(--foreground)]"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  >
                    <option value="">— Select a client or enter manually —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {clientId && mode === "new" && (
                <label className="grid gap-1">
                  <span className="text-xs font-semibold text-[var(--muted-foreground)]">Select site (optional)</span>
                  <select
                    className="rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm text-[var(--foreground)]"
                    value={siteId}
                    onChange={(e) => setSiteId(e.target.value)}
                  >
                    <option value="">— Use manual address / create later —</option>
                    {sites.map((s) => {
                      const addr = [s.address1, s.address2, s.city, s.county, s.postcode, s.country].filter(Boolean).join(", ");
                      const label = s.name ? `${s.name} — ${addr}` : addr || s.id;
                      return (
                        <option key={s.id} value={s.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </label>
              )}

              <FormField
                label="Client name"
                required
                error={errors.clientName}
                touched={true}
                htmlFor="quote-clientName"
              >
                <FormInput
                  id="quote-clientName"
                  className="py-3"
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    if (errors.clientName) {
                      setErrors((prev) => ({ ...prev, clientName: "" }));
                    }
                  }}
                  onBlur={() => handleBlur("clientName")}
                  placeholder="e.g. Jane Smith"
                  hasError={Boolean(errors.clientName)}
                />
              </FormField>

              <FormField
                label="Client email"
                htmlFor="quote-clientEmail"
              >
                <FormInput
                  id="quote-clientEmail"
                  type="email"
                  className="py-3"
                  value={clientEmail}
                  onChange={(e) => {
                    setClientEmail(e.target.value);
                  }}
                  placeholder="e.g. jane@email.com"
                />
              </FormField>

              <FormField label="Site address (optional)" htmlFor="quote-siteAddress">
                <FormInput
                  id="quote-siteAddress"
                  className="py-3"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  disabled={!!siteId}
                  placeholder="e.g. 10 Downing Street, London"
                />
              </FormField>

              <div className="grid gap-2">
                <div className="text-xs font-semibold text-[var(--muted-foreground)]">
                  Line items <span className="text-red-500">*</span>
                </div>
                <LineItemsEditor
                  items={items}
                  setItems={(newItems) => {
                    setItems(newItems);
                    if (errors.items) {
                      setErrors((prev) => ({ ...prev, items: "" }));
                    }
                  }}
                  showTotals
                />
                {errors.items && (
                  <span className="text-xs text-red-600">{errors.items}</span>
                )}
              </div>

              <FormField label="Notes (optional)" htmlFor="quote-notes">
                <FormTextarea
                  id="quote-notes"
                  className="min-h-[100px] py-3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any assumptions / exclusions / access notes..."
                />
              </FormField>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => router.push("/admin/quotes")}>
                  Back
                </Button>
                <Button type="button" onClick={create} disabled={busy || !canSubmit}>
                  {busy ? (
                    <>
                      <LoadingSpinner className="mr-2" />
                      Saving...
                    </>
                  ) : mode === "edit" ? (
                    "Update quote"
                  ) : (
                    "Create quote"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
