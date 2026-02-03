import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { apiFetch } from "../api/client";
import { flushOutbox, loadOutbox } from "../offline/outbox";

type Profile = {
  name: string;
  email: string;
  role: string;
} | null;

export default function ProfileScreen() {
  const { logout, isOnline } = useAuth();
  const [profile, setProfile] = useState<Profile>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [outboxCount, setOutboxCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Check outbox count
  useEffect(() => {
    loadOutbox().then((items) => setOutboxCount(items.length)).catch(() => {});
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await flushOutbox();
      const items = await loadOutbox();
      setOutboxCount(items.length);
      Alert.alert("Sync complete", `Processed: ${result.processed}, Remaining: ${result.remaining}`);
    } catch {
      Alert.alert("Sync failed", "Could not sync. Try again when online.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/engineer/profile");
        const data = await res.json();
        if (!cancelled && data?.ok) {
          setProfile({
            name: data.profile?.user?.name || "Engineer",
            email: data.profile?.user?.email || "",
            role: data.profile?.user?.role || "",
          });
        } else if (!cancelled) {
          setError("Could not load profile");
        }
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.container}>
      {isOnline === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#0f172a" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : profile ? (
        <View style={styles.card}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.email}>{profile.email}</Text>
          <Text style={styles.role}>{profile.role}</Text>
        </View>
      ) : null}

      {/* Sync outbox */}
      <TouchableOpacity
        style={[styles.syncButton, syncing && { opacity: 0.6 }]}
        onPress={handleSync}
        disabled={syncing}
        activeOpacity={0.7}
      >
        <Text style={styles.syncText}>
          {syncing ? "Syncing..." : `Sync (${outboxCount} pending)`}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={logout} activeOpacity={0.7}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  offlineBanner: {
    position: "absolute",
    top: 60,
    left: 24,
    right: 24,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 8,
  },
  offlineText: { color: "#dc2626", fontSize: 13, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 24,
  },
  name: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  email: { fontSize: 14, color: "#64748b", marginTop: 4 },
  role: { fontSize: 13, color: "#94a3b8", marginTop: 2, textTransform: "capitalize" },
  error: { color: "#dc2626", fontSize: 14, marginBottom: 24 },
  syncButton: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  syncText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  logoutButton: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
