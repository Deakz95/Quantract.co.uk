import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "../auth/AuthContext";

export default function LoadingScreen() {
  const { isOnline } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quantract</Text>
      <ActivityIndicator size="large" color="#0f172a" style={styles.spinner} />
      {isOnline === true && <Text style={styles.status}>Connected</Text>}
      {isOnline === false && <Text style={[styles.status, styles.offline]}>Offline</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "800", color: "#0f172a" },
  spinner: { marginTop: 24 },
  status: { marginTop: 12, fontSize: 14, color: "#16a34a" },
  offline: { color: "#dc2626" },
});
