import { Stack } from "expo-router";

export default function RateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: "",
        headerBackTitleVisible: false,
        headerTintColor: "#111827",
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitle: "",
      }}
    >
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
