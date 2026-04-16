import HeaderBackButton from "@/components/HeaderBackButton";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { Stack } from "expo-router";

export default function RideLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: AppTheme.colors.text,
        headerStyle: { backgroundColor: AppTheme.colors.card },
        headerShadowVisible: false,
        headerTitleAlign: "center",
        headerTitleStyle: {
          fontFamily: AppFontFamily,
          fontSize: 17,
          fontWeight: "700",
          color: AppTheme.colors.text,
        },
        headerLeft: ({ tintColor }) => (
          <HeaderBackButton tintColor={tintColor} />
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Чиглэл" }} />
      <Stack.Screen name="search" options={{ title: "Чиглэл хайх" }} />
      <Stack.Screen name="create/map" options={{ headerShown: false }} />
      <Stack.Screen name="create/form" options={{ title: "Чиглэл үүсгэх" }} />
      <Stack.Screen name="[id]" options={{ title: "Чиглэлийн дэлгэрэнгүй" }} />
    </Stack>
  );
}
