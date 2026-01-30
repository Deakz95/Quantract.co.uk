"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/useToast";
import { ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

type Stage = { id: string; name: string; color?: string; sortOrder: number };
type User = { id: string; email: string; name: string | null; role: string };
type EnquiryEvent = { id: string; type: string; note?: string; createdAt: string };
type Enquiry = {
  id: string;
  stageId: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string;
  stageName: string;
  stageColor?: string;
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
  valueEstimate?: number;
  events: EnquiryEvent[];
  createdAt: string;
  updatedAt: string;
};

export default function EnquiryDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();

  const [enquiry, setEnquiry] = useState<Enquiry | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    stageId: "",
    ownerId: "",
    name: "",
    email: "",
    phone: "",
    valueEstimate: "",
    notes: "",
  });

  const load = useCallback(async () => {
    try {
      const [eRes, sRes, uRes] = await Promise.all([
        fetch(`/api/admin/enquiries/${id}`),
        fetch("/api/admin/stages"),
        fetch("/api/admin/users"),
      ]);
      const eData = await eRes.json().catch(() => null);
      const sData = await sRes.json().catch(() => null);
      const uData = await uRes.json().catch(() => null);

      if (!eRes.ok || !eData?.ok || !eData.enquiry) {
        setError("Enquiry not found");
        return;
      }

      const e = eData.enquiry;
      setEnquiry(e);
      setStages(sData?.data || sData?.stages || []);
      setUsers(uData?.data || uData?.users || []);
      setForm({
        stageId: e.stageId || "",
        ownerId: e.ownerId || "",
        name: e.name || "",
        email: e.email || "",
        phone: e.phone || "",
        valueEstimate: e.valueEstimate != null ? String(e.valueEstimate) : "",
        notes: e.notes || "",
      });
    } catch {
      setError("Failed to load enquiry");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = {
        stageId: form.stageId || undefined,
        ownerId: form.ownerId || undefined,
        name: form.name || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        notes: form.notes || undefined,
        valueEstimate: form.valueEstimate ? Number(form.valueEstimate) : undefined,
      };
      const res = await fetch(`/api/admin/enquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast({ title: "Error", description: data?.error || "Failed to save", variant: "destructive" });
        return;
      }
      setEnquiry(data.enquiry);
      toast({ title: "Saved", description: "Enquiry updated successfully" });
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell role="admin" title="Enquiry Detail">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-[var(--muted)]" />
          <div className="h-64 rounded bg-[var(--muted)]" />
        </div>
      </AppShell>
    );
  }

  if (error || !enquiry) {
    return (
      <AppShell role="admin" title="Enquiry Detail">
        <div className="text-center py-12">
          <p className="text-[var(--muted-foreground)]">{error || "Enquiry not found"}</p>
          <Link href="/admin/enquiries">
            <Button variant="secondary" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Enquiries
            </Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const currentStage = stages.find((s) => s.id === form.stageId);

  return (
    <AppShell role="admin" title={enquiry.name || "Unnamed Enquiry"} subtitle={`Enquiry from ${enquiry.email || "unknown"}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/admin/enquiries">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Enquiries
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {currentStage && (
              <Badge style={{ backgroundColor: currentStage.color || "#6b7280", color: "#fff" }}>
                {currentStage.name}
              </Badge>
            )}
            <Button onClick={handleSave} disabled={saving} size="sm">
              <CheckCircle className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle>Contact Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">Name</label>
                  <input
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">Email</label>
                    <input
                      type="email"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">Phone</label>
                    <input
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">Value Estimate (£)</label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    value={form.valueEstimate}
                    onChange={(e) => setForm({ ...form, valueEstimate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">Notes</label>
                  <textarea
                    rows={4}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Pipeline</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">Stage</label>
                  <select
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    value={form.stageId}
                    onChange={(e) => setForm({ ...form, stageId: e.target.value })}
                  >
                    <option value="">Select stage...</option>
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1">Owner</label>
                  <select
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                    value={form.ownerId}
                    onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Activity</CardTitle></CardHeader>
              <CardContent>
                {enquiry.events.length === 0 ? (
                  <p className="text-sm text-[var(--muted-foreground)]">No activity yet</p>
                ) : (
                  <div className="space-y-3">
                    {enquiry.events.map((ev) => (
                      <div key={ev.id} className="text-sm border-l-2 border-[var(--border)] pl-3">
                        <div className="font-medium capitalize">{ev.type.replace(/_/g, " ").toLowerCase()}</div>
                        {ev.note && <div className="text-[var(--muted-foreground)]">{ev.note}</div>}
                        <div className="text-xs text-[var(--muted-foreground)]">
                          {new Date(ev.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Info</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2 text-[var(--muted-foreground)]">
                <div>Created: {new Date(enquiry.createdAt).toLocaleString()}</div>
                <div>Updated: {new Date(enquiry.updatedAt).toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
