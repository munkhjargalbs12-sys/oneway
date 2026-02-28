import { Stack } from "expo-router";
import React from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#54605b" }} edges={["top", "bottom"]}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#88998f" },
          }}
        >
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/register" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="location/index" />
          <Stack.Screen name="location/map" />
          <Stack.Screen name="ride" />
        </Stack>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
