import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useCertDraft, type SyncStatus } from "../offline/CertDraftContext";
import { enqueue } from "../offline/outbox";
import { useOutbox } from "../offline/OutboxContext";

type Params = {
  certificateId: string;
  certType: string;
  jobId: string;
};

const STATUS_COLORS: Record<SyncStatus, { bg: string; border: string; text: string }> = {
  synced: { bg: "#dcfce7", border: "#86efac", text: "#166534" },
  pending: { bg: "#fef9c3", border: "#fde047", text: "#854d0e" },
  conflict: { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
  error: { bg: "#fee2e2", border: "#fca5a5", text: "#991b1b" },
};

const STATUS_LABELS: Record<SyncStatus, string> = {
  synced: "Saved",
  pending: "Unsaved changes",
  conflict: "Conflict — modified on another device",
  error: "Sync error",
};

/** Section labels for the certificate form */
const SECTION_ORDER = ["overview", "installation", "inspection", "declarations", "assessment", "signatures"] as const;

const SECTION_LABELS: Record<string, string> = {
  overview: "Overview",
  installation: "Installation Details",
  inspection: "Inspection",
  declarations: "Declarations",
  assessment: "Assessment",
  signatures: "Signatures",
};

/** Human-readable labels for common data field keys */
const FIELD_LABELS: Record<string, string> = {
  jobReference: "Job Reference",
  siteName: "Site Name",
  installationAddress: "Installation Address",
  clientName: "Client Name",
  clientEmail: "Client Email",
  jobDescription: "Job Description",
  descriptionOfWork: "Description of Work",
  supplyType: "Supply Type",
  earthingArrangement: "Earthing Arrangement",
  distributionType: "Distribution Type",
  maxDemand: "Max Demand",
  limitations: "Limitations",
  observations: "Observations",
  nextInspectionDate: "Next Inspection Date",
  extentOfWork: "Extent of Work",
  worksTested: "Works Tested",
  comments: "Comments",
  overallAssessment: "Overall Assessment",
  recommendations: "Recommendations",
};

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

export default function CertificateEditScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { certificateId, certType, jobId } = route.params as Params;
  const { draft, syncStatus, loading, loadCertificate, updateDraft, saveDraftToServer, clearDraft } = useCertDraft();
  const { flush } = useOutbox();
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    loadCertificate(certificateId);
  }, [certificateId, loadCertificate]);

  const handleFieldChange = useCallback(
    (section: string, key: string, value: string) => {
      if (!draft) return;
      const sectionData =
        typeof draft.data[section] === "object" && draft.data[section] !== null
          ? (draft.data[section] as Record<string, unknown>)
          : {};
      updateDraft({
        data: {
          [section]: { ...sectionData, [key]: value },
        },
      });
    },
    [draft, updateDraft],
  );

  const handleSave = useCallback(async () => {
    await saveDraftToServer();
    Alert.alert("Draft Queued", "Your changes will sync when connected.");
  }, [saveDraftToServer]);

  const handleComplete = useCallback(async () => {
    if (!draft) return;
    if (draft.dirty) {
      Alert.alert("Save First", "Please save your draft before completing the certificate.");
      return;
    }
    Alert.alert(
      "Complete Certificate",
      "Once completed, the certificate cannot be edited. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          style: "default",
          onPress: async () => {
            setCompleting(true);
            try {
              const itemId = `cert_complete_${certificateId}_${Date.now()}`;
              await enqueue({
                id: itemId,
                type: "certificate_complete",
                payload: { certificateId },
              });
              await clearDraft();
              flush();
              Alert.alert("Certificate Queued", "Completion will sync when connected.", [
                { text: "OK", onPress: () => nav.goBack() },
              ]);
            } finally {
              setCompleting(false);
            }
          },
        },
      ],
    );
  }, [draft, certificateId, clearDraft, flush, nav]);

  if (loading && !draft) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0f172a" />
        <Text style={styles.loadingText}>Loading certificate...</Text>
      </View>
    );
  }

  if (!draft) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Certificate not found</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadCertificate(certificateId)}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColors = STATUS_COLORS[syncStatus];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Sync status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
          <Text style={[styles.statusText, { color: statusColors.text }]}>{STATUS_LABELS[syncStatus]}</Text>
        </View>

        {/* Certificate type header */}
        <View style={styles.card}>
          <Text style={styles.certType}>{certType.replace(/_/g, " ")}</Text>
          <Text style={styles.certId}>ID: {certificateId.slice(0, 8)}...</Text>
        </View>

        {/* Form sections */}
        {SECTION_ORDER.map((section) => {
          const sectionData = draft.data[section];

          // Signatures section — special rendering
          if (section === "signatures") {
            return (
              <View key={section} style={styles.card}>
                <Text style={styles.sectionTitle}>{SECTION_LABELS[section]}</Text>
                {renderSignatureSection(sectionData)}
              </View>
            );
          }

          if (typeof sectionData !== "object" || sectionData === null) {
            return (
              <View key={section} style={styles.card}>
                <Text style={styles.sectionTitle}>{SECTION_LABELS[section] || section}</Text>
                <Text style={styles.emptyText}>No fields</Text>
              </View>
            );
          }

          const fields = Object.entries(sectionData as Record<string, unknown>).filter(
            ([, v]) => typeof v === "string" || typeof v === "number" || v === null || v === undefined,
          );

          if (fields.length === 0) {
            return (
              <View key={section} style={styles.card}>
                <Text style={styles.sectionTitle}>{SECTION_LABELS[section] || section}</Text>
                <Text style={styles.emptyText}>No fields for this section</Text>
              </View>
            );
          }

          return (
            <View key={section} style={styles.card}>
              <Text style={styles.sectionTitle}>{SECTION_LABELS[section] || section}</Text>
              {fields.map(([key, value]) => (
                <View key={key} style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{fieldLabel(key)}</Text>
                  <TextInput
                    style={styles.input}
                    value={String(value ?? "")}
                    onChangeText={(text) => handleFieldChange(section, key, text)}
                    placeholder={fieldLabel(key)}
                    placeholderTextColor="#94a3b8"
                    multiline={key === "comments" || key === "observations" || key === "limitations" || key === "recommendations" || key === "descriptionOfWork" || key === "extentOfWork"}
                  />
                </View>
              ))}
            </View>
          );
        })}

        {/* Test results section */}
        {draft.testResults.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Test Results</Text>
            {draft.testResults.map((result, idx) => (
              <View key={idx} style={styles.testResultRow}>
                <Text style={styles.fieldLabel}>
                  Circuit: {result.circuitRef || `#${idx + 1}`}
                </Text>
                {Object.entries(result.data).map(([key, value]) => (
                  <View key={key} style={styles.testField}>
                    <Text style={styles.testFieldLabel}>{fieldLabel(key)}</Text>
                    <Text style={styles.testFieldValue}>{String(value ?? "")}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.saveBtn, !draft.dirty && styles.disabledBtn]}
            onPress={handleSave}
            disabled={!draft.dirty}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>{draft.dirty ? "Save Draft" : "Saved"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.completeBtn, (draft.dirty || completing) && styles.disabledBtn]}
            onPress={handleComplete}
            disabled={draft.dirty || completing}
            activeOpacity={0.7}
          >
            {completing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>Complete</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function renderSignatureSection(data: unknown) {
  if (typeof data !== "object" || data === null) {
    return <Text style={styles.emptyText}>No signature data</Text>;
  }
  const sigs = data as Record<string, unknown>;
  const parts: Array<{ label: string; value: unknown }> = [];

  // Engineer signature
  if (sigs.engineer && typeof sigs.engineer === "object") {
    const eng = sigs.engineer as Record<string, unknown>;
    parts.push({ label: "Engineer", value: eng.name || eng.signatureText || "(not signed)" });
  }
  // Customer signature
  if (sigs.customer && typeof sigs.customer === "object") {
    const cust = sigs.customer as Record<string, unknown>;
    parts.push({ label: "Customer", value: cust.name || cust.signatureText || "(not signed)" });
  }

  if (parts.length === 0) {
    // Render flat keys if present
    const entries = Object.entries(sigs).filter(([, v]) => typeof v === "string");
    return entries.length > 0 ? (
      <>
        {entries.map(([k, v]) => (
          <View key={k} style={styles.testField}>
            <Text style={styles.testFieldLabel}>{fieldLabel(k)}</Text>
            <Text style={styles.testFieldValue}>{String(v)}</Text>
          </View>
        ))}
      </>
    ) : (
      <Text style={styles.emptyText}>No signatures yet</Text>
    );
  }

  return (
    <>
      {parts.map((p) => (
        <View key={p.label} style={styles.testField}>
          <Text style={styles.testFieldLabel}>{p.label}</Text>
          <Text style={styles.testFieldValue}>{String(p.value)}</Text>
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 12, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748b" },
  errorText: { fontSize: 16, color: "#dc2626", marginBottom: 12 },
  retryBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  statusBanner: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  statusText: { fontSize: 12, fontWeight: "600" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  certType: { fontSize: 18, fontWeight: "800", color: "#0f172a", textTransform: "uppercase" },
  certId: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  emptyText: { fontSize: 13, color: "#94a3b8", fontStyle: "italic" },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#475569", marginBottom: 4 },
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
  testResultRow: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  testField: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  testFieldLabel: { fontSize: 13, color: "#475569", fontWeight: "600" },
  testFieldValue: { fontSize: 13, color: "#0f172a" },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  saveBtn: { flex: 1, backgroundColor: "#0f172a", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  completeBtn: { flex: 1, backgroundColor: "#16a34a", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  disabledBtn: { backgroundColor: "#94a3b8" },
  actionBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
