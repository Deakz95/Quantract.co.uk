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
import { useTimer } from "../timer/TimerContext";
import type { JobListItem } from "../types/job";

type Segment = "today" | "next7" | "all";

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

export default function TodayScreen() {
  const nav = useNavigation<NativeStackNavigationProp<any>>();
  const { activeTimer, isPending } = useTimer();
  const [elapsed, setElapsed] = useState("");
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

  const fetchJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiFetch("/api/engineer/jobs");
      const data = await res.json();
      if (data?.ok && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
        setCachedJobs(data.jobs);
        setOffline(false);
      }
    } catch {
      // On failure, try cache
      if (!isRefresh) {
        const cached = await getCachedJobs();
        if (cached) {
          setJobs(cached);
          setOffline(true);
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Render cache first, then refresh
    (async () => {
      const cached = await getCachedJobs();
      if (cached && cached.length > 0) {
        setJobs(cached);
        setLoading(false);
      }
      fetchJobs();
    })();
  }, [fetchJobs]);

  const filtered = useMemo(() => {
    const now = new Date();
    return jobs.filter((j) => {
      if (!j.scheduledAtISO) return segment === "all";
      const d = new Date(j.scheduledAtISO);
      if (segment === "today") return d >= startOfDay(now) && d < endOfDay(now);
      if (segment === "next7") {
        const end = new Date(now);
        end.setDate(end.getDate() + 7);
        return d >= startOfDay(now) && d < endOfDay(end);
      }
      return true;
    });
  }, [jobs, segment]);

  const renderItem = useCallback(
    ({ item }: { item: JobListItem }) => (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => nav.navigate("JobDetail", { jobId: item.id, job: item })}
      >
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title || `Job #${item.jobNumber || item.id.slice(0, 8)}`}
          </Text>
          <View style={[styles.badge, STATUS_BG[item.status] && { backgroundColor: STATUS_BG[item.status] }]}>
            <Text style={styles.badgeText}>{item.status.replace("_", " ")}</Text>
          </View>
        </View>
        {item.clientName ? <Text style={styles.sub}>{item.clientName}</Text> : null}
        {item.siteAddress ? <Text style={styles.sub} numberOfLines={1}>{item.siteAddress}</Text> : null}
        {item.scheduledAtISO ? (
          <Text style={styles.sub}>
            {new Date(item.scheduledAtISO).toLocaleString("en-GB", {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </Text>
        ) : null}
      </TouchableOpacity>
    ),
    [nav],
  );

  if (loading && jobs.length === 0) {
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
        {(["today", "next7", "all"] as Segment[]).map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.segBtn, segment === s && styles.segBtnActive]}
            onPress={() => setSegment(s)}
          >
            <Text style={[styles.segText, segment === s && styles.segTextActive]}>
              {s === "today" ? "Today" : s === "next7" ? "Next 7 days" : "All"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(j) => j.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchJobs(true)} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {segment === "today" ? "Nothing scheduled today" : "No jobs"}
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
