"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/ErrorState";

export default function OpsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="py-6">
      <ErrorState
        title="Ops portal error"
        description="Something went wrong while loading this page. Retry or return to the ops dashboard."
        onRetry={reset}
        action={
          <Link href="/ops">
            <Button type="button" variant="secondary">
              Back to ops dashboard
            </Button>
          </Link>
        }
      />
    </div>
  );
}
