import HeaderBackButton from "@/components/HeaderBackButton";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { Stack } from "expo-router";

export default function VehicleLayout() {
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
      <Stack.Screen name="add" options={{ title: "Машин нэмэх" }} />
    </Stack>
  );
}
