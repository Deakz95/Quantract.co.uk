"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

const STORAGE_KEY = "qt_admin_pwa_dismissed";
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * PWA install prompt banner for the admin/CRM portal.
 * Indigo-branded variant. Uses localStorage with a 30-day expiry
 * so the banner stays dismissed across sessions.
 */
export function AdminPwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed within the last 30 days
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const ts = Number(raw);
        if (!isNaN(ts) && Date.now() - ts < DISMISS_DURATION_MS) {
          setDismissed(true);
          return;
        }
      }
    } catch {
      // localStorage unavailable
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // localStorage unavailable
    }
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-2">
      <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
        <Download size={18} className="shrink-0 text-indigo-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-indigo-900">Install Quantract CRM</p>
          <p className="text-xs text-indigo-700">
            Add to your home screen for quick access to quotes, jobs, and invoices.
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors min-h-10 touch-manipulation"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-indigo-400 hover:text-indigo-600 transition-colors min-h-10 touch-manipulation"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
