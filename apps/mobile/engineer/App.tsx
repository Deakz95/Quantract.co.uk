import React from "react";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/auth/AuthContext";
import { TimerProvider } from "./src/timer/TimerContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <AuthProvider>
      <TimerProvider>
        <StatusBar style="auto" />
        <AppNavigator />
      </TimerProvider>
    </AuthProvider>
  );
}
