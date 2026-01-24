"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ClientError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="py-6">
      <ErrorState
        title="Client portal error"
        description="Something went wrong while loading your view. Retry or return to your dashboard."
        onRetry={reset}
        action={
          <Link href="/client">
            <Button type="button" variant="secondary">
              Back to dashboard
            </Button>
          </Link>
        }
      />
    </div>
  );
}
