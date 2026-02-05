"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

/**
 * PWA install prompt banner for the office portal.
 * Shows a dismissible banner when the app is installable but not yet installed.
 * Uses the `beforeinstallprompt` event to trigger native install flow.
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed
    try {
      if (sessionStorage.getItem("qt_office_pwa_dismissed") === "1") {
        setDismissed(true);
        return;
      }
    } catch {
      // sessionStorage unavailable
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
      sessionStorage.setItem("qt_office_pwa_dismissed", "1");
    } catch {
      // sessionStorage unavailable
    }
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-2">
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
        <Download size={18} className="shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-blue-900">Install Quantract Office</p>
          <p className="text-xs text-blue-700">
            Add to your desktop for quick access to the control room.
          </p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 text-blue-400 hover:text-blue-600 transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
