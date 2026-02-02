"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

interface Session {
  id: string;
  token: string;
  clientName: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function RemoteAssistPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/remote-assist/sessions")
      .then((r) => r.json())
      .then((d) => { if (d.ok) setSessions(d.data); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function createSession() {
    setCreating(true);
    const res = await fetch("/api/admin/remote-assist/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientName: clientName.trim() || undefined }),
    });
    if (res.ok) {
      setClientName("");
      load();
    }
    setCreating(false);
  }

  function copyLink(token: string, id: string) {
    const url = `${window.location.origin}/assist/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const STATUS_STYLES: Record<string, string> = {
    waiting: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    connected: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    ended: "bg-[var(--muted)] text-[var(--muted-foreground)]",
  };

  return (
    <AppShell role="admin" title="Remote Assist" subtitle="Create shareable video-call links for clients">
      <div className="space-y-4">
        {/* New session form */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="text-sm font-semibold text-[var(--foreground)] mb-3">New Session</div>
          <div className="flex gap-3">
            <input
              placeholder="Client name (optional)"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="border border-[var(--border)] rounded-lg px-3 py-2 text-sm flex-1 bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
            <Button size="sm" onClick={createSession} disabled={creating}>
              {creating ? "Creating..." : "Create Link"}
            </Button>
          </div>
          <p className="text-xs text-[var(--muted-foreground)] mt-2">
            Creates a shareable link for the client to join a video call. Link expires after 1 hour.
          </p>
        </div>

        {/* Sessions list */}
        {loading ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">
            <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            Loading sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-8 text-center">
            <Activity className="w-12 h-12 mx-auto mb-4 text-[var(--muted-foreground)] opacity-50" />
            <p className="text-sm font-medium text-[var(--foreground)] mb-1">No sessions yet</p>
            <p className="text-xs text-[var(--muted-foreground)]">
              Create a session above to generate a shareable video-call link.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => {
              const expired = new Date(s.expiresAt) < new Date();
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 flex items-center justify-between ${expired ? "opacity-50" : ""}`}
                >
                  <div>
                    <span className="font-medium text-sm text-[var(--foreground)]">{s.clientName || "Unnamed"}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[s.status] || "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
                      {expired ? "expired" : s.status}
                    </span>
                    <span className="text-xs text-[var(--muted-foreground)] ml-2">
                      {new Date(s.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {!expired && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => copyLink(s.token, s.id)}
                    >
                      {copiedId === s.id ? "Copied!" : "Copy Link"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
