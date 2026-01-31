"use client";

import { useEffect, useState } from "react";

interface Option {
  label: string;
  nextId: string | null;
  answer?: string;
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
  const [loading, setLoading] = useState(true);
  const [callbackSent, setCallbackSent] = useState(false);
  const [callbackLoading, setCallbackLoading] = useState(false);

  async function loadStep(stepId: string) {
    setLoading(true);
    const res = await fetch(`/api/client/troubleshoot?step=${stepId}`);
    const d = await res.json();
    if (d.ok) {
      setCurrent(d.data);
      setAnswer(null);
    }
    setLoading(false);
  }

  useEffect(() => { loadStep("start"); }, []);

  function selectOption(option: Option) {
    if (!current) return;
    if (option.answer) {
      setHistory((h) => [...h, { step: current, selectedLabel: option.label, answer: option.answer }]);
      setAnswer(option.answer);
      setCurrent(null);
    } else if (option.nextId) {
      setHistory((h) => [...h, { step: current, selectedLabel: option.label }]);
      loadStep(option.nextId);
    }
  }

  function restart() {
    setHistory([]);
    setAnswer(null);
    setCallbackSent(false);
    loadStep("start");
  }

  async function requestCallback() {
    setCallbackLoading(true);
    const lastIssue = history.map((h) => `${h.step.question} → ${h.selectedLabel}`).join("; ");
    const res = await fetch("/api/client/troubleshoot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issue: lastIssue }),
    });
    if (res.ok) setCallbackSent(true);
    setCallbackLoading(false);
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-2">Troubleshooter</h1>
      <p className="text-sm text-gray-500 mb-6">
        Answer a few questions and we&apos;ll guide you through common fixes.
      </p>

      {history.length > 0 && (
        <div className="space-y-2 mb-6">
          {history.map((entry, i) => (
            <div key={i} className="border-l-2 border-blue-200 pl-3 py-1">
              <p className="text-xs text-gray-500">{entry.step.question}</p>
              <p className="text-sm font-medium">{entry.selectedLabel}</p>
            </div>
          ))}
        </div>
      )}

      {loading && <p className="text-gray-500">Loading...</p>}

      {!loading && current && (
        <div className="border rounded-lg p-5">
          <h2 className="font-semibold mb-4">{current.question}</h2>
          <div className="space-y-2">
            {current.options.map((option, i) => (
              <button
                key={i}
                onClick={() => selectOption(option)}
                className="w-full text-left px-4 py-3 border rounded-lg hover:bg-blue-50 hover:border-blue-300 text-sm transition-colors"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {answer && (
        <div className="border rounded-lg p-5 bg-green-50 border-green-200">
          <h2 className="font-semibold mb-2 text-green-800">Recommendation</h2>
          <p className="text-sm text-green-900 mb-4">{answer}</p>

          <div className="flex gap-3">
            <button onClick={restart} className="px-4 py-2 text-sm bg-white border rounded hover:bg-gray-50">
              Start Over
            </button>
            {!callbackSent ? (
              <button
                onClick={requestCallback}
                disabled={callbackLoading}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {callbackLoading ? "Sending..." : "Request Callback"}
              </button>
            ) : (
              <span className="px-4 py-2 text-sm text-green-700 font-medium">Callback requested — we&apos;ll be in touch.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
