"use client";

import { useState, useEffect, useCallback } from "react";
import { AdminSettingsShell } from "@/components/admin/settings/AdminSettingsShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/useToast";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface KeywordRule {
  keyword: string;
  points: number;
}

interface ScoringConfig {
  keywords: KeywordRule[];
  priorityThresholds: { high: number; urgent: number };
}

export default function LeadScoringSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [config, setConfig] = useState<ScoringConfig>({
    keywords: [],
    priorityThresholds: { high: 15, urgent: 30 },
  });
  const [newKeyword, setNewKeyword] = useState("");
  const [newPoints, setNewPoints] = useState("5");

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/leads/scoring");
      const data = await res.json();
      if (data.ok && data.config) {
        setConfig({
          keywords: data.config.keywords || [],
          priorityThresholds: data.config.priorityThresholds || { high: 15, urgent: 30 },
        });
      }
    } catch {
      // use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/leads/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Saved", description: "Scoring rules saved" });
      } else {
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const rescoreAll = async () => {
    setRescoring(true);
    try {
      const res = await fetch("/api/admin/leads/scoring/rescore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.ok) {
        toast({ title: "Done", description: `Re-scored ${data.updated} enquiries` });
      } else {
        toast({ title: "Error", description: data.error || "Failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to rescore", variant: "destructive" });
    } finally {
      setRescoring(false);
    }
  };

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    const pts = parseInt(newPoints, 10);
    if (!kw || isNaN(pts) || pts <= 0) return;
    if (config.keywords.some((k) => k.keyword === kw)) return;
    setConfig((c) => ({ ...c, keywords: [...c.keywords, { keyword: kw, points: pts }] }));
    setNewKeyword("");
    setNewPoints("5");
  };

  const removeKeyword = (idx: number) => {
    setConfig((c) => ({ ...c, keywords: c.keywords.filter((_, i) => i !== idx) }));
  };

  if (loading) {
    return (
      <AdminSettingsShell title="Lead Scoring" subtitle="Configure how incoming enquiries are scored and prioritised">
        <div className="animate-pulse h-64 rounded bg-[var(--muted)]" />
      </AdminSettingsShell>
    );
  }

  return (
    <AdminSettingsShell title="Lead Scoring" subtitle="Configure how incoming enquiries are scored and prioritised">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/admin/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Settings
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={rescoreAll} disabled={rescoring}>
              {rescoring ? "Re-scoring..." : "Re-score All"}
            </Button>
            <Button size="sm" onClick={saveConfig} disabled={saving}>
              {saving ? "Saving..." : "Save Rules"}
            </Button>
          </div>
        </div>

        {/* Priority Thresholds */}
        <Card>
          <CardHeader><CardTitle className="text-base">Priority Thresholds</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Enquiries are scored by matching keywords in their message/notes. The score determines the priority badge shown on the enquiry list.
            </p>
            <div className="grid grid-cols-2 gap-4 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-1">High priority (score &ge;)</label>
                <Input
                  type="number"
                  value={config.priorityThresholds.high}
                  onChange={(e) => setConfig((c) => ({
                    ...c,
                    priorityThresholds: { ...c.priorityThresholds, high: parseInt(e.target.value, 10) || 0 },
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Urgent priority (score &ge;)</label>
                <Input
                  type="number"
                  value={config.priorityThresholds.urgent}
                  onChange={(e) => setConfig((c) => ({
                    ...c,
                    priorityThresholds: { ...c.priorityThresholds, urgent: parseInt(e.target.value, 10) || 0 },
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Keywords */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Scoring Keywords</CardTitle>
              <Badge variant="outline">{config.keywords.length} rules</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Add new keyword */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Keyword</label>
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder="e.g. emergency"
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium mb-1">Points</label>
                  <Input
                    type="number"
                    value={newPoints}
                    onChange={(e) => setNewPoints(e.target.value)}
                  />
                </div>
                <Button variant="secondary" size="sm" onClick={addKeyword} className="h-10">Add</Button>
              </div>

              {/* List */}
              {config.keywords.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No keywords configured. Default scoring rules will be used.</p>
              ) : (
                <div className="border rounded-lg divide-y">
                  {config.keywords
                    .sort((a, b) => b.points - a.points)
                    .map((kw, idx) => (
                      <div key={idx} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{kw.keyword}</span>
                          <Badge variant="outline" className="text-xs">+{kw.points}</Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => removeKeyword(idx)}>
                          &times;
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminSettingsShell>
  );
}
