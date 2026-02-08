"use client";

import { Zap } from "lucide-react";

interface MainSwitchBreakerProps {
  ocpdType: string;
  ocpdRating: string;
  boardType: string;
}

export function MainSwitchBreaker({ ocpdType, ocpdRating, boardType }: MainSwitchBreakerProps) {
  const label = boardType === "three-phase"
    ? "TP&N Isolator"
    : `Main ${ocpdType || "Switch"}`;

  return (
    <div className="flex justify-center">
      <div
        className="w-24 h-24 rounded-xl border-[3px] border-amber-500 bg-gradient-to-b from-amber-500/10 to-transparent flex flex-col items-center justify-center bg-[var(--card)]"
        style={{ boxShadow: "0 0 20px rgba(245,158,11,0.3)" }}
      >
        <Zap className="w-6 h-6 text-amber-500 mb-1" />
        <div className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider leading-tight text-center">
          {label}
        </div>
        <div className="font-mono text-[28px] font-bold text-[var(--foreground)] leading-tight">
          {ocpdRating || "?"}A
        </div>
      </div>
    </div>
  );
}
