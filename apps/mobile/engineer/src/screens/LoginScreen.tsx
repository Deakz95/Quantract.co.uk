import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../auth/AuthContext";

export default function LoginScreen() {
  const { login, isOnline } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setError("");
    if (!email.trim() || !password) {
      setError("Email and password are required");
      return;
    }
    setBusy(true);
    const result = await login(email.trim().toLowerCase(), password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error || "Login failed");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.title}>Quantract</Text>
        <Text style={styles.subtitle}>Engineer Login</Text>

        {isOnline === false && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>Offline — check your connection</Text>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
          editable={!busy}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
          editable={!busy}
          onSubmitEditing={handleLogin}
        />

        <TouchableOpacity
          style={[styles.button, busy && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={busy}
          activeOpacity={0.7}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign in</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 32,
  },
  offlineBanner: {
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  offlineText: {
    color: "#dc2626",
    fontSize: 13,
    textAlign: "center",
  },
  error: {
    color: "#dc2626",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    color: "#0f172a",
  },
  button: {
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
