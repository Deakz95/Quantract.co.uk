"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EngineerJobCard, { type JobCardData } from "@/components/engineer/EngineerJobCard";

type Tab = "today" | "next" | "all";

const CACHE_KEY = "qt_engineer_jobs_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

// ── Date helpers ─────────────────────────────────────────────────

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isToday(isoStr: string) {
  const d = new Date(isoStr);
  const now = new Date();
  return d >= startOfDay(now) && d < endOfDay(now);
}

function isNext7Days(isoStr: string) {
  const d = new Date(isoStr);
  const now = new Date();
  const start = endOfDay(now); // exclude today
  const end = endOfDay(addDays(now, 7));
  return d >= start && d < end;
}

// ── Skeleton ─────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 h-20" />
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────

export default function EngineerJobsPage() {
  const [jobs, setJobs] = useState<JobCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState(false);
  const isMobile = useIsMobile();
  const [tab, setTab] = useState<Tab>(isMobile ? "today" : "all");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  // Sync default tab when isMobile changes (SSR → client)
  useEffect(() => {
    if (isMobile && tab === "all" && jobs.length > 0) {
      // Only auto-switch if user hasn't interacted yet
    }
  }, [isMobile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const r = await fetch("/api/engineer/jobs", { cache: "no-store" });
        const d = await r.json().catch(() => ({}));
        if (!cancelled && r.ok) {
          const next = Array.isArray(d.jobs) ? d.jobs : [];
          // Normalize: API returns nested client/site objects
          const normalized: JobCardData[] = next.map((j: any) => ({
            id: j.id,
            title: j.title,
            clientName: j.clientName || j.client?.name,
            siteAddress: j.siteAddress || [j.site?.address1, j.site?.city, j.site?.postcode].filter(Boolean).join(", ") || undefined,
            status: j.status,
            scheduledAtISO: j.scheduledAtISO || j.scheduledAt,
          }));
          setJobs(normalized);
          setOffline(false);
          localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), jobs: normalized }));
        }
      } catch {
        if (cancelled) return;
        setOffline(true);
        try {
          const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
          if (cached && Array.isArray(cached.jobs) && typeof cached.at === "number") {
            if (Date.now() - cached.at <= CACHE_TTL_MS) {
              setJobs(cached.jobs);
            } else {
              setError(true);
            }
          } else {
            setError(true);
          }
        } catch {
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Filtered lists ─────────────────────────────────────────────

  const todayJobs = useMemo(
    () => jobs.filter((j) => j.scheduledAtISO && isToday(j.scheduledAtISO))
      .sort((a, b) => new Date(a.scheduledAtISO!).getTime() - new Date(b.scheduledAtISO!).getTime()),
    [jobs],
  );

  const nextJobs = useMemo(
    () => jobs.filter((j) => j.scheduledAtISO && isNext7Days(j.scheduledAtISO))
      .sort((a, b) => new Date(a.scheduledAtISO!).getTime() - new Date(b.scheduledAtISO!).getTime()),
    [jobs],
  );

  const allJobs = useMemo(
    () => [...jobs].sort((a, b) => {
      // Scheduled first, then by date desc
      if (a.scheduledAtISO && !b.scheduledAtISO) return -1;
      if (!a.scheduledAtISO && b.scheduledAtISO) return 1;
      if (a.scheduledAtISO && b.scheduledAtISO) return new Date(a.scheduledAtISO).getTime() - new Date(b.scheduledAtISO).getTime();
      return 0;
    }),
    [jobs],
  );

  const filteredJobs = tab === "today" ? todayJobs : tab === "next" ? nextJobs : allJobs;

  // Close swipe actions when tapping outside
  useEffect(() => {
    if (!openCardId) return;
    function handleClick() { setOpenCardId(null); }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openCardId]);

  // ── Render ─────────────────────────────────────────────────────

  if (loading) return <SkeletonCards />;

  if (error && jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm font-medium text-[var(--foreground)]">Couldn&apos;t load your jobs.</p>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">Check your connection and try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--muted)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--border)] transition-colors min-h-[44px]"
          >
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {offline && (
        <p className="text-xs text-[var(--muted-foreground)]">Offline mode — showing cached data</p>
      )}

      {/* ── Segmented control ── */}
      <div className="flex rounded-lg border border-[var(--border)] bg-[var(--muted)] p-0.5">
        {(["today", "next", "all"] as Tab[]).map((t) => {
          const count = t === "today" ? todayJobs.length : t === "next" ? nextJobs.length : allJobs.length;
          const active = tab === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setOpenCardId(null); }}
              className={`flex-1 min-h-[40px] rounded-md text-xs font-semibold transition-colors ${
                active
                  ? "bg-[var(--background)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {t === "today" ? "Today" : t === "next" ? "Next 7d" : "All"}{" "}
              <span className="tabular-nums">({count})</span>
            </button>
          );
        })}
      </div>

      {/* ── Job list ── */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            {tab === "today" ? (
              <>
                <p className="text-sm font-medium text-[var(--foreground)]">No jobs today</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">You&apos;re clear — check upcoming jobs or view all.</p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTab("next")}
                    className="inline-flex items-center min-h-[40px] px-3 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    View Next
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("all")}
                    className="inline-flex items-center min-h-[40px] px-3 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                  >
                    View All
                  </button>
                </div>
              </>
            ) : tab === "next" ? (
              <>
                <p className="text-sm font-medium text-[var(--foreground)]">No upcoming jobs this week</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">Nothing scheduled in the next 7 days.</p>
                <button
                  type="button"
                  onClick={() => setTab("all")}
                  className="mt-3 inline-flex items-center min-h-[40px] px-3 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  View All
                </button>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Nothing assigned yet</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-[var(--muted-foreground)]">Once you&apos;re scheduled onto a job, it will appear here.</div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredJobs.map((j) => (
            <EngineerJobCard
              key={j.id}
              job={j}
              openCardId={openCardId}
              onSwipeOpen={setOpenCardId}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}

      {/* ── Today FAB (mobile only, when not on Today tab) ── */}
      {isMobile && tab !== "today" && (
        <button
          type="button"
          onClick={() => { setTab("today"); setOpenCardId(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="fixed bottom-20 right-4 z-20 flex h-10 items-center gap-1.5 rounded-full bg-[var(--foreground)] px-3.5 text-xs font-semibold text-[var(--background)] shadow-lg"
        >
          Today
        </button>
      )}
    </div>
  );
}
