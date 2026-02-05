import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { getCachedJobs, setCachedJobs } from "../api/jobsCache";
import { getCachedDispatch, setCachedDispatch, type DispatchEntry } from "../api/dispatchCache";
import { useTimer } from "../timer/TimerContext";
import type { JobListItem } from "../types/job";

type Segment = "today" | "tomorrow" | "next7" | "all";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
}

function formatElapsed(startISO: string) {
  const s = Math.floor((Date.now() - new Date(startISO).getTime()) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** Merged view item: dispatch entry (primary) or unscheduled job fallback */
type ScheduleItem = {
  id: string;
  jobId: string;
  title: string;
  clientName: string | null;
  siteAddress: string | null;
  jobStatus: string;
  dispatchStatus: string | null; // null = from jobs list, not dispatch
  scheduledAtISO: string | null;
  startAtISO: string | null;
  endAtISO: string | null;
  notes: string | null;
  /** The dispatch entry id (used for status updates) */
  entryId: string | null;
};

const DISPATCH_STATUS_BG: Record<string, string> = {
  scheduled: "#fef9c3",
  en_route: "#dbeafe",
  on_site: "#e0e7ff",
  in_progress: "#dcfce7",
  completed: "#e2e8f0",
};

const DISPATCH_STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  en_route: "En Route",
  on_site: "On Site",
  in_progress: "In Progress",
  completed: "Completed",
};

export default function TodayScreen() {
  const nav = useNavigation<NativeStackNavigationProp<any>>();
  const { activeTimer, isPending } = useTimer();
  const [elapsed, setElapsed] = useState("");
  const [dispatchEntries, setDispatchEntries] = useState<DispatchEntry[]>([]);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [offline, setOffline] = useState(false);

  // Tick timer display
  useEffect(() => {
    if (!activeTimer) return;
    setElapsed(formatElapsed(activeTimer.startedAtISO));
    const iv = setInterval(() => setElapsed(formatElapsed(activeTimer.startedAtISO)), 10_000);
    return () => clearInterval(iv);
  }, [activeTimer]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [segment, setSegment] = useState<Segment>("today");

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      // Fetch dispatch entries (primary) and full jobs list in parallel
      const [dispatchRes, jobsRes] = await Promise.all([
        apiFetch("/api/engineer/dispatch/today").catch(() => null),
        apiFetch("/api/engineer/jobs"),
      ]);

      // Process dispatch
      if (dispatchRes) {
        const dispatchData = await dispatchRes.json().catch(() => null);
        if (dispatchData?.ok && Array.isArray(dispatchData.entries)) {
          setDispatchEntries(dispatchData.entries);
          setCachedDispatch(dispatchData.entries);
        }
      }

      // Process jobs (for next7/all and as fallback)
      const jobsData = await jobsRes.json();
      if (jobsData?.ok && Array.isArray(jobsData.jobs)) {
        setJobs(jobsData.jobs);
        setCachedJobs(jobsData.jobs);
      }
      setOffline(false);
    } catch {
      // On failure, try caches
      if (!isRefresh) {
        const [cachedDispatch, cachedJobs] = await Promise.all([
          getCachedDispatch(),
          getCachedJobs(),
        ]);
        if (cachedDispatch) setDispatchEntries(cachedDispatch);
        if (cachedJobs) setJobs(cachedJobs);
        if (cachedDispatch || cachedJobs) setOffline(true);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Render cache first, then refresh
    (async () => {
      const [cachedDispatch, cachedJobs] = await Promise.all([
        getCachedDispatch(),
        getCachedJobs(),
      ]);
      if (cachedDispatch && cachedDispatch.length > 0) setDispatchEntries(cachedDispatch);
      if (cachedJobs && cachedJobs.length > 0) {
        setJobs(cachedJobs);
        setLoading(false);
      }
      fetchData();
    })();
  }, [fetchData]);

  /** Build merged schedule items from dispatch entries + jobs fallback */
  const items = useMemo((): ScheduleItem[] => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrowStart = endOfDay(now); // midnight tonight = tomorrow start
    const tomorrowEnd = new Date(tomorrowStart.getTime() + 86_400_000);

    if (segment === "today") {
      // Dispatch entries are already filtered to today by the API
      // Convert to ScheduleItem
      const dispatchItems: ScheduleItem[] = dispatchEntries.map((e) => ({
        id: e.id,
        jobId: e.jobId,
        title: e.jobTitle || `Job`,
        clientName: e.clientName,
        siteAddress: [e.siteAddress, e.sitePostcode].filter(Boolean).join(", ") || null,
        jobStatus: e.jobStatus,
        dispatchStatus: e.status,
        scheduledAtISO: e.startAtISO,
        startAtISO: e.startAtISO,
        endAtISO: e.endAtISO,
        notes: e.notes,
        entryId: e.id,
      }));

      // Also include any jobs scheduled today that aren't in dispatch
      const dispatchJobIds = new Set(dispatchEntries.map((e) => e.jobId));
      const extraJobItems: ScheduleItem[] = jobs
        .filter((j) => {
          if (dispatchJobIds.has(j.id)) return false;
          if (!j.scheduledAtISO) return false;
          const d = new Date(j.scheduledAtISO);
          return d >= todayStart && d < todayEnd;
        })
        .map((j) => ({
          id: j.id,
          jobId: j.id,
          title: j.title || `Job #${j.jobNumber || j.id.slice(0, 8)}`,
          clientName: j.clientName || null,
          siteAddress: j.siteAddress || null,
          jobStatus: j.status,
          dispatchStatus: null,
          scheduledAtISO: j.scheduledAtISO || null,
          startAtISO: null,
          endAtISO: null,
          notes: null,
          entryId: null,
        }));

      return [...dispatchItems, ...extraJobItems];
    }

    if (segment === "tomorrow") {
      // Filter jobs scheduled for tomorrow (dispatch API only returns today)
      return jobs
        .filter((j) => {
          if (!j.scheduledAtISO) return false;
          const d = new Date(j.scheduledAtISO);
          return d >= tomorrowStart && d < tomorrowEnd;
        })
        .map((j) => ({
          id: j.id,
          jobId: j.id,
          title: j.title || `Job #${j.jobNumber || j.id.slice(0, 8)}`,
          clientName: j.clientName || null,
          siteAddress: j.siteAddress || null,
          jobStatus: j.status,
          dispatchStatus: null,
          scheduledAtISO: j.scheduledAtISO || null,
          startAtISO: null,
          endAtISO: null,
          notes: null,
          entryId: null,
        }));
    }

    if (segment === "next7") {
      const end = new Date(now);
      end.setDate(end.getDate() + 7);
      return jobs
        .filter((j) => {
          if (!j.scheduledAtISO) return false;
          const d = new Date(j.scheduledAtISO);
          return d >= todayStart && d < endOfDay(end);
        })
        .map((j) => ({
          id: j.id,
          jobId: j.id,
          title: j.title || `Job #${j.jobNumber || j.id.slice(0, 8)}`,
          clientName: j.clientName || null,
          siteAddress: j.siteAddress || null,
          jobStatus: j.status,
          dispatchStatus: null,
          scheduledAtISO: j.scheduledAtISO || null,
          startAtISO: null,
          endAtISO: null,
          notes: null,
          entryId: null,
        }));
    }

    // "all"
    return jobs.map((j) => ({
      id: j.id,
      jobId: j.id,
      title: j.title || `Job #${j.jobNumber || j.id.slice(0, 8)}`,
      clientName: j.clientName || null,
      siteAddress: j.siteAddress || null,
      jobStatus: j.status,
      dispatchStatus: null,
      scheduledAtISO: j.scheduledAtISO || null,
      startAtISO: null,
      endAtISO: null,
      notes: null,
      entryId: null,
    }));
  }, [dispatchEntries, jobs, segment]);

  const renderItem = useCallback(
    ({ item }: { item: ScheduleItem }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => nav.navigate("JobDetail", {
          jobId: item.jobId,
          job: jobs.find((j) => j.id === item.jobId),
          entryId: item.entryId,
          dispatchStatus: item.dispatchStatus,
        })}
      >
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          {/* Dispatch status badge (if from dispatch) or job status */}
          {item.dispatchStatus ? (
            <View style={[
              styles.badge,
              { backgroundColor: DISPATCH_STATUS_BG[item.dispatchStatus] || "#e2e8f0" },
            ]}>
              <Text style={styles.badgeText}>
                {DISPATCH_STATUS_LABEL[item.dispatchStatus] || item.dispatchStatus}
              </Text>
            </View>
          ) : (
            <View style={[styles.badge, STATUS_BG[item.jobStatus] && { backgroundColor: STATUS_BG[item.jobStatus] }]}>
              <Text style={styles.badgeText}>{item.jobStatus.replace("_", " ")}</Text>
            </View>
          )}
        </View>
        {item.clientName ? <Text style={styles.sub}>{item.clientName}</Text> : null}
        {item.siteAddress ? <Text style={styles.sub} numberOfLines={1}>{item.siteAddress}</Text> : null}
        {/* Time range for dispatch entries, date for jobs */}
        {item.startAtISO && item.endAtISO ? (
          <Text style={styles.sub}>
            {formatTime(item.startAtISO)} – {formatTime(item.endAtISO)}
          </Text>
        ) : item.scheduledAtISO ? (
          <Text style={styles.sub}>
            {new Date(item.scheduledAtISO).toLocaleString("en-GB", {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </Text>
        ) : null}
        {item.notes ? (
          <Text style={styles.noteText} numberOfLines={1}>{item.notes}</Text>
        ) : null}
      </TouchableOpacity>
    ),
    [nav, jobs],
  );

  if (loading && jobs.length === 0 && dispatchEntries.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline indicator */}
      {offline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Offline — showing cached data</Text>
        </View>
      ) : null}

      {/* Active timer banner */}
      {activeTimer ? (
        <TouchableOpacity
          style={styles.timerBanner}
          activeOpacity={0.7}
          onPress={() => {
            const job = jobs.find((j) => j.id === activeTimer.jobId);
            nav.navigate("JobDetail", { jobId: activeTimer.jobId, job });
          }}
        >
          <Text style={styles.timerBannerText}>
            Timer running {elapsed}{isPending ? " (pending)" : ""}
          </Text>
          <Text style={styles.timerBannerSub}>Tap to view job</Text>
        </TouchableOpacity>
      ) : null}

      {/* Segmented control */}
      <View style={styles.segRow}>
        {(["today", "tomorrow", "next7", "all"] as Segment[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.segBtn, segment === s && styles.segBtnActive]}
            onPress={() => setSegment(s)}
          >
            <Text style={[styles.segText, segment === s && styles.segTextActive]}>
              {s === "today" ? "Today" : s === "tomorrow" ? "Tomorrow" : s === "next7" ? "7 days" : "All"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {segment === "today"
                ? "Nothing scheduled today"
                : segment === "tomorrow"
                ? "Nothing scheduled tomorrow"
                : "No jobs"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const STATUS_BG: Record<string, string> = {
  new: "#dbeafe",
  scheduled: "#fef9c3",
  in_progress: "#dcfce7",
  completed: "#e2e8f0",
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  list: { padding: 12, paddingBottom: 32 },
  segRow: {
    flexDirection: "row",
    margin: 12,
    marginBottom: 0,
    borderRadius: 10,
    backgroundColor: "#e2e8f0",
    padding: 3,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  segBtnActive: { backgroundColor: "#fff" },
  segText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  segTextActive: { color: "#0f172a" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#334155", textTransform: "capitalize" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 3 },
  noteText: { fontSize: 12, color: "#94a3b8", marginTop: 4, fontStyle: "italic" },
  emptyText: { fontSize: 15, color: "#94a3b8" },
  timerBanner: {
    backgroundColor: "#dcfce7",
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  timerBannerText: { fontSize: 14, fontWeight: "700", color: "#166534" },
  timerBannerSub: { fontSize: 12, color: "#166534", marginTop: 2 },
  offlineBanner: {
    backgroundColor: "#fef3c7",
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  offlineBannerText: { fontSize: 12, fontWeight: "600", color: "#92400e" },
});
