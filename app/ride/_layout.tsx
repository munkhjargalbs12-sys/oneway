import { Stack } from "expo-router";

export default function RideLayout() {
  return (
    <Stack screenOptions={{
      headerShown: true,
      headerBackTitle: "",
      headerBackTitleVisible: false,
      headerTintColor: "#111827",
      headerStyle: { backgroundColor: "#ffffff" },
      headerTitle: "",
    }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create/map" />
      <Stack.Screen name="create/form" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
