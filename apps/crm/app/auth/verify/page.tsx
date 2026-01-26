"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const remember = searchParams.get("remember") === "1";

  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Auto-submit on page load (user clicked the link)
  useEffect(() => {
    if (token && status === "idle") {
      handleVerify();
    }
  }, [token]);

  async function handleVerify() {
    if (!token) {
      setError("missing_token");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const res = await fetch("/api/auth/magic-link/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, remember }),
      });

      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "unknown");
        setStatus("error");
        return;
      }

      // Success - redirect to dashboard
      router.push(data.redirectUrl || "/");
    } catch (e) {
      setError("server_error");
      setStatus("error");
    }
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[var(--muted)] flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--background)] p-6">
          <h1 className="text-xl font-semibold">Sign-in link error</h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            We couldn't sign you in. Reason: <span className="font-mono">{error}</span>
          </p>
          <div className="mt-4 flex gap-3">
            <Link className="underline text-sm" href="/admin/login">Admin login</Link>
            <Link className="underline text-sm" href="/engineer/login">Engineer login</Link>
            <Link className="underline text-sm" href="/client/login">Client login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--muted)] flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 text-center">
        <h1 className="text-xl font-semibold">Signing you in...</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Please wait while we verify your magic link.
        </p>
        <div className="mt-4">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[var(--muted)] flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 text-center">
        <h1 className="text-xl font-semibold">Loading...</h1>
        <div className="mt-4">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </div>
      </div>
    </div>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyContent />
    </Suspense>
  );
}
