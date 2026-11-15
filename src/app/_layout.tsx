import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "../state/auth";
import { Gate } from "../components/gate";
import { runAutoBackup } from "../lib/autobackup";

export default function RootLayout() {
  useEffect(() => {
    runAutoBackup();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="suppliers" />
          <Stack.Screen name="debts" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="staff" />
          <Stack.Screen name="backup" />
          <Stack.Screen name="audit" />
        </Stack>
        <Gate />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
