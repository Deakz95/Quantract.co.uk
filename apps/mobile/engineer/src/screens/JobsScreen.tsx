import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { getCachedJobs, setCachedJobs } from "../api/jobsCache";
import type { JobListItem } from "../types/job";

export default function JobsScreen() {
  const nav = useNavigation<NativeStackNavigationProp<any>>();
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");

  const fetchJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiFetch("/api/engineer/jobs");
      const data = await res.json();
      if (data?.ok && Array.isArray(data.jobs)) {
        setJobs(data.jobs);
        setCachedJobs(data.jobs);
      }
    } catch {
      if (!isRefresh) {
        const cached = await getCachedJobs();
        if (cached) setJobs(cached);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
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
    if (!query.trim()) return jobs;
    const q = query.toLowerCase();
    return jobs.filter(
      (j) =>
        (j.title || "").toLowerCase().includes(q) ||
        (j.clientName || "").toLowerCase().includes(q) ||
        (j.siteAddress || "").toLowerCase().includes(q) ||
        (j.jobNumber != null && String(j.jobNumber).includes(q)),
    );
  }, [jobs, query]);

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
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs..."
          placeholderTextColor="#94a3b8"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
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
              {query ? "No matches" : "No jobs assigned"}
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
  searchWrap: { paddingHorizontal: 12, paddingTop: 12 },
  searchInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
  },
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
});
