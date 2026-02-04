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
import { useNavigation } from "@react-navigation/native";
import { PhotoCapture, type PhotoResult } from "../components/PhotoCapture";
import { enqueue } from "../offline/outbox";
import { useOutbox } from "../offline/OutboxContext";

const CATEGORIES = [
  "Materials",
  "Tools",
  "Travel",
  "Fuel",
  "Meals",
  "PPE",
  "Hire",
  "Other",
];

export default function AddReceiptScreen() {
  const navigation = useNavigation();
  const { flush } = useOutbox();

  const [photo, setPhoto] = useState<PhotoResult | null>(null);
  const [category, setCategory] = useState("Materials");
  const [amount, setAmount] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!photo) {
      Alert.alert("Photo Required", "Please take or choose a photo of the receipt.");
      return;
    }

    setSubmitting(true);
    try {
      // Convert pounds to pence
      const amountPence = amount ? Math.round(parseFloat(amount) * 100) : undefined;
      const vatPence = vatAmount ? Math.round(parseFloat(vatAmount) * 100) : undefined;

      await enqueue({
        id: `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: "receipt_upload",
        payload: {
          fileUri: photo.uri,
          mimeType: photo.mimeType,
          fileName: photo.fileName,
          category,
          amount: amountPence || undefined,
          vat: vatPence || undefined,
          supplierName: supplierName || undefined,
          notes: notes || undefined,
        },
      });

      // Try to flush immediately
      flush();

      Alert.alert("Receipt Saved", "Your receipt has been queued for upload.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save receipt");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Receipt Photo</Text>
        <PhotoCapture onPhoto={setPhoto} disabled={submitting} />

        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryRow}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
              onPress={() => setCategory(cat)}
              disabled={submitting}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Amount (£)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#94a3b8"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
          editable={!submitting}
        />

        <Text style={styles.sectionTitle}>VAT (£)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#94a3b8"
          keyboardType="decimal-pad"
          value={vatAmount}
          onChangeText={setVatAmount}
          editable={!submitting}
        />

        <Text style={styles.sectionTitle}>Supplier Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Screwfix"
          placeholderTextColor="#94a3b8"
          value={supplierName}
          onChangeText={setSupplierName}
          editable={!submitting}
        />

        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Optional notes..."
          placeholderTextColor="#94a3b8"
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          editable={!submitting}
        />

        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.7}
        >
          <Text style={styles.submitText}>
            {submitting ? "Saving..." : "Save Receipt"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 16,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#e2e8f0",
  },
  categoryChipActive: {
    backgroundColor: "#0f172a",
  },
  categoryText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  categoryTextActive: {
    color: "#fff",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  submitBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
