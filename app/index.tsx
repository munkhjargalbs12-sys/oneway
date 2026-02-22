import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { getToken } from "../services/authStorage";



export default function Index() {
  useEffect(() => {
    const checkAppState = async () => {
      const seenOnboarding = await AsyncStorage.getItem("seenOnboarding");
      const token = await getToken();

      if (!seenOnboarding) {
        router.replace("/onboarding");
        return;
      }

      if (token) {
        router.replace("/(tabs)/home");
      } else {
        router.replace("/(auth)/login");
      }
    };

    checkAppState();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
