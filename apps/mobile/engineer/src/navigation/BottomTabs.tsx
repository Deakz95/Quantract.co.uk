import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import TodayStack from "./TodayStack";
import JobsStack from "./JobsStack";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
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
