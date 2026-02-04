import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChecksScreen from "../screens/ChecksScreen";
import CheckDetailScreen from "../screens/CheckDetailScreen";

const Stack = createNativeStackNavigator();

export default function ChecksStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen
        name="Checks"
        component={ChecksScreen}
        options={{ title: "Checks" }}
      />
      <Stack.Screen
        name="CheckDetail"
        component={CheckDetailScreen}
        options={{ title: "Complete Check" }}
      />
    </Stack.Navigator>
  );
}
