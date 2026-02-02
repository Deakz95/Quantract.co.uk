"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// ── Types ────────────────────────────────────────────────────────

export type JobCardData = {
  id: string;
  title?: string;
  clientName?: string;
  siteAddress?: string;
  status: string;
  scheduledAtISO?: string;
};

// ── Helpers ──────────────────────────────────────────────────────

function googleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

const STATUS_COLORS: Record<string, string> = {
  in_progress: "border-l-green-500",
  scheduled: "border-l-amber-500",
  new: "border-l-blue-500",
  completed: "border-l-gray-400",
};

// ── Swipeable Card ───────────────────────────────────────────────

const SWIPE_THRESHOLD = 60;
const ACTIONS_WIDTH = 140;

export default function EngineerJobCard({
  job,
  openCardId,
  onSwipeOpen,
  isMobile,
}: {
  job: JobCardData;
  openCardId: string | null;
  onSwipeOpen: (id: string | null) => void;
  isMobile: boolean;
}) {
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isOpen = openCardId === job.id;

  // Close when another card opens
  const translateX = isOpen ? -ACTIONS_WIDTH : 0;

  function onTouchStart(e: React.TouchEvent) {
    if (!isMobile) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = 0;
    swiping.current = false;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isMobile) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // If vertical movement is larger, let scroll happen
    if (!swiping.current && Math.abs(dy) > Math.abs(dx)) return;

    if (Math.abs(dx) > 10) swiping.current = true;
    if (!swiping.current) return;

    // Only allow left swipe (negative) when closed, or right swipe when open
    let clamped = dx;
    if (!isOpen) {
      clamped = Math.min(0, Math.max(-ACTIONS_WIDTH - 20, dx));
    } else {
      clamped = Math.min(ACTIONS_WIDTH, Math.max(0, dx)) - ACTIONS_WIDTH;
    }
    currentX.current = clamped;

    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${clamped}px)`;
      cardRef.current.style.transition = "none";
    }
  }

  function onTouchEnd() {
    if (!isMobile || !swiping.current) return;
    swiping.current = false;

    const dx = currentX.current;
    if (cardRef.current) {
      cardRef.current.style.transition = "transform 200ms ease-out";
    }

    if (!isOpen && dx < -SWIPE_THRESHOLD) {
      onSwipeOpen(job.id);
    } else if (isOpen && dx > -ACTIONS_WIDTH + SWIPE_THRESHOLD) {
      onSwipeOpen(null);
    } else {
      // Snap back
      if (cardRef.current) {
        cardRef.current.style.transform = `translateX(${isOpen ? -ACTIONS_WIDTH : 0}px)`;
      }
    }
  }

  // Sync transform with isOpen state
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.transition = "transform 200ms ease-out";
      cardRef.current.style.transform = `translateX(${translateX}px)`;
    }
  }, [translateX]);

  const scheduled = job.scheduledAtISO ? new Date(job.scheduledAtISO) : null;
  const statusColor = STATUS_COLORS[job.status] || "border-l-gray-300";

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* ── Revealed action buttons (behind the card) ── */}
      {isMobile && (
        <div className="absolute inset-y-0 right-0 flex" style={{ width: ACTIONS_WIDTH }}>
          <Link
            href={`/engineer/jobs/${job.id}`}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-blue-600 text-white text-xs font-medium"
          >
            <span className="text-base">&#8594;</span>
            <span>Open</span>
          </Link>
          {job.siteAddress && (
            <a
              href={googleMapsUrl(job.siteAddress)}
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 flex-col items-center justify-center gap-0.5 bg-emerald-600 text-white text-xs font-medium"
            >
              <span className="text-base">&#9737;</span>
              <span>Nav</span>
            </a>
          )}
        </div>
      )}

      {/* ── Card face ── */}
      <div
        ref={cardRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`relative border-l-4 ${statusColor} rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 will-change-transform`}
      >
        <Link href={`/engineer/jobs/${job.id}`} className="block">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-[var(--foreground)] line-clamp-2">
                {job.title || "Job"}
              </div>
              <div className="mt-0.5 text-xs text-[var(--muted-foreground)] line-clamp-1">
                {[job.clientName, job.siteAddress].filter(Boolean).join(" \u2022 ") || "\u2014"}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge className="text-[10px]">{job.status.replace("_", " ")}</Badge>
              {scheduled && (
                <span className="text-xs font-semibold tabular-nums text-[var(--foreground)]">
                  {scheduled.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
          {scheduled && (
            <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
              {scheduled.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
            </div>
          )}
        </Link>

        {/* ── Quick actions row (mobile fallback for non-swipe) ── */}
        {isMobile && (
          <div className="mt-2 flex items-center gap-2 border-t border-[var(--border)] pt-2">
            <Link
              href={`/engineer/jobs/${job.id}`}
              className="inline-flex items-center gap-1 min-h-[36px] px-2.5 text-[11px] font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              Open
            </Link>
            {job.siteAddress && (
              <a
                href={googleMapsUrl(job.siteAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 min-h-[36px] px-2.5 text-[11px] font-medium rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              >
                Navigate
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
