import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppTheme } from "@/constants/theme";
import { playAppReadySoundOncePerSession } from "@/services/notificationSound";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { getToken, isGuestMode } from "../services/authStorage";

export default function Index() {
  useEffect(() => {
    const checkAppState = async () => {
      const seenOnboarding = await AsyncStorage.getItem("seenOnboarding");
      const token = await getToken();
      const guest = await isGuestMode();

      void playAppReadySoundOncePerSession();

      if (!seenOnboarding) {
        router.replace("/onboarding");
        return;
      }

      if (token || guest) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/(auth)/login");
      }
    };

    checkAppState();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={AppTheme.colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppTheme.colors.canvas,
  },
});
