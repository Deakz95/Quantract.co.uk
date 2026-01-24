"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/badge";
import { Mail, Lock, Sparkles, ArrowLeft, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const magicSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
});

const passwordSchema = magicSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AdminLogin() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/admin";
  const [mode, setMode] = useState<"magic" | "password">("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

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
          body: JSON.stringify({ role: "admin", email, rememberMe }),
        });
        if (!res.ok) throw new Error("Could not send sign-in link");
        setSentTo(email.trim());
      } else {
        const res = await fetch("/api/auth/password/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ role: "admin", email, password, rememberMe }),
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

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Theme Toggle - Fixed position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-mesh opacity-30" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--primary)] rounded-full blur-3xl opacity-10 animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--accent)] rounded-full blur-3xl opacity-10 animate-float" style={{ animationDelay: '1s' }} />

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-xl mb-4">
            <span className="text-white font-bold text-2xl">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Welcome Back</h1>
          <p className="text-[var(--muted-foreground)] mt-1">Sign in to your admin dashboard</p>
        </div>

        <Card variant="glass" className="backdrop-blur-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <Badge variant="gradient">Admin Portal</Badge>
              <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            </div>
          </CardHeader>
          <CardContent>
            {/* Google Sign-in */}
            <Link
              href="#" onClick={(e: MouseEvent<HTMLAnchorElement>) => { e.preventDefault(); }}
              className="block mb-6"
            >
              <Button variant="outline" className="w-full justify-center gap-3 bg-[var(--card)] border-[var(--border)] text-[var(--muted-foreground)]">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google (coming soon)
              </Button>
            </Link>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted-foreground)]">or sign in with email</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

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
                  <label className="text-sm font-medium text-[var(--foreground)]">Password</label>
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

              {/* Remember Me Checkbox */}
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
                    <p className="text-sm font-medium text-[var(--success)]">Check your inbox!</p>
                    <p className="text-xs text-[var(--success)]/80 mt-0.5">
                      Sign-in link sent to <strong>{sentTo}</strong>
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

              {/* Help Text */}
              <p className="text-xs text-center text-[var(--muted-foreground)]">
                {mode === "magic"
                  ? "We'll send you a secure sign-in link. No password needed!"
                  : "First admin can be bootstrapped via ADMIN_EMAIL environment variable."}
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
            Not an admin?{" "}
            <Link href="/client/login" className="text-[var(--primary)] hover:underline font-medium">
              Client Login
            </Link>
            {" • "}
            <Link href="/engineer/login" className="text-[var(--primary)] hover:underline font-medium">
              Engineer Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
