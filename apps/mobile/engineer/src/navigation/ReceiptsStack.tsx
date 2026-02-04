import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AddReceiptScreen from "../screens/AddReceiptScreen";

const Stack = createNativeStackNavigator();

export default function ReceiptsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen
        name="AddReceipt"
        component={AddReceiptScreen}
        options={{ title: "Add Receipt" }}
      />
    </Stack.Navigator>
  );
}
