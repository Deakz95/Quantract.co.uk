"use client";

import Link from "next/link";

export default function AdminOfflinePage() {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 p-6 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="text-lg font-bold text-[var(--foreground)]">You're offline</h1>
      <p className="text-sm text-[var(--muted-foreground)]">
        Check your internet connection and try again. Some cached pages may still be available.
      </p>
      <Link
        href="/admin"
        className="inline-block rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)] hover:opacity-90 transition-opacity"
      >
        Try again
      </Link>
    </div>
  );
}
