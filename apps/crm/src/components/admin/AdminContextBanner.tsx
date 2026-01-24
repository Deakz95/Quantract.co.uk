"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export function AdminContextBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [context, setContext] = useState<"client" | "engineer" | null>(null);

  useEffect(() => {
    // Check if we're in client or engineer portal
    if (pathname?.startsWith("/client")) {
      setContext("client");
      setShow(true);
    } else if (pathname?.startsWith("/engineer")) {
      setContext("engineer");
      setShow(true);
    } else {
      setShow(false);
      setContext(null);
    }
  }, [pathname]);

  if (!show || !context) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 border-b-2 border-amber-600">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold">⚠️</span>
          <span className="font-semibold">
            ADMIN VIEW: You are viewing the{" "}
            <span className="capitalize">{context}</span> Portal as admin
          </span>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 rounded-lg bg-amber-950 px-3 py-1.5 text-sm font-semibold text-amber-50 hover:bg-amber-900 transition-colors"
        >
          ← Back to Admin Portal
        </Link>
      </div>
    </div>
  );
}
