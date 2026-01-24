import Link from "next/link";
import InstallPwaButton from "@/components/pwa/InstallPwaButton";

export default function OpsLoginPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="text-sm font-extrabold tracking-tight text-slate-900">
          QUANTRACT
        </div>

        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          Ops Portal
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Admin & engineer access. Clients use the main Quantract app.
        </p>

        <div className="mt-6 space-y-2">
          <Link
            href="/admin/login"
            className="block w-full rounded-2xl bg-slate-900 px-4 py-3 text-center font-semibold text-white hover:bg-slate-800"
          >
            Admin Login
          </Link>

          <Link
            href="/engineer/login"
            className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center font-semibold text-slate-900 hover:bg-slate-50"
          >
            Engineer Login
          </Link>

          <InstallPwaButton label="Install Ops App" variant="secondary" />
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold text-slate-900">
            Installable app
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Install this Ops app for quick access on phones & tablets.
          </p>
        </div>
      </div>
    </main>
  );
}
