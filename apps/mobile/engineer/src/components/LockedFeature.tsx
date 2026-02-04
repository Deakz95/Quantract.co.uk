import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useHasEntitlement, type EntitlementKey } from "../entitlements/EntitlementsContext";

type LockedFeatureProps = {
  entitlement: EntitlementKey;
  children: React.ReactNode;
  message?: string;
};

/**
 * Gate component for React Native.
 * Renders children if entitlement is met, otherwise shows a lock overlay.
 * Fail-open during loading to avoid blocking core engineer workflows.
 */
export function LockedFeature({ entitlement, children, message }: LockedFeatureProps) {
  const hasAccess = useHasEntitlement(entitlement);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.dimmed}>{children}</View>
      <View style={styles.overlay}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Upgrade Required</Text>
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

type HideIfLockedProps = {
  entitlement: EntitlementKey;
  children: React.ReactNode;
};

/**
 * Hides children entirely if entitlement is not met.
 */
export function HideIfLocked({ entitlement, children }: HideIfLockedProps) {
  const hasAccess = useHasEntitlement(entitlement);
  if (!hasAccess) return null;
  return <>{children}</>;
}

const styles = StyleSheet.create({
  wrapper: { position: "relative" },
  dimmed: { opacity: 0.35 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    borderRadius: 12,
  },
  badge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  message: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
