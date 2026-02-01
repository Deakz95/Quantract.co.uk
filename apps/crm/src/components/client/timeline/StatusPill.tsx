"use client";

const STATUS_MAP: Record<string, { label: string; bg: string; fg: string }> = {
  completed:   { label: "Completed",   bg: "rgba(22,163,74,0.08)",  fg: "#15803d" },
  paid:        { label: "Paid",        bg: "rgba(22,163,74,0.08)",  fg: "#15803d" },
  issued:      { label: "Issued",      bg: "rgba(22,163,74,0.08)",  fg: "#15803d" },
  sent:        { label: "Sent",        bg: "rgba(37,99,235,0.08)",  fg: "#1d4ed8" },
  in_progress: { label: "In progress", bg: "rgba(234,88,12,0.08)",  fg: "#c2410c" },
  scheduled:   { label: "Scheduled",   bg: "rgba(37,99,235,0.08)",  fg: "#1d4ed8" },
  quoted:      { label: "Quoted",      bg: "rgba(147,51,234,0.08)", fg: "#7c3aed" },
  overdue:     { label: "Payment due", bg: "rgba(220,38,38,0.06)",  fg: "#b91c1c" },
  unpaid:      { label: "Unpaid",      bg: "rgba(234,88,12,0.08)",  fg: "#c2410c" },
};

export default function StatusPill({ status }: { status?: string }) {
  if (!status) return null;
  const cfg = STATUS_MAP[status] || {
    label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    bg: "var(--muted)",
    fg: "var(--muted-foreground)",
  };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium leading-4 rounded-md"
      style={{ backgroundColor: cfg.bg, color: cfg.fg }}
    >
      {cfg.label}
    </span>
  );
}
