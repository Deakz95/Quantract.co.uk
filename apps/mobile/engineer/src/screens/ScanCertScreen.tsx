import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { apiFetch } from "../api/client";
import { openDocument } from "../utils/documentViewer";
import CertificatePicker from "../components/CertificatePicker";
import { enqueue } from "../offline/outbox";
import { useOutbox } from "../offline/OutboxContext";
import { makeIdempotencyKey } from "../utils/idempotency";

type ScanResult = {
  type: string;
  certificateNumber: string | null;
  status: string;
  issuedAt: string | null;
  documentId: string | null;
};

type AssetResult = {
  id: string;
  name: string;
  type: string;
  identifier: string | null;
};

type ScanMode = "idle" | "verify" | "tag_assign" | "asset_view";

export default function ScanCertScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState("");
  const { flush } = useOutbox();

  // QR tag assignment state
  const [scanMode, setScanMode] = useState<ScanMode>("idle");
  const [tagCode, setTagCode] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Asset state
  const [assetResult, setAssetResult] = useState<AssetResult | null>(null);

  // Extract verification token from QR URL like /verify/{token}
  function extractToken(data: string): string | null {
    try {
      const url = new URL(data);
      const match = url.pathname.match(/\/verify\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    } catch {
      const match = data.match(/\/verify\/([a-zA-Z0-9_-]+)/);
      return match ? match[1] : null;
    }
  }

  // Extract QR tag code from URL like /qr/{code}
  function extractTagCode(data: string): string | null {
    try {
      const url = new URL(data);
      const match = url.pathname.match(/\/qr\/([a-f0-9]{32})/);
      return match ? match[1] : null;
    } catch {
      const match = data.match(/\/qr\/([a-f0-9]{32})/);
      return match ? match[1] : null;
    }
  }

  // Extract asset ID from URL like /asset/{uuid}
  function extractAssetId(data: string): string | null {
    try {
      const url = new URL(data);
      const match = url.pathname.match(/\/asset\/([a-f0-9-]{36})/);
      return match ? match[1] : null;
    } catch {
      const match = data.match(/\/asset\/([a-f0-9-]{36})/);
      return match ? match[1] : null;
    }
  }

  async function handleBarCodeScanned({ data }: { data: string }) {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    setError("");
    setResult(null);
    setTagCode(null);
    setAssignSuccess(false);
    setAssetResult(null);

    // Check if it's an asset QR (/asset/{uuid})
    const assetId = extractAssetId(data);
    if (assetId) {
      setScanMode("asset_view");
      try {
        const res = await apiFetch(`/api/engineer/checks?assetId=${assetId}`);
        const json = await res.json().catch(() => null);
        if (json?.ok && json.asset) {
          setAssetResult({
            id: json.asset.id,
            name: json.asset.name || "Unknown Asset",
            type: json.asset.type || "asset",
            identifier: json.asset.identifier || null,
          });
        } else {
          // Still show the asset ID even if we can't load details
          setAssetResult({
            id: assetId,
            name: "Asset",
            type: "asset",
            identifier: assetId.slice(0, 8),
          });
        }
      } catch {
        // Offline — show basic info
        setAssetResult({
          id: assetId,
          name: "Asset (offline)",
          type: "asset",
          identifier: assetId.slice(0, 8),
        });
      }
      setLoading(false);
      return;
    }

    // Check if it's a QR tag URL (/qr/{code})
    const qrCode = extractTagCode(data);
    if (qrCode) {
      setScanMode("tag_assign");
      setTagCode(qrCode);
      setLoading(false);
      return;
    }

    // Check if it's a certificate verification URL (/verify/{token})
    const token = extractToken(data);
    if (!token) {
      setError("Not a valid Quantract QR code");
      setScanMode("idle");
      setLoading(false);
      return;
    }

    setScanMode("verify");
    try {
      const res = await apiFetch(`/api/public/verify/${token}`);
      if (!res.ok) {
        setError("Certificate not found or invalid QR code");
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (json?.ok && json.certificate) {
        setResult({
          type: json.certificate.type || "Certificate",
          certificateNumber: json.certificate.certificateNumber || null,
          status: json.certificate.status || "unknown",
          issuedAt: json.certificate.issuedAt || null,
          documentId: json.certificate.documentId || null,
        });
      } else {
        setError("Could not verify certificate");
      }
    } catch {
      setError("Connect to network to verify certificates");
    } finally {
      setLoading(false);
    }
  }

  async function handleAssignTag(certificateId: string) {
    if (!tagCode || assigning) return;
    setAssigning(true);
    try {
      const res = await apiFetch("/api/engineer/qr-tags/assign", {
        method: "POST",
        body: JSON.stringify({ code: tagCode, certificateId }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setAssignSuccess(true);
      } else {
        const msg =
          json?.error === "tag_not_found_or_unavailable"
            ? "This QR tag is not available or has already been assigned."
            : json?.error === "tag_already_assigned"
            ? "This QR tag was just assigned by someone else."
            : "Failed to assign QR tag. Please try again.";
        Alert.alert("Assignment Failed", msg);
      }
    } catch {
      // Offline: queue for later
      const key = makeIdempotencyKey("qr_assign");
      await enqueue({
        id: key,
        type: "qr_tag_assign",
        idempotencyKey: key,
        payload: { code: tagCode, certificateId },
      });
      flush();
      setAssignSuccess(true);
      Alert.alert("Queued Offline", "Tag assignment will sync when connected.");
    } finally {
      setAssigning(false);
    }
  }

  function resetScanner() {
    setScanned(false);
    setError("");
    setResult(null);
    setScanMode("idle");
    setTagCode(null);
    setAssignSuccess(false);
    setAssetResult(null);
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permText}>Camera access is needed to scan QR codes</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.7}>
          <Text style={styles.permBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!scanned ? (
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.hint}>Point at a QR code</Text>
          </View>
        </CameraView>
      ) : (
        <View style={styles.resultContainer}>
          {loading ? (
            <ActivityIndicator size="large" color="#0f172a" />
          ) : error ? (
            <>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={resetScanner} activeOpacity={0.7}>
                <Text style={styles.retryBtnText}>Scan Again</Text>
              </TouchableOpacity>
            </>
          ) : scanMode === "asset_view" && assetResult ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>{assetResult.name}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{assetResult.type}</Text>
              </View>
              {assetResult.identifier ? (
                <Text style={styles.resultSub}>ID: {assetResult.identifier}</Text>
              ) : null}
              <Text style={styles.resultSub}>Asset scanned successfully</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={resetScanner} activeOpacity={0.7}>
                <Text style={styles.retryBtnText}>Scan Another</Text>
              </TouchableOpacity>
            </View>
          ) : scanMode === "tag_assign" && tagCode ? (
            assignSuccess ? (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Tag Assigned</Text>
                <View style={[styles.statusBadge, styles.statusIssued]}>
                  <Text style={styles.statusText}>success</Text>
                </View>
                <Text style={styles.resultSub}>
                  QR tag has been linked to the certificate.
                </Text>
                <TouchableOpacity style={styles.retryBtn} onPress={resetScanner} activeOpacity={0.7}>
                  <Text style={styles.retryBtnText}>Scan Another</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>Assign QR Tag</Text>
                <Text style={styles.resultSub}>Select a certificate to link to this tag</Text>
                <View style={{ width: "100%", marginTop: 16 }}>
                  <CertificatePicker
                    onSelect={handleAssignTag}
                    disabled={assigning}
                  />
                </View>
                {assigning && (
                  <ActivityIndicator size="small" color="#0f172a" style={{ marginTop: 12 }} />
                )}
                <TouchableOpacity style={styles.retryBtn} onPress={resetScanner} activeOpacity={0.7}>
                  <Text style={styles.retryBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )
          ) : result ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>{result.type}</Text>
              {result.certificateNumber ? (
                <Text style={styles.resultSub}>No: {result.certificateNumber}</Text>
              ) : null}
              <View style={[styles.statusBadge, result.status === "issued" && styles.statusIssued]}>
                <Text style={styles.statusText}>{result.status}</Text>
              </View>
              {result.issuedAt ? (
                <Text style={styles.resultSub}>
                  Issued: {new Date(result.issuedAt).toLocaleString("en-GB")}
                </Text>
              ) : null}

              {result.documentId ? (
                <TouchableOpacity
                  style={styles.viewPdfBtn}
                  onPress={() => openDocument(result.documentId!)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewPdfText}>View PDF</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.retryBtn} onPress={resetScanner} activeOpacity={0.7}>
                <Text style={styles.retryBtnText}>Scan Another</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f8fafc" },
  camera: { flex: 1 },
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: "#fff",
    borderRadius: 16,
  },
  hint: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 20 },
  resultContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 24,
  },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  resultTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  resultSub: { fontSize: 14, color: "#64748b", marginTop: 4 },
  statusBadge: {
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  statusIssued: { backgroundColor: "#dcfce7" },
  statusText: { fontSize: 13, fontWeight: "600", color: "#334155", textTransform: "capitalize" },
  viewPdfBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 16,
    width: "100%",
    alignItems: "center",
  },
  viewPdfText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  retryBtn: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
  },
  retryBtnText: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  errorText: { fontSize: 15, color: "#dc2626", textAlign: "center", marginBottom: 16 },
  permText: { fontSize: 15, color: "#64748b", textAlign: "center", marginBottom: 16 },
  permBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  permBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});
