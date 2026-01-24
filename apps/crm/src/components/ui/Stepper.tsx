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
              on ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700"
            )}
          >
            <span className={cn("inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]", on ? "bg-white/20" : "bg-slate-100")}>{i + 1}</span>
            {s}
          </div>
        );
      })}
    </div>
  );
}
