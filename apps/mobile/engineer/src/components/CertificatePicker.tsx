import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { apiFetch } from "../api/client";

type CertItem = {
  id: string;
  type: string;
  certificateNumber: string | null;
  jobTitle: string | null;
  jobNumber: number | null;
};

type Props = {
  onSelect: (certificateId: string) => void;
  disabled?: boolean;
};

export default function CertificatePicker({ onSelect, disabled }: Props) {
  const [certs, setCerts] = useState<CertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCertificates();
  }, []);

  async function loadCertificates() {
    try {
      // Load jobs list first
      const jobsRes = await apiFetch("/api/engineer/jobs");
      if (!jobsRes.ok) {
        setLoading(false);
        return;
      }
      const jobsJson = await jobsRes.json();
      const jobs: Array<{ id: string; title: string | null; jobNumber: number | null }> =
        jobsJson.jobs || [];

      // Load certificates from each job's detail (in parallel, max 10)
      const jobSlice = jobs.slice(0, 10);
      const details = await Promise.all(
        jobSlice.map(async (job) => {
          try {
            const res = await apiFetch(`/api/engineer/jobs/${job.id}`);
            if (!res.ok) return [];
            const json = await res.json();
            const jobCerts: CertItem[] = (json.certs || [])
              .filter((c: any) => c.status === "issued")
              .map((c: any) => ({
                id: c.id,
                type: c.type || "Certificate",
                certificateNumber: c.certificateNumber || null,
                jobTitle: job.title,
                jobNumber: job.jobNumber,
              }));
            return jobCerts;
          } catch {
            return [];
          }
        })
      );

      setCerts(details.flat());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  const filtered = search.trim()
    ? certs.filter(
        (c) =>
          (c.certificateNumber || "").toLowerCase().includes(search.toLowerCase()) ||
          (c.type || "").toLowerCase().includes(search.toLowerCase()) ||
          (c.jobTitle || "").toLowerCase().includes(search.toLowerCase())
      )
    : certs;

  if (loading) {
    return (
      <View style={pickerStyles.loadingContainer}>
        <ActivityIndicator size="small" color="#0f172a" />
        <Text style={pickerStyles.loadingText}>Loading certificates...</Text>
      </View>
    );
  }

  if (certs.length === 0) {
    return (
      <View style={pickerStyles.emptyContainer}>
        <Text style={pickerStyles.emptyText}>No issued certificates found.</Text>
      </View>
    );
  }

  return (
    <View style={pickerStyles.container}>
      <TextInput
        style={pickerStyles.searchInput}
        placeholder="Search certificates..."
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={pickerStyles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={pickerStyles.item}
            onPress={() => !disabled && onSelect(item.id)}
            activeOpacity={0.7}
            disabled={disabled}
          >
            <View>
              <Text style={pickerStyles.itemTitle}>{item.type}</Text>
              {item.certificateNumber ? (
                <Text style={pickerStyles.itemSub}>{item.certificateNumber}</Text>
              ) : null}
              {item.jobTitle || item.jobNumber ? (
                <Text style={pickerStyles.itemSub}>
                  {item.jobNumber ? `Job #${item.jobNumber}` : ""}
                  {item.jobNumber && item.jobTitle ? " — " : ""}
                  {item.jobTitle || ""}
                </Text>
              ) : null}
            </View>
            <Text style={pickerStyles.selectArrow}>→</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={pickerStyles.emptyText}>No matching certificates</Text>
        }
      />
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: {
    maxHeight: 300,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    marginBottom: 8,
  },
  list: {
    maxHeight: 240,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  itemSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  selectArrow: {
    fontSize: 18,
    color: "#94a3b8",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
    paddingVertical: 12,
  },
});
