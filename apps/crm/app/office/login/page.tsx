"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { Mail, Lock, Building2, ArrowLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const magicSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

const passwordSchema = magicSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function OfficeLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)] flex items-center justify-center"><div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" /></div>}>
      <OfficeLogin />
    </Suspense>
  );
}

function OfficeLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/office";
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Redirect if already authenticated (with loop detection)
  useEffect(() => {
    const loopKey = `qt_login_loop:${next}`;
    const lastVisit = Number(sessionStorage.getItem(loopKey) || "0");
    const now = Date.now();
    const isLoop = now - lastVisit < 3000;
    sessionStorage.setItem(loopKey, String(now));

    if (isLoop) {
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      setCheckingAuth(false);
      return;
    }

    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data?.user) {
          router.replace(next);
        } else {
          setCheckingAuth(false);
        }
      })
      .catch(() => setCheckingAuth(false));
  }, [router, next]);

  const canSubmit = useMemo(() => {
    if (mode === "magic") return magicSchema.safeParse({ email }).success;
    return passwordSchema.safeParse({ email, password }).success;
  }, [email, password, mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setSentTo(null);
    try {
      if (mode === "magic") {
        const res = await fetch("/api/auth/magic-link/request", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role: "office", email, rememberMe }),
        });
        if (!res.ok) throw new Error("Could not send sign-in link");
        setSentTo(email.trim());
      } else {
        const res = await fetch("/api/auth/password/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role: "office", email, password, rememberMe }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || "Invalid email or password");
        window.location.href = next;
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--primary)] rounded-full blur-3xl opacity-10 animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--accent)] rounded-full blur-3xl opacity-10 animate-float" style={{ animationDelay: "1s" }} />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-xl mb-4">
            <span className="text-white font-bold text-2xl">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Office Portal</h1>
          <p className="text-[var(--muted-foreground)] mt-1">Sign in to the office control room</p>
        </div>

        <Card variant="glass" className="backdrop-blur-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <Badge variant="gradient">Office Portal</Badge>
              <Building2 className="w-5 h-5 text-[var(--primary)]" />
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Mode Toggle */}
              <div className="flex rounded-xl bg-[var(--muted)] p-1">
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    mode === "magic"
                      ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  Magic Link
                </button>
                <button
                  type="button"
                  onClick={() => setMode("password")}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    mode === "password"
                      ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  Password
                </button>
              </div>

              {/* Email Field */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--foreground)]">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    placeholder="you@company.com"
                    type="email"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field (conditional) */}
              {mode === "password" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[var(--foreground)]">Password</label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs text-[var(--primary)] hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      placeholder="••••••••"
                      type="password"
                      autoComplete="current-password"
                    />
                  </div>
                </div>
              )}

              {/* Remember Me */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer"
                />
                <span className="text-sm text-[var(--muted-foreground)]">Keep me logged in</span>
              </label>

              {/* Success Message */}
              {sentTo && (
                <div className="rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--success)]">Magic link sent!</p>
                    <p className="text-xs text-[var(--success)]/80 mt-0.5">
                      Check your inbox at <strong>{sentTo}</strong>
                    </p>
                    <p className="text-xs text-[var(--success)]/60 mt-1">
                      Also check your spam folder. Link expires in 15 minutes.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--error)] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--error)]">Sign-in failed</p>
                    <p className="text-xs text-[var(--error)]/80 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                disabled={busy || !canSubmit}
              >
                {busy ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {mode === "magic" ? "Send Magic Link" : "Sign In"}
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-[var(--muted-foreground)]">
                {mode === "magic"
                  ? "We'll send you a secure sign-in link. No password needed!"
                  : "Enter your password to sign in."}
              </p>
            </form>

            {/* Footer Links */}
            <div className="mt-6 pt-6 border-t border-[var(--border)] flex items-center justify-between">
              <Link
                href="/"
                className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </Link>
              <Link
                href="mailto:support@quantract.co.uk"
                className="text-sm text-[var(--primary)] hover:underline"
              >
                Need help?
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Additional Options */}
        <div className="mt-6 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            Not office staff?{" "}
            <Link href="/admin/login" className="text-[var(--primary)] hover:underline font-medium">
              Admin Login
            </Link>
            {" • "}
            <Link href="/client/login" className="text-[var(--primary)] hover:underline font-medium">
              Client Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
