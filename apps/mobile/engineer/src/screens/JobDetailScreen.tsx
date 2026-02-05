import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  TextInput,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { apiFetch, apiFetchMultipart } from "../api/client";
import { getCachedJobDetail, setCachedJobDetail } from "../api/jobDetailCache";
import { useTimer } from "../timer/TimerContext";
import { enqueue } from "../offline/outbox";
import { useOutbox } from "../offline/OutboxContext";
import { PhotoCapture, type PhotoResult } from "../components/PhotoCapture";
import type { JobDetail, JobStage, JobVariation, JobCert, JobListItem, CostItem } from "../types/job";
import { LockedFeature } from "../components/LockedFeature";
import { useHasEntitlement } from "../entitlements/EntitlementsContext";
import { openDocument } from "../utils/documentViewer";

// Dispatch status workflow
type DispatchStatus = "scheduled" | "en_route" | "on_site" | "in_progress" | "completed";
const DISPATCH_TRANSITIONS: Record<string, { next: DispatchStatus; label: string; color: string }[]> = {
  scheduled: [
    { next: "en_route", label: "En Route", color: "#2563eb" },
  ],
  en_route: [
    { next: "on_site", label: "Arrived", color: "#7c3aed" },
  ],
  on_site: [
    { next: "in_progress", label: "Start Work", color: "#16a34a" },
  ],
  in_progress: [
    { next: "completed", label: "Complete", color: "#0f172a" },
  ],
};
const DISPATCH_STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  en_route: "En Route",
  on_site: "On Site",
  in_progress: "In Progress",
  completed: "Completed",
};
const DISPATCH_STATUS_BG: Record<string, string> = {
  scheduled: "#fef9c3",
  en_route: "#dbeafe",
  on_site: "#e0e7ff",
  in_progress: "#dcfce7",
  completed: "#e2e8f0",
};

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
  const { jobId, job: listItem, entryId: paramEntryId, dispatchStatus: paramDispatchStatus } = route.params as {
    jobId: string;
    job?: JobListItem;
    entryId?: string;
    dispatchStatus?: string;
  };
  const { activeTimer, isPending, startTimer, stopTimer } = useTimer();
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(paramDispatchStatus || null);
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const entryId = paramEntryId || null;
  const [stages, setStages] = useState<JobStage[]>([]);
  const [variations, setVariations] = useState<JobVariation[]>([]);
  const [certs, setCerts] = useState<JobCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [cachedAgo, setCachedAgo] = useState("");
  const [timerBusy, setTimerBusy] = useState(false);
  const hasTimesheets = useHasEntitlement("feature_timesheets");
  const hasCertificates = useHasEntitlement("module_certificates");
  const [elapsed, setElapsed] = useState("");
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [showAddCost, setShowAddCost] = useState(false);
  const [costDesc, setCostDesc] = useState("");
  const [costType, setCostType] = useState("material");
  const [costQty, setCostQty] = useState("1");
  const [costUnit, setCostUnit] = useState("");
  const [costSupplier, setCostSupplier] = useState("");
  const { flush } = useOutbox();

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
      // Load from cache first for instant display
      const cached = await getCachedJobDetail(jobId);
      if (cached && !cancelled) {
        const { data } = cached;
        setDetail(data.job);
        setStages(data.stages || []);
        setVariations(data.variations || []);
        setCerts(data.certs || []);
        setLoading(false);
      }

      try {
        const [res, costRes] = await Promise.all([
          apiFetch(`/api/engineer/jobs/${jobId}`),
          apiFetch(`/api/engineer/jobs/${jobId}/cost-items`),
        ]);
        const data = await res.json();
        if (!cancelled && data?.ok) {
          setDetail(data.job);
          setStages(data.stages || []);
          setVariations(data.variations || []);
          setCerts(data.certs || []);
          setFromCache(false);
          setCachedAgo("");
          setCachedJobDetail(jobId, { job: data.job, stages: data.stages, variations: data.variations, certs: data.certs });
        } else if (!cancelled) {
          if (!cached) setError("Could not load job");
        }
        const costData = await costRes.json().catch(() => null);
        if (!cancelled && costData?.ok) {
          setCostItems((costData.costItems || []).map((c: any) => ({
            id: c.id,
            type: c.type,
            description: c.description,
            supplier: c.supplier ?? null,
            quantity: c.quantity ?? 1,
            unitCost: c.unitCost ?? 0,
            totalCost: c.totalCost ?? 0,
            createdAtISO: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
          })));
        }
      } catch {
        if (!cancelled) {
          if (cached) {
            setFromCache(true);
            const mins = Math.round((Date.now() - cached.cachedAt) / 60000);
            setCachedAgo(mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`);
          } else {
            setError("Network error");
          }
        }
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
      {/* Offline banner */}
      {fromCache ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Cached — last sync {cachedAgo}</Text>
        </View>
      ) : null}

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
          style={[styles.actionBtn, styles.logBtn, !hasTimesheets && styles.disabledBtn]}
          onPress={() => hasTimesheets && nav.navigate("LogTime", { jobId, jobTitle: title })}
          disabled={!hasTimesheets}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>{hasTimesheets ? "Log Time" : "Log Time (Pro)"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.toolsBtn]}
          onPress={() => {
            const toolsUrl = `https://apps.quantract.co.uk?jobId=${jobId}`;
            Linking.openURL(toolsUrl);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>Tools</Text>
        </TouchableOpacity>
      </View>

      {/* Job Pack link */}
      <TouchableOpacity
        style={styles.jobPackBtn}
        onPress={() => nav.navigate("JobPack", { jobId })}
        activeOpacity={0.7}
      >
        <Text style={styles.jobPackBtnText}>View Job Pack</Text>
      </TouchableOpacity>

      {/* Dispatch status workflow */}
      {entryId && dispatchStatus && dispatchStatus !== "completed" ? (
        <View style={styles.dispatchCard}>
          <View style={styles.dispatchRow}>
            <Text style={styles.dispatchLabel}>Status:</Text>
            <View style={[styles.dispatchBadge, { backgroundColor: DISPATCH_STATUS_BG[dispatchStatus] || "#e2e8f0" }]}>
              <Text style={styles.dispatchBadgeText}>
                {DISPATCH_STATUS_LABEL[dispatchStatus] || dispatchStatus}
              </Text>
            </View>
          </View>
          {DISPATCH_TRANSITIONS[dispatchStatus]?.map((t) => (
            <TouchableOpacity
              key={t.next}
              style={[styles.dispatchBtn, { backgroundColor: t.color }]}
              disabled={dispatchBusy}
              activeOpacity={0.7}
              onPress={async () => {
                setDispatchBusy(true);
                try {
                  const idKey = `ds_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                  await enqueue({
                    id: idKey,
                    type: "dispatch_status_update",
                    jobId,
                    idempotencyKey: idKey,
                    payload: { entryId, status: t.next },
                  });
                  setDispatchStatus(t.next);
                  flush();
                } finally {
                  setDispatchBusy(false);
                }
              }}
            >
              {dispatchBusy ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.dispatchBtnText}>{t.label}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      ) : entryId && dispatchStatus === "completed" ? (
        <View style={styles.dispatchCard}>
          <View style={styles.dispatchRow}>
            <Text style={styles.dispatchLabel}>Status:</Text>
            <View style={[styles.dispatchBadge, { backgroundColor: DISPATCH_STATUS_BG.completed }]}>
              <Text style={styles.dispatchBadgeText}>Completed</Text>
            </View>
          </View>
        </View>
      ) : null}

      {/* Loading / Error for detail */}
      {loading && !detail ? (
        <ActivityIndicator size="small" color="#0f172a" style={{ marginTop: 16 }} />
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Job Pack: site + client contact info */}
      {detail?.site ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Site Info</Text>
          {detail.site.name ? (
            <Text style={styles.sub}>Name: {detail.site.name}</Text>
          ) : null}
          {detail.site.address1 ? (
            <Text style={styles.sub}>Address: {[detail.site.address1, detail.site.city, detail.site.postcode].filter(Boolean).join(", ")}</Text>
          ) : null}
          {detail.client?.phone ? (
            <TouchableOpacity onPress={() => Linking.openURL(`tel:${detail.client!.phone}`)}>
              <Text style={[styles.sub, styles.link]}>Phone: {detail.client.phone}</Text>
            </TouchableOpacity>
          ) : null}
          {detail.client?.email ? (
            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${detail.client!.email}`)}>
              <Text style={[styles.sub, styles.link]}>Email: {detail.client.email}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

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

      {/* Photos */}
      {detail ? (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <TouchableOpacity
              style={styles.addPhotoBtn}
              onPress={() => setShowPhotoCapture(!showPhotoCapture)}
              activeOpacity={0.7}
            >
              <Text style={styles.addPhotoBtnText}>{showPhotoCapture ? "Cancel" : "Add Photo"}</Text>
            </TouchableOpacity>
          </View>
          {showPhotoCapture ? (
            <PhotoCapture
              onPhoto={async (photo: PhotoResult) => {
                // Queue in outbox for offline-safe upload (file URI, not base64)
                const photoIdKey = `photo_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                await enqueue({
                  id: photoIdKey,
                  type: "photo_upload",
                  jobId,
                  idempotencyKey: photoIdKey,
                  payload: {
                    targetType: "job",
                    targetId: jobId,
                    fileUri: photo.uri,
                    mimeType: photo.mimeType,
                    fileName: photo.fileName,
                  },
                });
                setShowPhotoCapture(false);
                Alert.alert("Photo Queued", "Your photo will be uploaded when connected.");
                flush();
              }}
            />
          ) : null}
        </View>
      ) : null}

      {/* Cost Items */}
      {detail ? (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>Cost Items</Text>
            <TouchableOpacity
              style={styles.addPhotoBtn}
              onPress={() => setShowAddCost(!showAddCost)}
              activeOpacity={0.7}
            >
              <Text style={styles.addPhotoBtnText}>{showAddCost ? "Cancel" : "Add Cost"}</Text>
            </TouchableOpacity>
          </View>
          {costItems.map((c) => (
            <View key={c.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listLabel}>{c.description}</Text>
                <Text style={styles.sub}>
                  {c.type}{c.supplier ? ` \u2022 ${c.supplier}` : ""} \u2022 {c.quantity} \u00D7 {pounds(c.unitCost)}
                </Text>
              </View>
              <Text style={styles.listLabel}>{pounds(c.totalCost)}</Text>
            </View>
          ))}
          {costItems.length === 0 && !showAddCost ? (
            <Text style={styles.sub}>No cost items yet</Text>
          ) : null}
          {showAddCost ? (
            <View style={styles.costForm}>
              <TextInput
                style={styles.input}
                placeholder="Description *"
                placeholderTextColor="#94a3b8"
                value={costDesc}
                onChangeText={setCostDesc}
              />
              <View style={styles.typeRow}>
                {(["material", "labour", "subcontractor", "plant", "other"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, costType === t && styles.typeChipActive]}
                    onPress={() => setCostType(t)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typeChipText, costType === t && styles.typeChipTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.costRowInputs}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Qty"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={costQty}
                  onChangeText={setCostQty}
                />
                <TextInput
                  style={[styles.input, { flex: 1, marginLeft: 8 }]}
                  placeholder="Unit cost"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={costUnit}
                  onChangeText={setCostUnit}
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Supplier (optional)"
                placeholderTextColor="#94a3b8"
                value={costSupplier}
                onChangeText={setCostSupplier}
              />
              <TouchableOpacity
                style={[styles.actionBtn, styles.startBtn, !costDesc.trim() && styles.disabledBtn]}
                disabled={!costDesc.trim()}
                onPress={async () => {
                  const qty = parseFloat(costQty) || 1;
                  const unit = parseFloat(costUnit) || 0;
                  const total = qty * unit;
                  const idKey = `ci_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                  const newItem: CostItem = {
                    id: idKey,
                    type: costType,
                    description: costDesc.trim(),
                    supplier: costSupplier.trim() || null,
                    quantity: qty,
                    unitCost: unit,
                    totalCost: total,
                    createdAtISO: new Date().toISOString(),
                  };
                  setCostItems((prev) => [newItem, ...prev]);
                  await enqueue({
                    id: idKey,
                    type: "cost_item_create",
                    jobId,
                    idempotencyKey: idKey,
                    payload: {
                      description: costDesc.trim(),
                      type: costType,
                      quantity: qty,
                      unitCost: unit,
                      supplier: costSupplier.trim() || undefined,
                    },
                  });
                  setCostDesc("");
                  setCostType("material");
                  setCostQty("1");
                  setCostUnit("");
                  setCostSupplier("");
                  setShowAddCost(false);
                  Alert.alert("Cost Queued", "Your cost item will sync when connected.");
                  flush();
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.actionBtnText}>Save Cost</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Certificates */}
      {certs.length > 0 && hasCertificates ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Certificates</Text>
          {certs.map((c) => {
            const isEditable = c.status !== "completed" && c.status !== "issued" && c.status !== "void";
            const Row = isEditable ? TouchableOpacity : View;
            return (
              <Row
                key={c.id}
                style={styles.listRow}
                {...(isEditable ? {
                  activeOpacity: 0.7,
                  onPress: () => nav.navigate("CertificateEdit", { certificateId: c.id, certType: c.type, jobId }),
                } : {})}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.listLabel}>
                    {c.type} {c.certificateNumber ? `\u2022 ${c.certificateNumber}` : ""}
                  </Text>
                  {c.completedAtISO ? (
                    <Text style={styles.sub}>
                      Completed {new Date(c.completedAtISO).toLocaleString("en-GB")}
                    </Text>
                  ) : isEditable ? (
                    <Text style={styles.sub}>Tap to edit draft</Text>
                  ) : null}
                </View>
                {c.documentId ? (
                  <TouchableOpacity
                    style={styles.viewPdfBtn}
                    onPress={() => openDocument(c.documentId!)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewPdfText}>View PDF</Text>
                  </TouchableOpacity>
                ) : c.externalUrl ? (
                  <TouchableOpacity
                    style={styles.viewPdfBtn}
                    onPress={() => Linking.openURL(c.externalUrl!)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.viewPdfText}>Open</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.smallBadge}>
                    <Text style={styles.smallBadgeText}>{c.status}</Text>
                  </View>
                )}
              </Row>
            );
          })}
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
  jobPackBtn: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  jobPackBtnText: { color: "#0f172a", fontSize: 14, fontWeight: "600" },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  startBtn: { backgroundColor: "#16a34a" },
  stopBtn: { backgroundColor: "#dc2626" },
  logBtn: { backgroundColor: "#0f172a" },
  toolsBtn: { backgroundColor: "#3b82f6" },
  disabledBtn: { backgroundColor: "#94a3b8" },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  viewPdfBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  viewPdfText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  addPhotoBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  addPhotoBtnText: { color: "#fff", fontSize: 11, fontWeight: "600" },
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
  costForm: { marginTop: 8, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeChip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f8fafc",
  },
  typeChipActive: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  typeChipText: { fontSize: 12, fontWeight: "600", color: "#64748b", textTransform: "capitalize" },
  typeChipTextActive: { color: "#fff" },
  costRowInputs: { flexDirection: "row" },
  link: { color: "#2563eb", textDecorationLine: "underline" },
  dispatchCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dispatchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dispatchLabel: { fontSize: 14, fontWeight: "600", color: "#0f172a", marginRight: 8 },
  dispatchBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dispatchBadgeText: { fontSize: 12, fontWeight: "700", color: "#334155" },
  dispatchBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  dispatchBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
