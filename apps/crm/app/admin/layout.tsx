import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/serverAuth";
import { AdminLayoutInner } from "./AdminLayoutInner";

export const metadata: Metadata = {
  manifest: "/manifest-admin.webmanifest",
};

/**
 * Admin layout — server component for metadata + server-side role gate.
 * Defense-in-depth: redirects non-admin roles even if middleware is bypassed.
 * Best-effort: if auth resolution fails (e.g. on /admin/login), allow through.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  try {
    const ctx = await getAuthContext();
    if (ctx && ctx.role !== "admin") {
      redirect(`/${ctx.role}`);
    }
  } catch {
    // Auth resolution failed (e.g. login page, no session) — allow through.
    // Middleware + API-level guards are the primary enforcement.
  }

  return <AdminLayoutInner>{children}</AdminLayoutInner>;
}
