import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* ONBOARDING */}
      <Stack.Screen name="onboarding" />

      {/* AUTH */}
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="(auth)/register" />

      {/* MAIN APP */}
      <Stack.Screen name="(tabs)" />

      {/* LOCATION */}
      <Stack.Screen name="location/index" />
      <Stack.Screen name="location/map" />

      {/* RIDE */}
      <Stack.Screen name="ride" />
    </Stack>
  );
}
