"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function AuthAwareNavButtons() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAuthed(!!d?.user))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  if (!checked) {
    // Show default (sign-up) while checking
    return (
      <>
        <Link href="/admin/login" className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)] px-3 py-1.5 text-xs">
          Log in
        </Link>
        <Link href="/auth/sign-up" className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary-dark)] text-[var(--primary-foreground)] shadow-lg hover:shadow-xl hover:scale-[1.02] bg-[length:200%_auto] hover:bg-right-top px-3 py-1.5 text-xs">
          Start Free Trial
        </Link>
      </>
    );
  }

  if (authed) {
    return (
      <Link href="/admin" className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary-dark)] text-[var(--primary-foreground)] shadow-lg hover:shadow-xl hover:scale-[1.02] bg-[length:200%_auto] hover:bg-right-top px-3 py-1.5 text-xs">
        Go to Dashboard
        <ArrowRight className="w-3 h-3" />
      </Link>
    );
  }

  return (
    <>
      <Link href="/admin/login" className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)] px-3 py-1.5 text-xs">
        Log in
      </Link>
      <Link href="/auth/sign-up" className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary-dark)] text-[var(--primary-foreground)] shadow-lg hover:shadow-xl hover:scale-[1.02] bg-[length:200%_auto] hover:bg-right-top px-3 py-1.5 text-xs">
        Start Free Trial
      </Link>
    </>
  );
}

export function AuthAwareHeroCTA() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAuthed(!!d?.user))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  if (authed && checked) {
    return (
      <Link
        href="/admin"
        className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary-dark)] text-[var(--primary-foreground)] shadow-xl hover:shadow-2xl hover:scale-[1.02] bg-[length:200%_auto] hover:bg-right-top px-8 py-3.5 text-base w-full sm:w-auto"
      >
        Go to Dashboard
        <ArrowRight className="w-4 h-4 ml-2" />
      </Link>
    );
  }

  return (
    <Link
      href="/auth/sign-up"
      className="inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-[var(--primary-dark)] text-[var(--primary-foreground)] shadow-xl hover:shadow-2xl hover:scale-[1.02] bg-[length:200%_auto] hover:bg-right-top px-8 py-3.5 text-base w-full sm:w-auto"
    >
      Start Free Trial
      <ArrowRight className="w-4 h-4 ml-2" />
    </Link>
  );
}
