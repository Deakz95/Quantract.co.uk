"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  FileBarChart,
  Shield,
  Activity,
  HelpCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/useToast";

const NAV_CARDS: {
  href: string;
  label: string;
  desc: string;
  Icon: typeof FileText;
  bg: string;
  fg: string;
}[] = [
  {
    href: "/client/timeline",
    label: "Activity",
    desc: "Jobs, invoices, certificates, and quotes in one timeline.",
    Icon: Activity,
    bg: "rgba(37,99,235,0.08)",
    fg: "#2563eb",
  },
  {
    href: "/client/quotes",
    label: "Quotes",
    desc: "Review and accept quotes for upcoming work.",
    Icon: FileBarChart,
    bg: "rgba(147,51,234,0.08)",
    fg: "#7c3aed",
  },
  {
    href: "/client/invoices",
    label: "Invoices",
    desc: "View, download, or pay your invoices.",
    Icon: FileText,
    bg: "rgba(139,92,246,0.08)",
    fg: "#7c3aed",
  },
  {
    href: "/client/certificates",
    label: "Certificates",
    desc: "Download your compliance certificates.",
    Icon: Shield,
    bg: "rgba(16,185,129,0.08)",
    fg: "#059669",
  },
  {
    href: "/client/troubleshoot",
    label: "Troubleshooter",
    desc: "Having issues? Check common fixes here.",
    Icon: HelpCircle,
    bg: "rgba(234,88,12,0.08)",
    fg: "#c2410c",
  },
];

export default function ClientHome() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (params.get("welcome") === "1") {
      toast({
        title: "Welcome \u2014 profile created",
        variant: "success",
      });
      router.replace("/client");
    }
  }, [params, router, toast]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-[var(--muted-foreground)]">
        Everything you need in one place.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {NAV_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex gap-3.5 rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 hover:bg-[var(--muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2"
          >
            <div
              className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: card.bg }}
            >
              <card.Icon size={20} strokeWidth={1.8} style={{ color: card.fg }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {card.label}
              </p>
              <p className="text-[13px] leading-snug text-[var(--muted-foreground)] mt-0.5">
                {card.desc}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-4">
        <p className="text-xs text-[var(--muted-foreground)]">
          What happens next: review your quote, accept it, sign the agreement, then use invoices here to pay or download receipts. You can also access your documents anytime using the links we email you.
        </p>
      </div>
    </div>
  );
}
