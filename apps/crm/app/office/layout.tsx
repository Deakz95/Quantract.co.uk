import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/serverAuth";
import { OfficeLayoutInner } from "./OfficeLayoutInner";

export const metadata: Metadata = {
  manifest: "/manifest-office.webmanifest",
};

/**
 * Office layout — server component for metadata + server-side role gate.
 * Defense-in-depth: redirects non-office/non-admin roles even if middleware is bypassed.
 * Best-effort: if auth resolution fails (e.g. on /office/login), allow through.
 */
export default async function OfficeLayout({ children }: { children: ReactNode }) {
  try {
    const ctx = await getAuthContext();
    if (ctx && ctx.role !== "office" && ctx.role !== "admin") {
      redirect(`/${ctx.role}`);
    }
  } catch {
    // Auth resolution failed (e.g. login page, no session) — allow through.
    // Middleware + API-level guards are the primary enforcement.
  }

  return <OfficeLayoutInner>{children}</OfficeLayoutInner>;
}
