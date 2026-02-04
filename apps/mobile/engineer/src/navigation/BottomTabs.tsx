import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import TodayStack from "./TodayStack";
import JobsStack from "./JobsStack";
import ReceiptsStack from "./ReceiptsStack";
import ChecksStack from "./ChecksStack";
import ScanCertScreen from "../screens/ScanCertScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { useHasEntitlement } from "../entitlements/EntitlementsContext";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const hasCertificates = useHasEntitlement("module_certificates");
  const hasScheduledChecks = useHasEntitlement("feature_scheduled_checks");

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0f172a",
        tabBarInactiveTintColor: "#94a3b8",
        tabBarStyle: { borderTopColor: "#e2e8f0" },
      }}
    >
      <Tab.Screen name="TodayTab" component={TodayStack} options={{ title: "Today" }} />
      <Tab.Screen name="JobsTab" component={JobsStack} options={{ title: "Jobs" }} />
      {hasScheduledChecks ? (
        <Tab.Screen name="ChecksTab" component={ChecksStack} options={{ title: "Checks" }} />
      ) : null}
      <Tab.Screen name="ReceiptsTab" component={ReceiptsStack} options={{ title: "Receipts" }} />
      {hasCertificates ? (
        <Tab.Screen
          name="ScanTab"
          component={ScanCertScreen}
          options={{
            title: "Scan",
            headerShown: true,
            headerTitle: "Scan Certificate",
            headerStyle: { backgroundColor: "#0f172a" },
            headerTintColor: "#fff",
            headerTitleStyle: { fontWeight: "700" },
          }}
        />
      ) : null}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      />
    </Tab.Navigator>
  );
}
