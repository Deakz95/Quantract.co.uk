import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/auth/AuthContext";
import { EntitlementsProvider } from "./src/entitlements/EntitlementsContext";
import { TimerProvider } from "./src/timer/TimerContext";
import { OutboxProvider } from "./src/offline/OutboxContext";
import { CertDraftProvider } from "./src/offline/CertDraftContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <AuthProvider>
      <EntitlementsProvider>
        <TimerProvider>
          <OutboxProvider>
            <CertDraftProvider>
              <StatusBar style="auto" />
              <AppNavigator />
            </CertDraftProvider>
          </OutboxProvider>
        </TimerProvider>
      </EntitlementsProvider>
    </AuthProvider>
  );
}
