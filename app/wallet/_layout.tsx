import HeaderBackButton from "@/components/HeaderBackButton";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { Stack } from "expo-router";

export default function WalletLayout() {
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
      <Stack.Screen name="index" options={{ title: "Хэтэвч" }} />
      <Stack.Screen name="add" options={{ title: "Мөнгө нэмэх" }} />
      <Stack.Screen name="history" options={{ title: "Гүйлгээний түүх" }} />
      <Stack.Screen name="withdraw" options={{ title: "Мөнгө татах" }} />
    </Stack>
  );
}
