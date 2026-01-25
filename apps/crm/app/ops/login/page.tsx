import Link from "next/link";
import InstallPwaButton from "@/components/pwa/InstallPwaButton";

export default function OpsLoginPage() {
  return (
    <main className="min-h-screen bg-[var(--muted)] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--background)] p-8 shadow-sm">
        <div className="text-sm font-extrabold tracking-tight text-[var(--foreground)]">
          QUANTRACT
        </div>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--foreground)]">
          Ops Portal
        </h1>

        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Admin & engineer access. Clients use the main Quantract app.
        </p>

        <div className="mt-6 space-y-2">
          <Link
            href="/admin/login"
            className="block w-full rounded-2xl bg-[var(--background)] px-4 py-3 text-center font-semibold text-white hover:bg-[var(--card)]"
          >
            Admin Login
          </Link>

          <Link
            href="/engineer/login"
            className="block w-full rounded-2xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-center font-semibold text-[var(--foreground)] hover:bg-[var(--muted)]"
          >
            Engineer Login
          </Link>

          <InstallPwaButton label="Install Ops App" variant="secondary" />
        </div>

        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
          <div className="text-xs font-semibold text-[var(--foreground)]">
            Installable app
          </div>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            Install this Ops app for quick access on phones & tablets.
          </p>
        </div>
      </div>
    </main>
  );
}
