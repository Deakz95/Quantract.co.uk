// src/components/ui/Stepper.tsx
import { cn } from "@/lib/cn";

export function Stepper({
  steps,
  active,
}: {
  steps: string[];
  active: number; // 0-based
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {steps.map((s, i) => {
        const on = i <= active;
        return (
          <div
            key={s}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
              on ? "border-[var(--primary)] bg-[var(--primary)] text-white" : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
            )}
          >
            <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]", on ? "bg-white/20" : "bg-[var(--muted)]")}>{i + 1}</span>
            {s}
          </div>
        );
      })}
    </div>
  );
}
