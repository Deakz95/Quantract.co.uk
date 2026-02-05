"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { listSavedOutputs, deleteSavedOutput } from "../../lib/savedOutputs";
import type { ToolOutput } from "../../lib/toolSchema";

const TOOL_LABELS: Record<string, string> = {
  "cable-calculator": "Cable Calculator",
  "point-counter": "Point Counter",
  "rams": "RAMS Builder",
};

export default function SavedOutputsPage() {
  const [outputs, setOutputs] = useState<ToolOutput[]>([]);

  useEffect(() => {
    setOutputs(listSavedOutputs());
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm("Delete this saved result?")) return;
    deleteSavedOutput(id);
    setOutputs(listSavedOutputs());
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--card)",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <Link
          href="/"
          style={{
            color: "var(--muted-foreground)",
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg style={{ width: 18, height: 18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <h1 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Saved Results</h1>
      </header>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "24px 20px" }}>
        {outputs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <svg
              style={{ width: 48, height: 48, color: "var(--muted-foreground)", margin: "0 auto 16px" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <p style={{ fontSize: "15px", fontWeight: 600 }}>No saved results yet</p>
            <p style={{ fontSize: "13px", color: "var(--muted-foreground)" }}>
              Use a tool and click &ldquo;Save Result&rdquo; to store outputs here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {outputs.map((o) => (
              <div
                key={o.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "16px",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        background: "var(--muted)",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      {TOOL_LABELS[o.toolSlug] || o.toolSlug}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--muted-foreground)" }}>
                      {new Date(o.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>{o.name}</h3>
                  {o.outputsJson && typeof o.outputsJson === "object" && (
                    <p style={{ fontSize: "12px", color: "var(--muted-foreground)", margin: "4px 0 0", lineHeight: 1.4 }}>
                      {Object.entries(o.outputsJson)
                        .slice(0, 3)
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(" | ")}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(o.id)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    cursor: "pointer",
                    color: "var(--muted-foreground)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  title="Delete saved result"
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
