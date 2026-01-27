"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/Input";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-xl mb-4">
            <span className="text-white font-bold text-2xl">Q</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Reset Password</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Enter your email to receive a password reset link
          </p>
        </div>

        <Card variant="glass" className="backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Forgot your password?</CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="space-y-6">
                <div className="rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 p-6 text-center">
                  <CheckCircle2 className="w-12 h-12 text-[var(--success)] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[var(--success)] mb-2">
                    Check your inbox!
                  </h3>
                  <p className="text-sm text-[var(--success)]/80">
                    Password reset link sent to <strong>{email}</strong>.
                    Check your inbox and spam folder.
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    Did not receive the email? Check your spam folder or try again.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSuccess(false);
                      setEmail("");
                    }}
                  >
                    Send another link
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      placeholder="you@company.com"
                      autoComplete="email"
                      required
                    />
                  </div>
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
                  disabled={loading || !isValidEmail}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>

                <p className="text-xs text-center text-[var(--muted-foreground)]">
                  We will send you an email with a link to reset your password.
                  The link expires in 1 hour.
                </p>
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
