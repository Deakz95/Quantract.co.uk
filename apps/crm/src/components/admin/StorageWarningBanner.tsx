"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X, Database } from "lucide-react";
import Link from "next/link";

type WarningLevel = "warning_80" | "warning_90" | "blocked_100";

export function StorageWarningBanner() {
  const [warningLevel, setWarningLevel] = useState<WarningLevel | null>(null);
  const [percentUsed, setPercentUsed] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch("/api/storage/usage");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data.ok && data.warningLevel) {
          setWarningLevel(data.warningLevel as WarningLevel);
          setPercentUsed(data.percentUsed ?? 0);
        }
      } catch {
        // Silently ignore — banner is best-effort
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  if (!warningLevel || dismissed) return null;

  const isBlocked = warningLevel === "blocked_100";
  const bgClass = isBlocked
    ? "bg-red-600 text-white"
    : warningLevel === "warning_90"
      ? "bg-orange-500 text-white"
      : "bg-yellow-500 text-yellow-950";

  const message = isBlocked
    ? "Storage limit reached — uploads are blocked. Free up space or upgrade your plan."
    : `Storage is ${percentUsed}% full. Consider cleaning up files or upgrading your plan.`;

  return (
    <div className={`relative z-40 ${bgClass} px-4 py-3 text-sm`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {isBlocked ? (
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <Database className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{message}</span>
          <Link
            href="/admin/settings/storage"
            className="underline font-medium hover:no-underline ml-1"
          >
            Manage storage
          </Link>
        </div>
        {!isBlocked && (
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:opacity-80"
            aria-label="Dismiss storage warning"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
