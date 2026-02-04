import React, { useCallback, useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "qt_checks_cache_v1";

type CheckItem = {
  id: string;
  title: string;
  isRequired: boolean;
  status: string;
};

type AssetInfo = {
  id: string;
  type: string;
  name: string;
  identifier: string | null;
};

export type CheckListItem = {
  id: string;
  title: string;
  status: string;
  dueAt: string;
  completedAt: string | null;
  notes: string | null;
  items: CheckItem[];
  asset: AssetInfo | null;
};

function getTypeIcon(type: string): string {
  switch (type) {
    case "van": return "\uD83D\uDE9A";
    case "ladder": return "\uD83E\uDE9C";
    case "scaffold": return "\uD83C\uDFD7\uFE0F";
    default: return "\uD83D\uDD27";
  }
}

export default function ChecksScreen() {
  const nav = useNavigation<NativeStackNavigationProp<any>>();
  const [checks, setChecks] = useState<CheckListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  const fetchChecks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiFetch("/api/engineer/checks");
      const data = await res.json();
      if (data?.ok && Array.isArray(data.data)) {
        setChecks(data.data);
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data.data)).catch(() => {});
        setOffline(false);
      }
    } catch {
      if (!isRefresh) {
        try {
          const cached = await AsyncStorage.getItem(CACHE_KEY);
          if (cached) {
            setChecks(JSON.parse(cached));
            setOffline(true);
          }
        } catch {}
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          setChecks(JSON.parse(cached));
          setLoading(false);
        }
      } catch {}
      fetchChecks();
    })();
  }, [fetchChecks]);

  const pendingChecks = checks.filter((c) => c.status === "pending");

  const renderItem = useCallback(
    ({ item }: { item: CheckListItem }) => {
      const isOverdue = item.status === "pending" && new Date(item.dueAt) < new Date();
      const doneCount = item.items?.filter((i) => i.status === "completed").length ?? 0;
      const totalCount = item.items?.length ?? 0;

      return (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.7}
          onPress={() => nav.navigate("CheckDetail", { check: item })}
        >
          <View style={styles.cardRow}>
            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.asset && (
                <Text style={styles.assetLine}>
                  {getTypeIcon(item.asset.type)} {item.asset.name}
                  {item.asset.identifier ? ` (${item.asset.identifier})` : ""}
                </Text>
              )}
              <Text style={styles.dueLine}>
                Due: {new Date(item.dueAt).toLocaleDateString("en-GB")}
              </Text>
            </View>
            <View style={styles.cardRight}>
              <Text style={styles.itemCount}>{doneCount}/{totalCount}</Text>
              <View style={[styles.badge, isOverdue ? styles.badgeRed : styles.badgeAmber]}>
                <Text style={styles.badgeText}>{isOverdue ? "Overdue" : "Pending"}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [nav],
  );

  if (loading && checks.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {offline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline — showing cached data</Text>
        </View>
      )}
      <FlatList
        data={pendingChecks}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchChecks(true)} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No pending checks</Text>
          </View>
        }
        contentContainerStyle={pendingChecks.length === 0 ? styles.emptyContainer : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  offlineBanner: {
    backgroundColor: "#fbbf24",
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  offlineText: { color: "#78350f", fontSize: 13, fontWeight: "600", textAlign: "center" },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cardInfo: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  assetLine: { fontSize: 13, color: "#475569", marginTop: 4 },
  dueLine: { fontSize: 12, color: "#64748b", marginTop: 4 },
  cardRight: { alignItems: "flex-end" },
  itemCount: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeAmber: { backgroundColor: "#fef3c7" },
  badgeRed: { backgroundColor: "#fee2e2" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#78350f" },
  empty: { alignItems: "center", paddingTop: 40 },
  emptyText: { fontSize: 16, color: "#94a3b8" },
  emptyContainer: { flex: 1, justifyContent: "center" },
});
