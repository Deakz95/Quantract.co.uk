import React, { useEffect, useState } from "react";
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
import { useRoute } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { getCachedJobDetail } from "../api/jobDetailCache";
import type { JobDetail, JobStage, JobCert } from "../types/job";

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

export default function JobPackScreen() {
  const route = useRoute<any>();
  const { jobId } = route.params as { jobId: string };
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [stages, setStages] = useState<JobStage[]>([]);
  const [certs, setCerts] = useState<JobCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Try cache first
      const cached = await getCachedJobDetail(jobId);
      if (cached && !cancelled) {
        setDetail(cached.data.job);
        setStages(cached.data.stages || []);
        setCerts(cached.data.certs || []);
        setLoading(false);
      }

      try {
        const res = await apiFetch(`/api/engineer/jobs/${jobId}`);
        const data = await res.json();
        if (!cancelled && data?.ok) {
          setDetail(data.job);
          setStages(data.stages || []);
          setCerts(data.certs || []);
          setOffline(false);
        }
      } catch {
        if (!cancelled && !detail) setOffline(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [jobId]);

  if (loading && !detail) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Could not load job details</Text>
      </View>
    );
  }

  const address = buildAddress(detail.site);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {offline ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Offline — showing cached data</Text>
        </View>
      ) : null}

      {/* Job Overview */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Job Overview</Text>
        <Text style={styles.title}>{detail.title || `Job #${detail.jobNumber || detail.id.slice(0, 8)}`}</Text>
        {detail.notes ? <Text style={styles.notes}>{detail.notes}</Text> : null}
        {detail.scheduledAtISO ? (
          <Text style={styles.sub}>
            Scheduled: {new Date(detail.scheduledAtISO).toLocaleString("en-GB")}
          </Text>
        ) : null}
      </View>

      {/* Site Information */}
      {detail.site ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Site</Text>
          {detail.site.name ? <Text style={styles.fieldValue}>{detail.site.name}</Text> : null}
          {address ? (
            <>
              <Text style={styles.sub}>{address}</Text>
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => openMaps(address)}
                activeOpacity={0.7}
              >
                <Text style={styles.navButtonText}>Navigate to Site</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      ) : null}

      {/* Client Contact */}
      {detail.client ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Client Contact</Text>
          <Text style={styles.fieldValue}>{detail.client.name}</Text>
          {detail.client.phone ? (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${detail.client!.phone}`)}>
              <Text style={[styles.sub, styles.link]}>Phone: {detail.client.phone}</Text>
            </TouchableOpacity>
          ) : null}
          {detail.client.email ? (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${detail.client!.email}`)}>
              <Text style={[styles.sub, styles.link]}>Email: {detail.client.email}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Stages */}
      {stages.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Stages ({stages.length})</Text>
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

      {/* Certificates */}
      {certs.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Certificates ({certs.length})</Text>
          {certs.map((c) => (
            <View key={c.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listLabel}>
                  {c.type} {c.certificateNumber ? `\u2022 ${c.certificateNumber}` : ""}
                </Text>
              </View>
              <View style={styles.smallBadge}>
                <Text style={styles.smallBadgeText}>{c.status}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {/* Budget */}
      {detail.budgetTotal > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Budget</Text>
          <Text style={styles.fieldValue}>{`\u00A3${(detail.budgetTotal / 100).toFixed(2)}`}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 12, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  errorText: { fontSize: 15, color: "#dc2626" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  sub: { fontSize: 13, color: "#64748b", marginTop: 4 },
  fieldValue: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
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
  link: { color: "#2563eb", textDecorationLine: "underline" },
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
  offlineBanner: {
    backgroundColor: "#fef3c7",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  offlineBannerText: { fontSize: 12, fontWeight: "600", color: "#92400e" },
});
