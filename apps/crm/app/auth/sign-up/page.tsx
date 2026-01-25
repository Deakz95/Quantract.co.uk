'use client';

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, ArrowLeft, Mail, Lock, User } from "lucide-react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/better-auth/sign-up/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      setError(json?.error?.message || "Sign up failed");
      setBusy(false);
      return;
    }
    window.location.href = "/admin/dashboard";
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 bg-gradient-mesh opacity-30 pointer-events-none" />
      <div className="fixed top-20 left-1/4 w-96 h-96 bg-[var(--primary)] rounded-full blur-3xl opacity-10 pointer-events-none" />
      <div className="fixed bottom-20 right-1/4 w-96 h-96 bg-[var(--accent)] rounded-full blur-3xl opacity-10 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-[var(--foreground)]">Create Your Account</h1>
          <p className="text-[var(--muted-foreground)] mt-2">Start your 14-day free trial</p>
        </div>

        <Card className="border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-[var(--foreground)]">Sign Up</CardTitle>
            <CardDescription>Enter your details to create an account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[var(--foreground)]">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="John Smith"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="pl-10 bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-[var(--foreground)]">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10 bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[var(--foreground)]">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a secure password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 bg-[var(--muted)] border-[var(--border)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">Minimum 8 characters</p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-[var(--error)]/10 border border-[var(--error)]/20 text-[var(--error)] text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="gradient"
                className="w-full"
                disabled={busy}
              >
                {busy ? "Creating account..." : "Create Account"}
              </Button>

              <p className="text-center text-xs text-[var(--muted-foreground)]">
                By signing up, you agree to our{" "}
                <a href="#" className="text-[var(--primary)] hover:underline">Terms</a>
                {" "}and{" "}
                <a href="#" className="text-[var(--primary)] hover:underline">Privacy Policy</a>
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center space-y-4">
          <p className="text-[var(--muted-foreground)]">
            Already have an account?{" "}
            <Link href="/admin/login" className="text-[var(--primary)] hover:underline font-medium">
              Sign in
            </Link>
          </p>

          <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
