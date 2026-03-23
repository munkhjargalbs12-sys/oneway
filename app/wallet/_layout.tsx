import { Stack } from "expo-router";

export default function WalletLayout() {
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
      <Stack.Screen name="index" />
      <Stack.Screen name="add" />
      <Stack.Screen name="history" />
      <Stack.Screen name="withdraw" />
    </Stack>
  );
}
