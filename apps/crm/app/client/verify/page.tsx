// app/client/verify/page.tsx
import { Suspense } from "react";
import VerifyClient from "./VerifyClient";

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-[var(--muted-foreground)]">Loading…</div>}>
      <VerifyClient />
    </Suspense>
  );
}
