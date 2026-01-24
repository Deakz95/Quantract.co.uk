"use client";

import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Report the error to Sentry.
  Sentry.captureException(error);

  return (
    <html>
      <body style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui" }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ marginBottom: 16 }}>
          An unexpected error occurred. If the problem persists, contact support.
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #e2e8f0",
            background: "#0f172a",
            color: "white",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
