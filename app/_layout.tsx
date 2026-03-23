import { Stack } from "expo-router";
import React from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#54605b" }} edges={["top", "bottom"]}>
        <Stack
          screenOptions={{
            headerShown: true,
            headerBackTitle: "",
            headerBackTitleVisible: false,
            headerTintColor: "#111827",
            headerStyle: { backgroundColor: "#ffffff" },
            headerTitle: "",
            contentStyle: { backgroundColor: "#88998f" },
          }}
        >
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="wallet" options={{ headerShown: false }} />
          <Stack.Screen name="location/index" />
          <Stack.Screen name="location/map" />
          <Stack.Screen name="ride" />
        </Stack>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
