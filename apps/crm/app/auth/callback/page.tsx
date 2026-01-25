"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Auth Callback Page
 *
 * This page handles post-authentication redirect from Neon Auth.
 * It calls the session-sync API to bridge Neon Auth to app cookies,
 * then redirects to the appropriate page (onboarding or dashboard).
 */
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Syncing session...");

  useEffect(() => {
    async function syncSession() {
      try {
        setStatus("Syncing your session...");

        const res = await fetch("/api/auth/session-sync", {
          method: "POST",
          credentials: "include",
        });

        const data = await res.json();

        if (!res.ok || !data.ok) {
          setError(data.error || "Failed to sync session");
          return;
        }

        setStatus("Redirecting...");

        // Redirect to the appropriate page
        router.replace(data.redirectTo || "/admin/dashboard");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    }

    syncSession();
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/20 flex items-center justify-center mb-4">
            <span className="text-red-500 text-2xl">!</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Authentication Error</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <a
            href="/auth/sign-in"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            Try Again
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4 animate-pulse">
          <span className="text-white font-bold text-2xl">Q</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Setting up your account</h1>
        <p className="text-slate-400">{status}</p>
        <div className="mt-6">
          <div className="w-8 h-8 mx-auto border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    </main>
  );
}
