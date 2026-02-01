"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";

type MapPin = {
  id: string;
  type: "job" | "enquiry";
  status: string;
  label: string;
  lat: number;
  lng: number;
  href: string;
};

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

const FILTERS = [
  { key: "quoted", label: "Quoted", color: "#9333ea", type: "job" },
  { key: "scheduled", label: "Scheduled", color: "#2563eb", type: "job" },
  { key: "in_progress", label: "In Progress", color: "#ea580c", type: "job" },
  { key: "completed", label: "Completed", color: "#16a34a", type: "job" },
  { key: "enquiry", label: "Enquiries", color: "#eab308", type: "enquiry" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function JobsMap() {
  const [pins, setPins] = useState<MapPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    quoted: true,
    scheduled: true,
    in_progress: true,
    completed: true,
    enquiry: true,
  });

  useEffect(() => {
    fetch("/api/internal/dashboard/map-pins")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          if (process.env.NODE_ENV === "development") console.log("[JobsMap] pins received:", d.pins?.length ?? 0);
          setPins(d.pins);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visiblePins = useMemo(() =>
    pins.filter((p) => {
      if (p.type === "enquiry") return filters.enquiry;
      return filters[p.status as FilterKey] ?? true;
    }),
    [pins, filters]
  );

  function toggle(key: FilterKey) {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (loading) {
    return <div className="aspect-video bg-[var(--muted)] rounded-xl animate-pulse" />;
  }

  if (pins.length === 0) {
    return (
      <div className="aspect-video bg-[var(--muted)] rounded-xl flex items-center justify-center">
        <div className="text-center text-[var(--muted-foreground)]">
          <p className="text-sm">No jobs with locations yet</p>
          <p className="text-xs mt-1">Add a postcode to a site to see pins here.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
        {FILTERS.map((f) => (
          <label key={f.key} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filters[f.key]}
              onChange={() => toggle(f.key)}
              className="sr-only"
            />
            <span
              className="inline-block w-2.5 h-2.5 rounded-full shrink-0 border border-white/50"
              style={{
                backgroundColor: filters[f.key] ? f.color : "var(--border)",
              }}
            />
            <span
              className="text-xs"
              style={{
                color: filters[f.key] ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              {f.label}
            </span>
          </label>
        ))}
      </div>

      {visiblePins.length === 0 ? (
        <div className="aspect-video bg-[var(--muted)] rounded-xl flex items-center justify-center">
          <p className="text-sm text-[var(--muted-foreground)]">No pins selected</p>
        </div>
      ) : (
        <LeafletMap pins={visiblePins} />
      )}
    </div>
  );
}
