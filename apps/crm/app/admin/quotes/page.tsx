'use client';

import { useEffect, useState } from 'react';
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus } from "lucide-react";
import Link from "next/link";

export default function QuotesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/quotes/summary')
      .then(r => r.json())
      .then(j => { setItems(j.data || []); setLoading(false); });
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      accepted: "success",
      sent: "warning", 
      pending: "warning",
      draft: "secondary",
      rejected: "destructive",
      expired: "destructive",
    };
    return <Badge variant={variants[status?.toLowerCase()] || "secondary"}>{status || 'Draft'}</Badge>;
  };

  return (
    <AppShell role="admin" title="Quotes" subtitle="Manage and track all your quotes">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search quotes..."
              className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] w-64"
            />
            <Button variant="secondary" size="sm">
              Filter
            </Button>
          </div>
          <Link href="/admin/quotes/new">
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              New Quote
            </Button>
          </Link>
        </div>

        {/* Quotes Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-[var(--muted-foreground)]">
                <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                Loading quotes...
              </div>
            ) : items.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No quotes yet</h3>
                <p className="text-[var(--muted-foreground)] mb-4">Create your first quote to get started</p>
                <Link href="/admin/quotes/new">
                  <Button variant="gradient">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Quote
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Quote</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Client</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Site</th>
                      <th className="text-right p-4 text-sm font-semibold text-[var(--foreground)]">Total</th>
                      <th className="text-left p-4 text-sm font-semibold text-[var(--foreground)]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((q, index) => (
                      <tr key={q.quoteId} className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors cursor-pointer ${
                        index % 2 === 0 ? 'bg-[var(--card)]' : 'bg-[var(--muted)]/50'
                      }`}>
                        <td className="p-4">
                          <Link href={`/admin/quotes/${q.quoteId}`} className="text-[var(--primary)] font-medium hover:underline">
                            {q.quoteNumber || `Q-${q.quoteId?.slice(0, 8)}`}
                          </Link>
                        </td>
                        <td className="p-4 text-[var(--foreground)]">{q.clientName || '—'}</td>
                        <td className="p-4 text-[var(--muted-foreground)]">{q.siteName || '—'}</td>
                        <td className="p-4 text-right font-semibold text-[var(--foreground)]">£{((q.total || 0) / 100).toFixed(2)}</td>
                        <td className="p-4">{getStatusBadge(q.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
