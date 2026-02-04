import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 2048;

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

  async function pickImage(useCamera: boolean) {
    setLoading(true);
    try {
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: false,
      };

      // Auto-resize if image is too large
      if (MAX_DIMENSION) {
        options.quality = 0.8;
      }

      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission Required", "Camera access is needed to take photos.");
          setLoading(false);
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission Required", "Photo library access is needed.");
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
        mimeType: asset.mimeType || "image/jpeg",
        fileName: asset.fileName || `photo_${Date.now()}.jpg`,
      };

      setPreview(asset.uri);
      onPhoto(photo);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not capture photo");
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
});
