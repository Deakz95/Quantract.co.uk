"use client";

import { useEffect } from "react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/ErrorState";

export default function EngineerError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="py-6">
      <ErrorState
        title="Engineer portal error"
        description="We couldn't load this page. Retry the request or go back to your dashboard."
        onRetry={reset}
        action={
          <Link href="/engineer">
            <Button type="button" variant="secondary">
              Back to dashboard
            </Button>
          </Link>
        }
      />
    </div>
  );
}
