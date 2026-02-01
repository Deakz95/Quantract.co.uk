"use client";

import TimelineCard from "./TimelineCard";
import type { TimelineItem } from "./types";

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
    return "Today";

  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  )
    return "Yesterday";

  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** Group items into [label, items[]] preserving original sort order. */
function groupByDate(items: TimelineItem[]): [string, TimelineItem[]][] {
  const groups: [string, TimelineItem[]][] = [];
  let lastLabel = "";
  for (const item of items) {
    const label = dateLabel(item.ts);
    if (label !== lastLabel) {
      groups.push([label, [item]]);
      lastLabel = label;
    } else {
      groups[groups.length - 1][1].push(item);
    }
  }
  return groups;
}

export default function TimelineList({ items }: { items: TimelineItem[] }) {
  const groups = groupByDate(items);

  return (
    <div className="space-y-8">
      {groups.map(([label, dayItems]) => (
        <section key={label}>
          {/* Date heading */}
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-4">
            {label}
          </h3>

          {/* Timeline spine */}
          <div className="relative pl-5 ml-[3px]">
            {/* Vertical line */}
            <div className="absolute left-0 top-1 bottom-1 w-px bg-[var(--border)]" />

            <div className="space-y-6">
              {dayItems.map((item) => (
                <div key={item.id} className="relative">
                  {/* Spine dot */}
                  <div className="absolute -left-5 top-[14px] -translate-x-1/2 w-[7px] h-[7px] rounded-full bg-[var(--border)] ring-[3px] ring-[var(--background)]" />
                  <TimelineCard item={item} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
