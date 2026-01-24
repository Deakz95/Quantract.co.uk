"use client";

import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SUGGESTIONS: { title: string; prompt: string }[] = [
  { title: "Overdue invoices", prompt: "Which invoices are overdue and need chasing today?" },
  { title: "Job blockers", prompt: "What jobs are blocked right now and why?" },
  { title: "Profit risk", prompt: "Which jobs are at risk on margin this week?" },
  { title: "Quick summary", prompt: "Summarise admin activity in the last 7 days." },
];

function openAI() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("qt:open-ai"));
  }
}

export default function AdminAIPage() {
  return (
    <AppShell role="admin" title="AI assistant" subtitle="Ask questions, generate drafts, and get quick answers." >
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Assistant</CardTitle>
                <Button type="button" onClick={openAI}>
                  Open assistant
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-600">
                The assistant opens in the bottom-right. It can read your workspace data via the app APIs and will cite sources where possible.
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => {
                      openAI();
                      navigator.clipboard?.writeText?.(s.prompt).catch(() => null);
                    }}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-900">{s.title}</div>
                      <Badge>Try</Badge>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">{s.prompt}</div>
                    <div className="mt-3 text-[11px] text-slate-500">Tip: prompt copied to clipboard.</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Best results</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm text-slate-700">
                <li className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">Be specific</div>
                  <div className="mt-1 text-xs text-slate-600">Include job ID, client name/email, or date ranges when possible.</div>
                </li>
                <li className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">Ask for outputs</div>
                  <div className="mt-1 text-xs text-slate-600">Example: “Draft a payment chaser email for invoice INV-102.”</div>
                </li>
                <li className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">Sanity-check actions</div>
                  <div className="mt-1 text-xs text-slate-600">You stay in control—use it for summaries, drafts and insights.</div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
