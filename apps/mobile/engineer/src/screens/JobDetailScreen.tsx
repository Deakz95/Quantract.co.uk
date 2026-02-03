import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { useTimer } from "../timer/TimerContext";
import type { JobDetail, JobStage, JobVariation, JobCert, JobListItem } from "../types/job";

function pounds(v: number) {
  return `\u00A3${Number(v || 0).toFixed(2)}`;
}

function buildAddress(site: JobDetail["site"]) {
  if (!site) return null;
  return [site.address1, site.city, site.postcode].filter(Boolean).join(", ") || null;
}

function openMaps(address: string) {
  const encoded = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps:?q=${encoded}`,
    android: `geo:0,0?q=${encoded}`,
    default: `https://www.google.com/maps/search/?api=1&query=${encoded}`,
  });
  Linking.openURL(url);
}

function formatElapsed(startISO: string) {
  const s = Math.floor((Date.now() - new Date(startISO).getTime()) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function JobDetailScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { jobId, job: listItem } = route.params as { jobId: string; job?: JobListItem };
  const { activeTimer, isPending, startTimer, stopTimer } = useTimer();
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [stages, setStages] = useState<JobStage[]>([]);
  const [variations, setVariations] = useState<JobVariation[]>([]);
  const [certs, setCerts] = useState<JobCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timerBusy, setTimerBusy] = useState(false);
  const [elapsed, setElapsed] = useState("");

  const isThisJobTimer = activeTimer?.jobId === jobId;

  // Tick elapsed every second when timer running for this job
  useEffect(() => {
    if (!isThisJobTimer || !activeTimer) return;
    setElapsed(formatElapsed(activeTimer.startedAtISO));
    const iv = setInterval(() => setElapsed(formatElapsed(activeTimer.startedAtISO)), 1000);
    return () => clearInterval(iv);
  }, [isThisJobTimer, activeTimer]);

  const handleStartStop = async () => {
    setTimerBusy(true);
    try {
      if (isThisJobTimer) {
        await stopTimer();
      } else {
        await startTimer(jobId);
      }
    } finally {
      setTimerBusy(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/engineer/jobs/${jobId}`);
        const data = await res.json();
        if (!cancelled && data?.ok) {
          setDetail(data.job);
          setStages(data.stages || []);
          setVariations(data.variations || []);
          setCerts(data.certs || []);
        } else if (!cancelled) {
          setError("Could not load job");
        }
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [jobId]);

  // Use list item data while detail loads
  const title = detail?.title || listItem?.title || `Job #${jobId.slice(0, 8)}`;
  const status = detail?.status || listItem?.status || "";
  const clientName = detail?.client?.name || listItem?.clientName || null;
  const address = detail ? buildAddress(detail.site) : listItem?.siteAddress || null;
  const scheduledAtISO = detail?.scheduledAtISO || listItem?.scheduledAtISO || null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          {status ? (
            <View style={[styles.badge, STATUS_BG[status] && { backgroundColor: STATUS_BG[status] }]}>
              <Text style={styles.badgeText}>{status.replace("_", " ")}</Text>
            </View>
          ) : null}
        </View>
        {clientName ? <Text style={styles.sub}>Client: {clientName}</Text> : null}
        {address ? <Text style={styles.sub}>Site: {address}</Text> : null}
        {scheduledAtISO ? (
          <Text style={styles.sub}>
            Scheduled: {new Date(scheduledAtISO).toLocaleString("en-GB")}
          </Text>
        ) : null}
        {detail?.notes ? <Text style={styles.notes}>{detail.notes}</Text> : null}

        {/* Navigate button */}
        {address ? (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => openMaps(address)}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonText}>Navigate</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Timer banner */}
      {isThisJobTimer && activeTimer ? (
        <View style={styles.timerBanner}>
          <Text style={styles.timerLabel}>Timer running{isPending ? " (pending sync)" : ""}</Text>
          <Text style={styles.timerElapsed}>{elapsed}</Text>
        </View>
      ) : activeTimer ? (
        <View style={styles.timerBannerWarn}>
          <Text style={styles.timerWarnText}>Timer running on another job</Text>
        </View>
      ) : null}

      {/* Timer + Log Time actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, isThisJobTimer ? styles.stopBtn : styles.startBtn]}
          onPress={handleStartStop}
          disabled={timerBusy || (!!activeTimer && !isThisJobTimer)}
          activeOpacity={0.7}
        >
          {timerBusy ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.actionBtnText}>
              {isThisJobTimer ? "Stop Timer" : "Start Timer"}
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.logBtn]}
          onPress={() => nav.navigate("LogTime", { jobId, jobTitle: title })}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>Log Time</Text>
        </TouchableOpacity>
      </View>

      {/* Loading / Error for detail */}
      {loading && !detail ? (
        <ActivityIndicator size="small" color="#0f172a" style={{ marginTop: 16 }} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Budget */}
      {detail && detail.budgetTotal > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Budget</Text>
          <Text style={styles.sub}>Total: {pounds(detail.budgetTotal)}</Text>
        </View>
      ) : null}

      {/* Stages */}
      {stages.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Stages</Text>
          {stages.map((s) => (
            <View key={s.id} style={styles.listRow}>
              <Text style={styles.listLabel}>{s.name}</Text>
              <View style={styles.smallBadge}>
                <Text style={styles.smallBadgeText}>{s.status.replace("_", " ")}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Variations */}
      {variations.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Variations</Text>
          {variations.map((v) => (
            <View key={v.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listLabel}>{v.title}</Text>
                <Text style={styles.sub}>
                  {v.stageName ? `${v.stageName} \u2022 ` : ""}{pounds(v.total)}
                </Text>
              </View>
              <View style={styles.smallBadge}>
                <Text style={styles.smallBadgeText}>{v.status}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Certificates */}
      {certs.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Certificates</Text>
          {certs.map((c) => (
            <View key={c.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listLabel}>
                  {c.type} {c.certificateNumber ? `\u2022 ${c.certificateNumber}` : ""}
                </Text>
                {c.completedAtISO ? (
                  <Text style={styles.sub}>
                    Completed {new Date(c.completedAtISO).toLocaleString("en-GB")}
                  </Text>
                ) : null}
              </View>
              <View style={styles.smallBadge}>
                <Text style={styles.smallBadgeText}>{c.status}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
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
  content: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "800", color: "#0f172a", flex: 1, marginRight: 8 },
  badge: {
    backgroundColor: "#e2e8f0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#334155", textTransform: "capitalize" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 3 },
  notes: {
    fontSize: 13,
    color: "#475569",
    marginTop: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 10,
  },
  navButton: {
    marginTop: 12,
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  navButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  error: { color: "#dc2626", fontSize: 14, textAlign: "center", marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  listLabel: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  smallBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  smallBadgeText: { fontSize: 11, fontWeight: "600", color: "#64748b", textTransform: "capitalize" },
  timerBanner: {
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  timerLabel: { fontSize: 13, fontWeight: "600", color: "#166534" },
  timerElapsed: { fontSize: 28, fontWeight: "800", color: "#166534", marginTop: 4 },
  timerBannerWarn: {
    backgroundColor: "#fef9c3",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fde047",
  },
  timerWarnText: { fontSize: 13, fontWeight: "600", color: "#854d0e" },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  startBtn: { backgroundColor: "#16a34a" },
  stopBtn: { backgroundColor: "#dc2626" },
  logBtn: { backgroundColor: "#0f172a" },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
