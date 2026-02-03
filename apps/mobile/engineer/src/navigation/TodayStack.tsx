import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TodayScreen from "../screens/TodayScreen";
import JobDetailScreen from "../screens/JobDetailScreen";
import LogTimeScreen from "../screens/LogTimeScreen";

const Stack = createNativeStackNavigator();

export default function TodayStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="Today" component={TodayScreen} />
      <Stack.Screen
        name="JobDetail"
        component={JobDetailScreen}
        options={{ title: "Job" }}
      />
      <Stack.Screen
        name="LogTime"
        component={LogTimeScreen}
        options={{ title: "Log Time" }}
      />
    </Stack.Navigator>
  );
}
