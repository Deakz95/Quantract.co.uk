"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";
import { FormField, FormInput, FormSelect, FormTextarea, LoadingSpinner } from "@/components/ui/FormField";
import { useFormValidation, type ValidationSchema } from "@/hooks/useFormValidation";
import { apiRequest, getApiErrorMessage, requireOk } from "@/lib/apiClient";

type Job = { id: string };
type Client = { id: string; name: string; email: string };
type QuoteOption = { id: string; quoteNumber?: string; clientName: string; clientEmail: string; status: string; total: number };

// Validation schema for manual job creation
const manualJobValidationSchema: ValidationSchema = {
  clientId: { required: "Client is required" },
  title: { required: "Job title is required" },
};

export default function AdminJobNewPage() {
  const router = useRouter();
  const { toast } = useToast();

  // From quote
  const [quoteId, setQuoteId] = useState("");
  const [quoteSearch, setQuoteSearch] = useState("");
  const [quoteOptions, setQuoteOptions] = useState<QuoteOption[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [showQuoteDropdown, setShowQuoteDropdown] = useState(false);
  const selectedQuote = quoteOptions.find((q) => q.id === quoteId);

  // Manual creation
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [siteAddress, setSiteAddress] = useState("");

  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"quote" | "manual">("quote");

  // Form validation for manual mode
  const { errors, touched, validateField, validateAll, setFieldTouched, clearErrors } = useFormValidation<{ clientId: string; title: string }>(manualJobValidationSchema);

  const loadClients = useCallback(async () => {
    try {
      const data = await apiRequest<{ ok: boolean; clients: Client[] }>("/api/admin/clients", { cache: "no-store" });
      if (data.ok && Array.isArray(data.clients)) {
        setClients(data.clients);
      }
    } catch (error) {
      console.error("Failed to load clients:", error);
    }
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  // Load quotes for searchable selector
  useEffect(() => {
    const timer = setTimeout(async () => {
      setQuotesLoading(true);
      try {
        const r = await fetch(`/api/admin/quotes/lookup?query=${encodeURIComponent(quoteSearch)}`);
        const d = await r.json();
        if (d.ok) setQuoteOptions(d.quotes);
      } catch { /* ignore */ }
      setQuotesLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [quoteSearch]);

  // Reset validation when switching modes
  useEffect(() => {
    clearErrors();
  }, [mode, clearErrors]);

  const handleBlur = useCallback(
    (field: "clientId" | "title") => {
      setFieldTouched(field);
      if (field === "clientId") {
        validateField(field, selectedClientId);
      } else if (field === "title") {
        validateField(field, title);
      }
    },
    [selectedClientId, title, setFieldTouched, validateField]
  );

  // Check if manual form is valid for submission
  const canSubmitManual = useMemo(() => {
    return Boolean(selectedClientId && title.trim());
  }, [selectedClientId, title]);

  // Check if quote form is valid for submission
  const canSubmitQuote = useMemo(() => {
    return Boolean(quoteId.trim());
  }, [quoteId]);

  async function createFromQuote() {
    const nextQuote = quoteId.trim();
    if (!nextQuote) {
      toast({ title: "Missing quote", description: "Enter a quote ID to create a job.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const data = await apiRequest<{ ok: boolean; job: Job; error?: string }>("/api/admin/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quoteId: nextQuote }),
      });
      requireOk(data);
      toast({ title: "Job created", description: "Job created from quote.", variant: "success" });
      router.push(`/admin/jobs/${data.job.id}`);
    } catch (error) {
      toast({ title: "Could not create job", description: getApiErrorMessage(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function createManual() {
    const formIsValid = validateAll({ clientId: selectedClientId, title });
    if (!formIsValid) {
      toast({ title: "Please fix the errors before submitting", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const data = await apiRequest<{ ok: boolean; job: Job; error?: string }>("/api/admin/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          title: title.trim(),
          description: description.trim() || undefined,
          siteAddress: siteAddress.trim() || undefined,
          manual: true,
        }),
      });
      requireOk(data);
      toast({ title: "Job created", description: "Manual job created.", variant: "success" });
      router.push(`/admin/jobs/${data.job.id}`);
    } catch (error) {
      toast({ title: "Could not create job", description: getApiErrorMessage(error), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role="admin" title="Create job" subtitle="Create a job from a quote or manually." hideNav>
      <div className="mx-auto grid max-w-2xl gap-6">
        {/* Mode selector */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "quote" ? "default" : "secondary"}
            onClick={() => setMode("quote")}
          >
            From Quote
          </Button>
          <Button
            type="button"
            variant={mode === "manual" ? "default" : "secondary"}
            onClick={() => setMode("manual")}
          >
            Manual Job
          </Button>
        </div>

        {mode === "quote" ? (
          <Card>
            <CardHeader>
              <CardTitle>Create from quote</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <FormField label="Select Quote" htmlFor="job-quoteSearch">
                  <div className="relative">
                    <FormInput
                      id="job-quoteSearch"
                      className="h-11"
                      placeholder="Search by client name, email, or quote number…"
                      value={selectedQuote ? `${selectedQuote.quoteNumber || "Quote"} — ${selectedQuote.clientName}` : quoteSearch}
                      onChange={(e) => { setQuoteSearch(e.target.value); setQuoteId(""); setShowQuoteDropdown(true); }}
                      onFocus={() => setShowQuoteDropdown(true)}
                    />
                    {showQuoteDropdown && !quoteId && (
                      <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-lg">
                        {quotesLoading ? (
                          <div className="px-4 py-3 text-sm text-[var(--muted-foreground)]">Searching…</div>
                        ) : quoteOptions.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-[var(--muted-foreground)]">No quotes found</div>
                        ) : (
                          quoteOptions.map((q) => (
                            <button
                              key={q.id}
                              type="button"
                              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:bg-[var(--muted)] border-b border-[var(--border)] last:border-0"
                              onClick={() => { setQuoteId(q.id); setShowQuoteDropdown(false); }}
                            >
                              <div>
                                <div className="font-medium text-[var(--foreground)]">{q.quoteNumber || "Draft"} — {q.clientName}</div>
                                <div className="text-xs text-[var(--muted-foreground)]">{q.clientEmail}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-medium text-[var(--foreground)]">£{q.total.toFixed(2)}</div>
                                <div className="text-xs text-[var(--muted-foreground)]">{q.status}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </FormField>

                {selectedQuote && (
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-3 text-xs text-[var(--muted-foreground)]">
                    Selected: {selectedQuote.quoteNumber || "Quote"} • {selectedQuote.clientName} • £{selectedQuote.total.toFixed(2)} • {selectedQuote.status}
                  </div>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => router.push("/admin/jobs")}>Back</Button>
                  <Button type="button" onClick={createFromQuote} disabled={busy || !canSubmitQuote}>
                    {busy ? (
                      <>
                        <LoadingSpinner className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create job"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Create manual job</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                <FormField
                  label="Client"
                  required
                  error={errors.clientId}
                  touched={touched.clientId}
                  htmlFor="job-clientId"
                >
                  <FormSelect
                    id="job-clientId"
                    className="h-11"
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    onBlur={() => handleBlur("clientId")}
                    hasError={Boolean(errors.clientId && touched.clientId)}
                  >
                    <option value="" className="text-[var(--muted-foreground)]">Select a client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </FormSelect>
                </FormField>

                <FormField
                  label="Job Title"
                  required
                  error={errors.title}
                  touched={touched.title}
                  htmlFor="job-title"
                >
                  <FormInput
                    id="job-title"
                    className="h-11"
                    placeholder="e.g. Kitchen rewire"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={() => handleBlur("title")}
                    hasError={Boolean(errors.title && touched.title)}
                  />
                </FormField>

                <FormField label="Site Address" htmlFor="job-siteAddress">
                  <FormInput
                    id="job-siteAddress"
                    className="h-11"
                    placeholder="e.g. 10 Downing Street, London"
                    value={siteAddress}
                    onChange={(e) => setSiteAddress(e.target.value)}
                  />
                </FormField>

                <FormField label="Description" htmlFor="job-description">
                  <FormTextarea
                    id="job-description"
                    placeholder="Job details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </FormField>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => router.push("/admin/jobs")}>Back</Button>
                  <Button type="button" onClick={createManual} disabled={busy || !canSubmitManual}>
                    {busy ? (
                      <>
                        <LoadingSpinner className="mr-2" />
                        Creating...
                      </>
                    ) : (
                      "Create job"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>What happens next</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-[var(--foreground)]">
              <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">Assign an engineer & schedule the job.</li>
              <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">Track costs & time as work progresses.</li>
              <li className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3">Issue staged invoices from the job page.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
