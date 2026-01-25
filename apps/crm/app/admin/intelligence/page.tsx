"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const blocks = [
  {
    title: "Job margin widgets",
    description: "Spot profit risk at a glance — budget vs actual vs forecast.",
    cta: "Open profitability report",
    href: "/admin/reports/profitability",
  },
  {
    title: "Cost-to-complete",
    description: "Estimate remaining cost based on rates, planned hours, and open POs.",
    cta: "Wireframe",
    href: "#cost-to-complete",
  },
  {
    title: "Live forecasts",
    description: "Forecast revenue and margin for the next 7/30/90 days.",
    cta: "Wireframe",
    href: "#forecasts",
  },
  {
    title: "Monthly expense report",
    description: "Track labour, materials, and subcontract costs by month.",
    cta: "Wireframe",
    href: "#expenses",
  },
];

export default function AdminIntelligencePage() {
  return (
    <AppShell role="admin" title="Intelligence" subtitle="Profit, forecasts, and cost control (wireframed).">
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle>Widgets</CardTitle>
                <Badge>Phase 3</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {blocks.map((b) => (
                  <div key={b.title} className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-sm">
                    <div className="text-sm font-semibold text-[var(--foreground)]">{b.title}</div>
                    <div className="mt-1 text-xs text-[var(--muted-foreground)]">{b.description}</div>
                    <div className="mt-4">
                      {b.href.startsWith("/") ? (
                        <Link href={b.href}>
                          <Button type="button" variant="secondary">{b.cta}</Button>
                        </Link>
                      ) : (
                        <Button type="button" variant="secondary" onClick={() => document.getElementById(b.href.slice(1))?.scrollIntoView({ behavior: "smooth" })}>
                          {b.cta}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-5">
          <Card>
            <CardHeader>
              <CardTitle>Wireframes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <section id="cost-to-complete" className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--foreground)]">Cost-to-complete</div>
                    <Badge>Coming next</Badge>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <div className="h-10 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                    <div className="h-24 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                    <div className="h-16 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                  </div>
                  <div className="mt-3 text-xs text-[var(--muted-foreground)]">Hook: rates + remaining hours + open costs → projected completion cost.</div>
                </section>

                <section id="forecasts" className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--foreground)]">Live forecasts</div>
                    <Badge>Wireframe</Badge>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <div className="h-28 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                    <div className="h-10 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                  </div>
                  <div className="mt-3 text-xs text-[var(--muted-foreground)]">Shows next 7/30/90 day revenue + margin based on scheduled jobs and stage invoices.</div>
                </section>

                <section id="expenses" className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[var(--foreground)]">Monthly expense report</div>
                    <Badge>Wireframe</Badge>
                  </div>
                  <div className="mt-3 grid gap-3">
                    <div className="h-28 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                    <div className="h-28 rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted)]" />
                  </div>
                  <div className="mt-3 text-xs text-[var(--muted-foreground)]">Breakdown: labour, materials, subcontract, other.</div>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
