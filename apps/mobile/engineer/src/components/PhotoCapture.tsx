import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator, Linking } from "react-native";
import * as ImagePicker from "expo-image-picker";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export type PhotoResult = {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  fileName: string;
};

type PhotoCaptureProps = {
  onPhoto: (photo: PhotoResult) => void;
  disabled?: boolean;
};

export function PhotoCapture({ onPhoto, disabled }: PhotoCaptureProps) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState<"camera" | "library" | null>(null);

  async function pickImage(useCamera: boolean) {
    setLoading(true);
    setPermDenied(null);
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      };

      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          if (!perm.canAskAgain) {
            // Permission permanently denied — show persistent banner
            setPermDenied("camera");
          } else {
            Alert.alert("Permission Required", "Camera access is needed to take photos.");
          }
          setLoading(false);
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          if (!perm.canAskAgain) {
            setPermDenied("library");
          } else {
            Alert.alert("Permission Required", "Photo library access is needed.");
          }
          setLoading(false);
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (result.canceled || !result.assets?.[0]) {
        setLoading(false);
        return;
      }

      const asset = result.assets[0];

      // Validate MIME type
      const mime = (asset.mimeType || "image/jpeg").toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(mime)) {
        Alert.alert("Unsupported Format", "Please use JPEG, PNG, WebP, or HEIC images.");
        setLoading(false);
        return;
      }

      // Check file size
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        Alert.alert("File Too Large", "Photos must be under 5MB. Please try a smaller image.");
        setLoading(false);
        return;
      }

      const photo: PhotoResult = {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: mime,
        fileName: asset.fileName || `photo_${Date.now()}.jpg`,
      };

      setPreview(asset.uri);
      onPhoto(photo);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not capture photo. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#0f172a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Permission denied banner */}
      {permDenied ? (
        <TouchableOpacity
          style={styles.permBanner}
          onPress={() => Linking.openSettings()}
          activeOpacity={0.7}
        >
          <Text style={styles.permBannerText}>
            {permDenied === "camera" ? "Camera" : "Photo library"} access denied.
          </Text>
          <Text style={styles.permBannerLink}>Tap to open Settings</Text>
        </TouchableOpacity>
      ) : null}

      {preview ? (
        <Image source={{ uri: preview }} style={styles.preview} />
      ) : null}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => pickImage(true)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.btnText}>Take Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => pickImage(false)}
          disabled={disabled}
          activeOpacity={0.7}
        >
          <Text style={styles.btnText}>Choose Photo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  btnRow: { flexDirection: "row", gap: 8 },
  btn: {
    flex: 1,
    backgroundColor: "#0f172a",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  preview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#e2e8f0",
  },
  permBanner: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    alignItems: "center",
  },
  permBannerText: { fontSize: 12, fontWeight: "600", color: "#991b1b" },
  permBannerLink: { fontSize: 12, color: "#2563eb", marginTop: 2, textDecorationLine: "underline" },
});
