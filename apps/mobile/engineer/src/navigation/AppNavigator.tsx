import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../auth/AuthContext";
import LoadingScreen from "../screens/LoadingScreen";
import LoginScreen from "../screens/LoginScreen";
import BottomTabs from "./BottomTabs";

export default function AppNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!token) return <LoginScreen />;

  return (
    <NavigationContainer>
      <BottomTabs />
    </NavigationContainer>
  );
}
