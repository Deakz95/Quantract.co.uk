"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type RecentDoc = {
  id: string;
  title: string;
  type: string;
  viewedAt: string;
};

const LS_KEY = "qt_recent_docs";

function getRecentDocs(): RecentDoc[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentDoc[];
  } catch {
    return [];
  }
}

export default function OfflinePage() {
  const [recentDocs, setRecentDocs] = useState<RecentDoc[]>([]);

  useEffect(() => {
    setRecentDocs(getRecentDocs());
  }, []);

  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-6 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="text-lg font-bold text-[var(--foreground)]">You're offline</h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        Check your internet connection and try again. Some cached pages may still be available.
      </p>

      {recentDocs.length > 0 && (
        <div className="text-left">
          <h2 className="text-sm font-semibold text-[var(--foreground)] mb-2">
            Recently viewed
          </h2>
          <div className="space-y-2">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3"
              >
                <p className="text-sm font-medium text-[var(--foreground)]">{doc.title}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{doc.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href="/client"
        className="inline-block rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] hover:opacity-90 transition-opacity"
      >
        Try again
      </Link>
    </div>
  );
}
