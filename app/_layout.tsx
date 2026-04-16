import HeaderBackButton from "@/components/HeaderBackButton";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import { getToken } from "@/services/authStorage";
import {
  resetNotificationSoundState,
  syncNotificationSound,
} from "@/services/notificationSound";
import "@/services/rideMeetupBackgroundTask";
import {
  stopRideMeetupTracking,
  syncRideMeetupTracking,
} from "@/services/rideMeetupTracking";
import {
  syncExpoPushTokenWithBackend,
  syncPushTokenWithBackend,
} from "@/services/pushNotifications";
import { clearRideReminderNotifications } from "@/services/rideReminders";
import * as Notifications from "expo-notifications";
import { Stack, router, usePathname } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Text, TextInput, type StyleProp, type TextStyle } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type StyledComponentWithDefaults<T> = T & {
  defaultProps?: Record<string, unknown> & {
    style?: StyleProp<TextStyle>;
  };
};

const textComponent = Text as StyledComponentWithDefaults<typeof Text>;
const textInputComponent = TextInput as StyledComponentWithDefaults<typeof TextInput>;

textComponent.defaultProps = {
  ...textComponent.defaultProps,
  style: [{ fontFamily: AppFontFamily }, textComponent.defaultProps?.style],
};

textInputComponent.defaultProps = {
  ...textInputComponent.defaultProps,
  style: [{ fontFamily: AppFontFamily }, textInputComponent.defaultProps?.style],
};

export default function RootLayout() {
  const pathname = usePathname();
  const isPublicRoute =
    pathname === "/onboarding" ||
    pathname === "/login" ||
    pathname === "/register";

  const pollNotificationSound = useCallback(async () => {
    const token = await getToken();

    if (!token) {
      resetNotificationSoundState();
      void clearRideReminderNotifications();
      void stopRideMeetupTracking();
      return;
    }

    try {
      const data = await apiFetch("/notifications").catch(() => []);
      await syncNotificationSound(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Global notification sound sync failed", err);
    }
  }, []);

  useEffect(() => {
    if (isPublicRoute) {
      resetNotificationSoundState();
      void clearRideReminderNotifications();
      void stopRideMeetupTracking();
      return;
    }

    void pollNotificationSound();
    void syncRideMeetupTracking();

    const notificationTimer = setInterval(() => {
      void pollNotificationSound();
    }, 8000);

    const meetupTimer = setInterval(() => {
      void syncRideMeetupTracking();
    }, 30000);

    return () => {
      clearInterval(notificationTimer);
      clearInterval(meetupTimer);
    };
  }, [isPublicRoute, pollNotificationSound]);

  useEffect(() => {
    if (isPublicRoute) {
      return;
    }

    void syncPushTokenWithBackend();
  }, [isPublicRoute]);

  useEffect(() => {
    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      resetNotificationSoundState();
    });

    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data || {};
        const rideId =
          data?.rideId ??
          data?.ride_id ??
          data?.relatedId ??
          data?.related_id ??
          null;
        const type = String(data?.type ?? "").toLowerCase();
        const reminderRole = String(data?.role ?? "").toLowerCase();

        if (rideId && type === "ride_reminder") {
          router.push({
            pathname: "/ride/[id]",
            params: {
              id: String(rideId),
              role: reminderRole === "driver" ? "driver" : "rider",
            },
          });
          return;
        }

        if (
          rideId &&
          ["booking_approved", "booking_rejected", "ride_cancelled", "ride_started_auto"].includes(type)
        ) {
          router.push({
            pathname: "/ride/[id]",
            params: {
              id: String(rideId),
              role: reminderRole === "driver" ? "driver" : "rider",
            },
          });
          return;
        }

        router.push("/notifications");
      });

    const tokenSubscription = Notifications.addPushTokenListener((token) => {
      void syncExpoPushTokenWithBackend(token.data);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
      tokenSubscription.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: AppTheme.colors.canvas }}
        edges={["top", "bottom"]}
      >
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
            contentStyle: { backgroundColor: AppTheme.colors.canvas },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="wallet" options={{ headerShown: false }} />
          <Stack.Screen name="vehicle" options={{ headerShown: false }} />
          <Stack.Screen name="rate" options={{ headerShown: false }} />
          <Stack.Screen name="role" options={{ title: "Үүрэг сонгох" }} />
          <Stack.Screen name="location/index" options={{ title: "Эхлэх байршил" }} />
          <Stack.Screen name="location/map" options={{ headerShown: false }} />
          <Stack.Screen name="radius" options={{ title: "Ойр зай" }} />
          <Stack.Screen name="time" options={{ title: "Цагийн бүс" }} />
          <Stack.Screen name="status" options={{ title: "Захиалгын төлөв" }} />
          <Stack.Screen name="api-check" options={{ title: "API шалгалт" }} />
          <Stack.Screen name="ride" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
