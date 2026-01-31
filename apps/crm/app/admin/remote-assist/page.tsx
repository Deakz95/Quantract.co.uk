"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";

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
    waiting: "bg-yellow-100 text-yellow-800",
    connected: "bg-green-100 text-green-800",
    ended: "bg-gray-100 text-gray-600",
  };

  return (
    <AppShell role="admin" title="Remote Assist">
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-6">Remote Assist</h1>

      <div className="border rounded-lg p-4 mb-6 bg-gray-50">
        <h2 className="text-sm font-semibold mb-3">New Session</h2>
        <div className="flex gap-3">
          <input
            placeholder="Client name (optional)"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="border rounded px-3 py-2 text-sm flex-1"
          />
          <button
            onClick={createSession}
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Create Link
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Creates a shareable link for the client to join a video call. Link expires after 1 hour.
        </p>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : sessions.length === 0 ? (
        <p className="text-gray-500">No sessions yet.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const expired = new Date(s.expiresAt) < new Date();
            return (
              <div key={s.id} className={`border rounded-lg p-3 flex items-center justify-between ${expired ? "opacity-50" : ""}`}>
                <div>
                  <span className="font-medium text-sm">{s.clientName || "Unnamed"}</span>
                  <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[s.status] || "bg-gray-100"}`}>
                    {expired ? "expired" : s.status}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                </div>
                {!expired && (
                  <button
                    onClick={() => copyLink(s.token, s.id)}
                    className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                  >
                    {copiedId === s.id ? "Copied!" : "Copy Link"}
                  </button>
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
