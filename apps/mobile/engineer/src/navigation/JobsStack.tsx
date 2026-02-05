import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import JobsScreen from "../screens/JobsScreen";
import JobDetailScreen from "../screens/JobDetailScreen";
import LogTimeScreen from "../screens/LogTimeScreen";
import CertificateEditScreen from "../screens/CertificateEditScreen";
import JobPackScreen from "../screens/JobPackScreen";

const Stack = createNativeStackNavigator();

export default function JobsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="Jobs" component={JobsScreen} />
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
      <Stack.Screen
        name="CertificateEdit"
        component={CertificateEditScreen}
        options={{ title: "Certificate" }}
      />
      <Stack.Screen
        name="JobPack"
        component={JobPackScreen}
        options={{ title: "Job Pack" }}
      />
    </Stack.Navigator>
  );
}
