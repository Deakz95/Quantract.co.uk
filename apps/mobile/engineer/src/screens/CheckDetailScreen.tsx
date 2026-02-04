import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { apiFetch } from "../api/client";
import { enqueue } from "../offline/outbox";
import { useOutbox } from "../offline/OutboxContext";
import type { CheckListItem } from "./ChecksScreen";

type ItemStatus = "pending" | "completed" | "na";

type ItemState = {
  id: string;
  title: string;
  isRequired: boolean;
  status: ItemStatus;
  notes: string;
};

function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function CheckDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const check: CheckListItem = route.params?.check;
  const { flush } = useOutbox();
  const [items, setItems] = useState<ItemState[]>(
    check.items.map((i) => ({
      id: i.id,
      title: i.title,
      isRequired: i.isRequired,
      status: (i.status as ItemStatus) || "pending",
      notes: "",
    })),
  );
  const [overallNotes, setOverallNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next: ItemStatus =
          item.status === "pending" ? "completed" : item.status === "completed" ? "na" : "pending";
        return { ...item, status: next };
      }),
    );
  };

  const setItemNotes = (id: string, notes: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, notes } : item)));
  };

  const allRequiredDone = items
    .filter((i) => i.isRequired)
    .every((i) => i.status === "completed" || i.status === "na");

  const handleSubmit = async () => {
    if (!allRequiredDone) {
      Alert.alert("Incomplete", "All required items must be completed or marked N/A.");
      return;
    }

    setSubmitting(true);
    const idempotencyKey = uuid();
    const payload = {
      checkId: check.id,
      idempotencyKey,
      items: items.map((i) => ({
        id: i.id,
        status: i.status,
        notes: i.notes || undefined,
      })),
      notes: overallNotes || undefined,
    };

    try {
      const res = await apiFetch("/api/engineer/checks", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 409) {
        setSubmitted(true);
        Alert.alert("Success", "Check completed successfully.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        return;
      }

      throw new Error(`HTTP ${res.status}`);
    } catch {
      // Queue for offline sync
      await enqueue({
        id: uuid(),
        type: "check_complete",
        payload,
        idempotencyKey,
      });
      flush();
      setSubmitted(true);
      Alert.alert("Queued", "Check saved offline. It will sync when connected.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status: ItemStatus) => {
    switch (status) {
      case "completed":
        return { bg: "#dcfce7", text: "#166534", label: "Pass" };
      case "na":
        return { bg: "#e2e8f0", text: "#475569", label: "N/A" };
      default:
        return { bg: "#fef3c7", text: "#78350f", label: "Pending" };
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.title}>{check.title}</Text>
      {check.asset && (
        <Text style={styles.assetLine}>
          {check.asset.type.charAt(0).toUpperCase() + check.asset.type.slice(1)}: {check.asset.name}
          {check.asset.identifier ? ` (${check.asset.identifier})` : ""}
        </Text>
      )}
      <Text style={styles.dueDate}>Due: {new Date(check.dueAt).toLocaleDateString("en-GB")}</Text>

      {/* Items */}
      <Text style={styles.sectionTitle}>Check Items</Text>
      {items.map((item) => {
        const st = getStatusStyle(item.status);
        return (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>
                  {item.title}
                  {item.isRequired && <Text style={styles.required}> *</Text>}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.statusBtn, { backgroundColor: st.bg }]}
                onPress={() => !submitted && toggleStatus(item.id)}
                disabled={submitted}
              >
                <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
              </TouchableOpacity>
            </View>
            {!submitted && (
              <TextInput
                style={styles.noteInput}
                placeholder="Notes (optional)"
                placeholderTextColor="#94a3b8"
                value={item.notes}
                onChangeText={(t) => setItemNotes(item.id, t)}
              />
            )}
          </View>
        );
      })}

      {/* Overall notes */}
      {!submitted && (
        <>
          <Text style={styles.sectionTitle}>Overall Notes</Text>
          <TextInput
            style={styles.overallNotes}
            placeholder="Any additional observations..."
            placeholderTextColor="#94a3b8"
            value={overallNotes}
            onChangeText={setOverallNotes}
            multiline
          />
        </>
      )}

      {/* Submit */}
      {!submitted && (
        <TouchableOpacity
          style={[styles.submitBtn, (!allRequiredDone || submitting) && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={!allRequiredDone || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Complete Check</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  assetLine: { fontSize: 14, color: "#475569", marginTop: 4 },
  dueDate: { fontSize: 13, color: "#64748b", marginTop: 4, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginTop: 20, marginBottom: 10 },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemInfo: { flex: 1, marginRight: 12 },
  itemTitle: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  required: { color: "#ef4444" },
  statusBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: "700" },
  noteInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0f172a",
  },
  overallNotes: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    fontSize: 14,
    color: "#0f172a",
    minHeight: 80,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
