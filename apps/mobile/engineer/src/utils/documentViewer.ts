import { Linking, Alert } from "react-native";
import { apiFetch } from "../api/client";

const BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

/**
 * Open a document in the device's native viewer via a signed URL.
 *
 * 1. Calls POST /api/documents/[documentId]/signed-url to get a short-lived URL
 * 2. Opens the signed URL in the device's native browser/viewer
 */
export async function openDocument(documentId: string): Promise<void> {
  try {
    const res = await apiFetch(`/api/documents/${documentId}/signed-url`, {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error || `Failed to get signed URL (${res.status})`);
    }

    const data = await res.json();
    if (!data?.url) {
      throw new Error("No URL returned from server");
    }

    // External URLs are already fully-qualified; internal are relative paths
    const fullUrl = data.external ? data.url : `${BASE_URL}${data.url}`;
    const supported = await Linking.canOpenURL(fullUrl);
    if (!supported) {
      Alert.alert("Error", "Cannot open this document on your device");
      return;
    }

    await Linking.openURL(fullUrl);
  } catch (err: any) {
    Alert.alert("Error", err?.message || "Could not open document");
  }
}
