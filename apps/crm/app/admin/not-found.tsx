"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AdminNotFound() {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="max-w-md w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] p-8 text-center shadow-sm">
        <div className="text-5xl font-extrabold text-[var(--muted-foreground)] mb-4">404</div>
        <h1 className="text-lg font-bold text-[var(--foreground)]">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          The page you requested doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg bg-[var(--primary)] text-sm font-medium text-white hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </Link>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center min-h-[44px] px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
