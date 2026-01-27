"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, ArrowLeft, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth/client";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check verification status periodically
  const checkVerification = useCallback(async () => {
    try {
      const session = await authClient.getSession();
      if (session?.data?.user) {
        setEmail(session.data.user.email || null);
        if (session.data.user.emailVerified) {
          setIsVerified(true);
          // Redirect after a brief delay to show success
          setTimeout(() => {
            router.replace("/admin/dashboard");
          }, 2000);
        }
      }
    } catch {
      // Ignore errors during polling
    }
  }, [router]);

  useEffect(() => {
    // Initial check
    checkVerification();

    // Poll every 3 seconds
    const interval = setInterval(checkVerification, 3000);

    return () => clearInterval(interval);
  }, [checkVerification]);

  async function handleResend() {
    setResending(true);
    setError(null);
    setResent(false);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resend verification email");
      }

      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend email");
    } finally {
      setResending(false);
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Verify Your Email</h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            We have sent a verification link to your email
          </p>
        </div>

        <Card variant="glass" className="backdrop-blur-xl">
          <CardContent className="pt-6">
            {isVerified ? (
              <div className="text-center space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-[var(--success)]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-[var(--success)]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--success)]">
                    Email Verified!
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    Redirecting to dashboard...
                  </p>
                </div>
                <div className="flex justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Email icon */}
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-4">
                    <Mail className="w-10 h-10 text-[var(--primary)]" />
                  </div>
                  {email && (
                    <p className="text-sm text-[var(--foreground)]">
                      We sent a verification link to:
                      <br />
                      <strong className="text-[var(--primary)]">{email}</strong>
                    </p>
                  )}
                </div>

                {/* Instructions */}
                <div className="bg-[var(--muted)] rounded-xl p-4">
                  <h4 className="text-sm font-medium text-[var(--foreground)] mb-2">
                    Next steps:
                  </h4>
                  <ol className="text-sm text-[var(--muted-foreground)] space-y-2 list-decimal list-inside">
                    <li>Check your email inbox</li>
                    <li>Click the verification link in the email</li>
                    <li>You will be automatically redirected once verified</li>
                  </ol>
                </div>

                {/* Resent success */}
                {resent && (
                  <div className="rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 p-3 text-center">
                    <p className="text-sm text-[var(--success)]">
                      Verification email sent! Check your inbox.
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="rounded-xl bg-[var(--error)]/10 border border-[var(--error)]/20 p-3 text-center">
                    <p className="text-sm text-[var(--error)]">{error}</p>
                  </div>
                )}

                {/* Resend button */}
                <div className="text-center">
                  <p className="text-sm text-[var(--muted-foreground)] mb-3">
                    Did not receive the email? Check your spam folder or
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Resend verification email
                      </>
                    )}
                  </Button>
                </div>

                {/* Checking status indicator */}
                <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Checking verification status...
                </div>
              </div>
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
