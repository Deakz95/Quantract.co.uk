"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/Input";
import { Lock, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = password.length >= 8 && password === confirm;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !token) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
        <div className="w-full max-w-md animate-fade-in">
          <Card variant="glass" className="backdrop-blur-xl">
            <CardContent className="pt-6">
              <div className="rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 p-6 text-center">
                <AlertCircle className="w-12 h-12 text-[var(--error)] mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-[var(--error)] mb-2">Invalid Link</h3>
                <p className="text-sm text-[var(--error)]/80">
                  This password reset link is invalid or missing a token.
                </p>
              </div>
              <div className="mt-6 text-center">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-[var(--primary)] hover:underline"
                >
                  Request a new reset link
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-xl mb-4">
            <span className="text-white font-bold text-2xl">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Set New Password</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Enter your new password below
          </p>
        </div>

        <Card variant="glass" className="backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Reset your password</CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-6">
                <div className="rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-[var(--success)] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[var(--success)] mb-2">
                    Password updated!
                  </h3>
                  <p className="text-sm text-[var(--success)]/80">
                    Your password has been reset successfully. You can now sign in.
                  </p>
                </div>
                <div className="text-center">
                  <Link href="/admin/login">
                    <Button variant="gradient" className="w-full">
                      Go to Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      placeholder="At least 8 characters"
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <Input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="pl-10"
                      placeholder="Re-enter your password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                    />
                  </div>
                  {confirm && password !== confirm && (
                    <p className="text-xs text-[var(--error)]">Passwords do not match</p>
                  )}
                </div>

                {error && (
                  <div className="rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-[var(--error)] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[var(--error)]">Error</p>
                      <p className="text-xs text-[var(--error)]/80 mt-0.5">{error}</p>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="gradient"
                  className="w-full"
                  disabled={loading || !isValid}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            )}

            {/* Back to Login */}
            <div className="mt-6 pt-6 border-t border-[var(--border)]">
              <Link
                href="/admin/login"
                className="flex items-center justify-center gap-2 text-sm text-[var(--primary)] hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
