"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/ErrorState";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="py-6">
      <ErrorState
        title="Admin portal error"
        description="Something went wrong while loading this page. Retry or return to the dashboard."
        onRetry={reset}
        action={
          <Link href="/admin">
            <Button type="button" variant="secondary">
              Back to dashboard
            </Button>
          </Link>
        }
      />
    </div>
  );
}
