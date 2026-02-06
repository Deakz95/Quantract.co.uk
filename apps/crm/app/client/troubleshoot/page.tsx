"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ArrowLeft, Phone, RefreshCw, AlertTriangle } from "lucide-react";

interface Option {
  label: string;
  nextId: string | null;
  answer?: string;
  urgent?: boolean;
}

interface Step {
  id: string;
  question: string;
  options: Option[];
}

interface HistoryEntry {
  step: Step;
  selectedLabel: string;
  answer?: string;
}

export default function TroubleshootPage() {
  const [current, setCurrent] = useState<Step | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [answer, setAnswer] = useState<string | null>(null);
  const [answerUrgent, setAnswerUrgent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [callbackSent, setCallbackSent] = useState(false);
  const [callbackLoading, setCallbackLoading] = useState(false);

  async function loadStep(stepId: string) {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await fetch(`/api/client/troubleshoot?step=${stepId}`);
      const d = await res.json();
      if (d.ok) {
        setCurrent(d.data);
        setAnswer(null);
        setAnswerUrgent(false);
      } else {
        setFetchError(true);
      }
    } catch {
      setFetchError(true);
    }
    setLoading(false);
  }

  useEffect(() => { loadStep("start"); }, []);

  function selectOption(option: Option) {
    if (!current) return;
    if (option.answer) {
      setHistory((h) => [...h, { step: current, selectedLabel: option.label, answer: option.answer }]);
      setAnswer(option.answer);
      setAnswerUrgent(!!option.urgent);
      setCurrent(null);
    } else if (option.nextId) {
      setHistory((h) => [...h, { step: current, selectedLabel: option.label }]);
      loadStep(option.nextId);
    }
  }

  function restart() {
    setHistory([]);
    setAnswer(null);
    setAnswerUrgent(false);
    setCallbackSent(false);
    loadStep("start");
  }

  async function requestCallback() {
    if (callbackLoading) return;
    setCallbackLoading(true);
    try {
      const lastIssue = history.map((h) => `${h.step.question} → ${h.selectedLabel}`).join("; ");
      const res = await fetch("/api/client/troubleshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue: lastIssue }),
      });
      if (res.ok) setCallbackSent(true);
    } catch {
      // silently fail — callback is best-effort
    }
    setCallbackLoading(false);
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-4">
      <Breadcrumbs />

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Troubleshooter</CardTitle>
              <div className="mt-1 text-xs text-[var(--muted-foreground)]">
                Answer a few questions and we&rsquo;ll guide you through common fixes.
              </div>
            </div>
            <Link href="/client">
              <Button type="button" variant="secondary" className="h-9 gap-1.5">
                <ArrowLeft size={14} strokeWidth={1.8} />
                Back to hub
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent>
          {/* History trail */}
          {history.length > 0 && (
            <div className="space-y-2 mb-6">
              {history.map((entry, i) => (
                <div key={i} className="border-l-2 border-[var(--border)] pl-3 py-1">
                  <p className="text-xs text-[var(--muted-foreground)]">{entry.step.question}</p>
                  <p className="text-sm font-medium text-[var(--foreground)]">{entry.selectedLabel}</p>
                </div>
              ))}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <p className="text-sm text-[var(--muted-foreground)]">Loading&hellip;</p>
          )}

          {/* Fetch error */}
          {!loading && fetchError && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-5 text-center space-y-3">
              <p className="text-sm font-medium text-[var(--foreground)]">Couldn&rsquo;t load this step</p>
              <p className="text-xs text-[var(--muted-foreground)]">Check your connection and try again, or contact the office directly.</p>
              <div className="flex justify-center gap-2">
                <Button type="button" variant="secondary" onClick={restart} className="h-9 gap-1.5">
                  <RefreshCw size={14} strokeWidth={1.8} />
                  Start over
                </Button>
              </div>
            </div>
          )}

          {/* Current question */}
          {!loading && !fetchError && current && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-5">
              <h2 className="text-sm font-semibold text-[var(--foreground)] mb-4">{current.question}</h2>
              <div className="space-y-2">
                {current.options.map((option, i) => (
                  <button
                    key={i}
                    onClick={() => selectOption(option)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-[var(--border)] hover:bg-[var(--muted)] text-sm text-[var(--foreground)] transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Answer / recommendation */}
          {answer && (
            <div className={`rounded-2xl border p-5 space-y-4 ${answerUrgent ? "border-amber-300 bg-amber-50" : "border-green-200 bg-green-50"}`}>
              <div>
                <h2 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${answerUrgent ? "text-amber-900" : "text-green-900"}`}>
                  {answerUrgent && <AlertTriangle size={16} strokeWidth={2} className="text-amber-600 shrink-0" />}
                  {answerUrgent ? "Urgent — action needed" : "Recommendation"}
                </h2>
                <p className={`text-sm ${answerUrgent ? "text-amber-800" : "text-green-800"}`}>{answer}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={restart} className="h-9 gap-1.5">
                  <RefreshCw size={14} strokeWidth={1.8} />
                  Start over
                </Button>
                {!callbackSent ? (
                  <Button
                    type="button"
                    onClick={requestCallback}
                    disabled={callbackLoading}
                    className="h-9 gap-1.5"
                  >
                    <Phone size={14} strokeWidth={1.8} />
                    {callbackLoading ? "Sending\u2026" : "Request callback"}
                  </Button>
                ) : (
                  <span className={`inline-flex items-center px-3 py-1.5 text-xs font-medium ${answerUrgent ? "text-amber-700" : "text-green-700"}`}>
                    Callback requested — we&rsquo;ll be in touch.
                  </span>
                )}
                <Link href="/client">
                  <Button type="button" variant="secondary" className="h-9 gap-1.5">
                    <ArrowLeft size={14} strokeWidth={1.8} />
                    Back to hub
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Always-visible contact fallback */}
          <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4 text-center">
            <p className="text-xs text-[var(--muted-foreground)]">
              Still stuck? Contact the office directly and we&rsquo;ll sort it out.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
