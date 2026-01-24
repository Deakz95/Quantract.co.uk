"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, type ButtonVariant } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isIos() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isInStandaloneMode() {
  if (typeof window === "undefined") return false;
  // iOS Safari
  // @ts-expect-error - Safari only
  const iosStandalone = window.navigator.standalone === true;
  // other browsers
  const displayModeStandalone = window.matchMedia?.("(display-mode: standalone)")?.matches;
  return iosStandalone || !!displayModeStandalone;
}

export default function InstallPwaButton({
  label = "Install app",
  variant = "secondary",
}: {
  label?: string;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const ios = useMemo(() => isIos(), []);

  // Map component-level variants -> design-system variants
  const buttonVariant: ButtonVariant = useMemo(() => {
    // In our Button component, "default" is the primary style.
    if (variant === "primary") return "default";
    if (variant === "secondary") return "secondary";
    return "ghost";
  }, [variant]);

  useEffect(() => {
    setInstalled(isInStandaloneMode());

    const onBeforeInstall = (e: Event) => {
      // Stop Chrome showing its mini-infobar
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } finally {
      // Prompt can only be used once
      setDeferred(null);
    }
  }

  if (installed) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
        ✅ Installed
      </div>
    );
  }

  // iOS has no install prompt event — show instructions instead
  if (ios && !deferred) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
        <div className="font-semibold text-slate-900">Install on iPhone/iPad</div>
        <div className="mt-1">
          Tap <span className="font-semibold">Share</span> →{" "}
          <span className="font-semibold">Add to Home Screen</span>.
        </div>
      </div>
    );
  }

  // On desktop, Android, Chrome etc — show button only when prompt is available
  if (!deferred) return null;

  return (
    <Button type="button" variant={buttonVariant} onClick={install}>
      {label}
    </Button>
  );
}
