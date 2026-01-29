import Link from "next/link";

export const metadata = {
  title: "About | Quantract",
  description: "About Quantract - Professional Business Management",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="w-full max-w-2xl">
        <div className="bg-[var(--card)] rounded-2xl shadow-xl p-8 border border-[var(--border)]">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-xl mb-4">
              <span className="text-white font-bold text-2xl">Q</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">About Quantract</h1>
            <p className="text-[var(--muted-foreground)] mt-2">Professional Business Management</p>
          </div>

          <div className="space-y-4 text-sm text-[var(--muted-foreground)]">
            <p>
              Quantract is a comprehensive business management platform built for electrical contractors
              and building services professionals. We help you manage quotes, invoices, jobs, clients,
              and your entire sales pipeline from one place.
            </p>
            <p>
              From enquiry to invoice, Quantract streamlines your workflow so you can focus on what
              matters most — delivering quality work to your clients.
            </p>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/sign-up"
              className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors text-sm"
            >
              Get Started
            </Link>
            <Link
              href="/"
              className="px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-semibold hover:bg-[var(--muted)] transition-colors text-sm"
            >
              Back to Home
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
            <p>Quantract Ltd — Electrical &amp; Building Services</p>
            <p className="mt-1">
              <a href="mailto:support@quantract.co.uk" className="hover:text-[var(--primary)]">
                support@quantract.co.uk
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
