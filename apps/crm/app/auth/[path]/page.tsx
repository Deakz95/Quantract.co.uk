"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthView } from "@neondatabase/auth/react";

export default function AuthPage({ params }: { params: Promise<{ path: string }> }) {
  const router = useRouter();
  const [path, setPath] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    params.then((p) => setPath(p.path));
  }, [params]);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data?.ok && data?.user) {
          router.replace("/admin");
        } else {
          setChecking(false);
        }
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking || !path) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthView path={path} redirectTo="/auth/callback" />
      </div>
    </main>
  );
}
