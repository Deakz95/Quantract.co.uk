import Link from "next/link";

export default function AuthErrorPage({ searchParams }: { searchParams: { reason?: string } }) {
  const reason = searchParams?.reason || "unknown";
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-semibold">Sign-in link error</h1>
        <p className="mt-2 text-sm text-slate-600">
          We couldn’t sign you in. Reason: <span className="font-mono">{reason}</span>
        </p>
        <div className="mt-4 flex gap-3">
          <Link className="underline text-sm" href="/admin/login">Admin login</Link>
          <Link className="underline text-sm" href="/engineer/login">Engineer login</Link>
          <Link className="underline text-sm" href="/client/login">Client login</Link>
        </div>
      </div>
    </div>
  );
}
