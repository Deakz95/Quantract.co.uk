import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import NetInfo from "@react-native-community/netinfo";
import { apiFetch } from "../api/client";
import { enqueue } from "../offline/outbox";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nowTimeStr() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function LogTimeScreen() {
  const route = useRoute<any>();
  const nav = useNavigation<any>();
  const { jobId, jobTitle } = route.params as { jobId: string; jobTitle?: string };

  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState(nowTimeStr);
  const [durationH, setDurationH] = useState("1");
  const [durationM, setDurationM] = useState("0");
  const [breakMins, setBreakMins] = useState("0");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const hours = parseInt(durationH, 10) || 0;
    const mins = parseInt(durationM, 10) || 0;
    if (hours === 0 && mins === 0) {
      Alert.alert("Duration required", "Enter at least 1 minute.");
      return;
    }

    setBusy(true);
    try {
      const startedAtISO = new Date(`${date}T${startTime}:00`).toISOString();
      const totalMs = (hours * 60 + mins) * 60 * 1000;
      const endedAtISO = new Date(new Date(startedAtISO).getTime() + totalMs).toISOString();
      const breakMinutes = parseInt(breakMins, 10) || 0;
      const idempotencyKey = `log_${jobId}_${Date.now()}`;

      const payload = { jobId, startedAtISO, endedAtISO, breakMinutes, notes: notes.trim() || undefined };

      const netState = await NetInfo.fetch();
      if (netState.isConnected) {
        try {
          const res = await apiFetch("/api/engineer/time-entries", {
            method: "POST",
            headers: { "idempotency-key": idempotencyKey },
            body: JSON.stringify(payload),
          });
          if (res.ok) {
            nav.goBack();
            return;
          }
          const data = await res.json().catch(() => ({}));
          Alert.alert("Error", data?.error || "Failed to save");
          return;
        } catch {
          // Fall through to offline
        }
      }

      // Offline enqueue
      await enqueue({
        id: `outbox_log_${Date.now()}`,
        type: "time_entry_create",
        jobId,
        idempotencyKey,
        payload,
      });
      Alert.alert("Saved offline", "Your time entry will sync when you're back online.");
      nav.goBack();
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Log Time</Text>
        {jobTitle ? <Text style={styles.sub}>{jobTitle}</Text> : null}

        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="2025-01-15" />

        <Text style={styles.label}>Start time (HH:MM)</Text>
        <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="08:00" />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Hours</Text>
            <TextInput
              style={styles.input}
              value={durationH}
              onChangeText={setDurationH}
              keyboardType="numeric"
              placeholder="1"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.label}>Minutes</Text>
            <TextInput
              style={styles.input}
              value={durationM}
              onChangeText={setDurationM}
              keyboardType="numeric"
              placeholder="0"
            />
          </View>
        </View>

        <Text style={styles.label}>Break (minutes)</Text>
        <TextInput
          style={styles.input}
          value={breakMins}
          onChangeText={setBreakMins}
          keyboardType="numeric"
          placeholder="0"
        />

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="What did you work on?"
          multiline
        />

        <TouchableOpacity
          style={[styles.submitBtn, busy && { opacity: 0.6 }]}
          onPress={handleSubmit}
          disabled={busy}
          activeOpacity={0.7}
        >
          <Text style={styles.submitText}>{busy ? "Saving..." : "Save Time Entry"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  sub: { fontSize: 14, color: "#64748b", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#334155", marginTop: 12, marginBottom: 4 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0f172a",
  },
  row: { flexDirection: "row" },
  submitBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
