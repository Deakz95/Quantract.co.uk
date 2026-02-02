"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/useToast";

interface LineItem {
  description: string;
  qty: number;
  unit: string;
  labourHours: number;
  materialCost: number;
  labourCost: number;
}

interface Estimate {
  summary: string;
  imageSummary?: string;
  tradeCategory?: string;
  lineItems: LineItem[];
  totalMaterialCost: number;
  totalLabourCost: number;
  totalCost: number;
  totalHours: number;
  confidence: string;
  assumptions: string[];
  caveats: string[];
}

export default function AiEstimatorPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [estimateId, setEstimateId] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Speech-to-text
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      setSpeechSupported(true);
      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = "en-GB";
      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setDescription((prev) => (prev ? prev + " " : "") + transcript.trim());
        }
      };
      recognition.onerror = () => setListening(false);
      recognition.onend = () => setListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  function toggleMic() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!description.trim() && !imageBase64) return;
    setLoading(true);
    setEstimate(null);
    setEstimateId(null);
    setRawText(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/ai/estimate-from-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim() || undefined,
          imageBase64: imageBase64 || undefined,
        }),
      });
      const d = await res.json();
      if (!d.ok) {
        setError(d.error || "Failed");
        return;
      }
      if (d.data.parsed) {
        setEstimate(d.data.estimate);
        setEstimateId(d.data.estimateId || null);
      } else {
        setRawText(d.data.raw);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function convertToQuote() {
    if (!estimateId) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/admin/ai/estimates/${estimateId}/convert-to-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const d = await res.json();
      if (!d.ok) {
        toast({ title: "Could not create quote", description: d.error, variant: "destructive" });
        return;
      }
      toast({ title: "Draft quote created", variant: "success" });
      router.push(`/admin/quotes/${d.quoteId}`);
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setConverting(false);
    }
  }

  const CONFIDENCE_STYLES: Record<string, string> = {
    high: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    low: "bg-red-100 text-red-800",
  };

  return (
    <AppShell role="admin" title="AI Job Estimator">
      <div className="mx-auto max-w-4xl space-y-6">
        <p className="text-sm text-[var(--muted-foreground)]">
          Describe a job or upload a photo to get a rough cost and time estimate. Estimates are AI-generated and should be verified.
        </p>

        <div className="space-y-4">
          <div className="relative">
            <textarea
              placeholder="Describe the job... e.g. 'Full rewire of 3-bed semi, consumer unit upgrade, 12 double sockets, 8 lighting points'"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm pr-12"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={toggleMic}
                className={`absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  listening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)]"
                }`}
                title={listening ? "Stop listening" : "Dictate job description"}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              {imagePreview ? "Change photo" : "Upload photo (optional)"}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            {imagePreview ? (
              <button type="button" onClick={() => { setImagePreview(null); setImageBase64(null); }} className="min-h-[44px] px-2 text-xs text-red-500 hover:text-red-700 transition-colors">
                Remove
              </button>
            ) : (
              <span className="text-xs text-[var(--muted-foreground)]">No file selected</span>
            )}
          </div>

          {imagePreview && (
            <img src={imagePreview} alt="Preview" className="max-h-48 rounded-xl border border-[var(--border)]" />
          )}

          <Button
            type="button"
            onClick={submit}
            disabled={loading || (!description.trim() && !imageBase64)}
            className="min-h-[44px]"
          >
            {loading ? "Estimating..." : "Get Estimate"}
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {rawText && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
            <h2 className="font-semibold text-[var(--foreground)] mb-2">AI Response</h2>
            <pre className="text-sm whitespace-pre-wrap text-[var(--muted-foreground)]">{rawText}</pre>
          </div>
        )}

        {estimate && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-[var(--foreground)]">Estimate</h2>
                <div className="flex items-center gap-2">
                  {estimate.tradeCategory && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
                      {estimate.tradeCategory}
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${CONFIDENCE_STYLES[estimate.confidence] || "bg-gray-100"}`}>
                    {estimate.confidence} confidence
                  </span>
                </div>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">{estimate.summary}</p>

              {estimate.imageSummary && (
                <div className="mb-4 rounded-xl bg-[var(--muted)] p-3">
                  <p className="text-xs font-semibold text-[var(--muted-foreground)] mb-1">Photo Analysis</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{estimate.imageSummary}</p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse mb-4">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                      <th className="py-2 pr-2">Item</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Labour</th>
                      <th className="py-2 text-right">Materials</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.lineItems.map((item, i) => (
                      <tr key={i} className="border-b border-[var(--border)]">
                        <td className="py-2 pr-2 text-[var(--foreground)]">{item.description}</td>
                        <td className="py-2 text-right text-[var(--muted-foreground)]">{item.qty} {item.unit}</td>
                        <td className="py-2 text-right text-[var(--muted-foreground)]">{"\u00A3"}{item.labourCost}</td>
                        <td className="py-2 text-right text-[var(--muted-foreground)]">{"\u00A3"}{item.materialCost}</td>
                        <td className="py-2 text-right font-medium text-[var(--foreground)]">{"\u00A3"}{item.labourCost + item.materialCost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center border-t border-[var(--border)] pt-3">
                <div>
                  <div className="text-lg font-bold text-[var(--foreground)]">{"\u00A3"}{estimate.totalCost}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Total Cost</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--foreground)]">{estimate.totalHours}h</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Total Hours</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[var(--foreground)]">{"\u00A3"}{estimate.totalMaterialCost}</div>
                  <div className="text-xs text-[var(--muted-foreground)]">Materials</div>
                </div>
              </div>
            </div>

            {/* Send to Quote button */}
            {estimateId && (
              <Button
                type="button"
                onClick={convertToQuote}
                disabled={converting}
                className="min-h-[44px] w-full sm:w-auto"
              >
                {converting ? "Creating quote..." : "Send to Quote"}
              </Button>
            )}

            {estimate.assumptions.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-semibold text-amber-800 mb-1">Assumptions</h3>
                <ul className="text-xs text-amber-700 list-disc pl-4">
                  {estimate.assumptions.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              </div>
            )}

            {estimate.caveats.length > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-1">Caveats</h3>
                <ul className="text-xs text-red-700 list-disc pl-4">
                  {estimate.caveats.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
