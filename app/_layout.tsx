import HeaderBackButton from "@/components/HeaderBackButton";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import {
  checkForAppUpdateAvailability,
  fetchAvailableAppUpdate,
  reloadToApplyUpdate,
} from "@/services/appUpdate";
import { apiFetch } from "@/services/apiClient";
import { getToken } from "@/services/authStorage";
import {
  resetNotificationSoundState,
  syncNotificationSound,
} from "@/services/notificationSound";
import { stopRideMeetupTracking } from "@/services/rideMeetupTracking";
import {
  syncExpoPushTokenWithBackend,
  syncPushTokenWithBackend,
} from "@/services/pushNotifications";
import {
  clearRideReminderNotifications,
  syncRideReminderNotificationsFromServer,
} from "@/services/rideReminders";
import * as Notifications from "expo-notifications";
import { Stack, router, usePathname } from "expo-router";
import React, { useCallback, useEffect } from "react";
import { Alert, AppState, Text, TextInput, type StyleProp, type TextStyle } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type StyledComponentWithDefaults<T> = T & {
  defaultProps?: Record<string, unknown> & {
    style?: StyleProp<TextStyle>;
  };
};

const textComponent = Text as StyledComponentWithDefaults<typeof Text>;
const textInputComponent = TextInput as StyledComponentWithDefaults<typeof TextInput>;
const AUTO_UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

let lastAutoUpdateCheckAt = 0;
let autoUpdateCheckInFlight = false;
let autoUpdatePromptVisible = false;

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

  const promptToApplyDownloadedUpdate = useCallback((message: string) => {
    autoUpdatePromptVisible = true;
    Alert.alert("Шинэчлэлт татагдлаа", message, [
      {
        text: "Дараа",
        style: "cancel",
        onPress: () => {
          autoUpdatePromptVisible = false;
        },
      },
      {
        text: "Одоо шинэчлэх",
        onPress: () => {
          autoUpdatePromptVisible = false;
          void reloadToApplyUpdate();
        },
      },
    ]);
  }, []);

  const promptToDownloadUpdate = useCallback((message: string) => {
    autoUpdatePromptVisible = true;
    Alert.alert("Шинэ update гарлаа", message, [
      {
        text: "Дараа",
        style: "cancel",
        onPress: () => {
          autoUpdatePromptVisible = false;
        },
      },
      {
        text: "Татах",
        onPress: () => {
          void (async () => {
            try {
              const result = await fetchAvailableAppUpdate();
              if (result.status === "downloaded") {
                promptToApplyDownloadedUpdate(result.message);
                return;
              }

              Alert.alert("Апп шинэчлэлт", result.message, [
                {
                  text: "OK",
                  onPress: () => {
                    autoUpdatePromptVisible = false;
                  },
                },
              ]);
            } catch (err) {
              console.log("Auto app update fetch failed", err);
              const errorMessage =
                err instanceof Error
                  ? err.message
                  : "Шинэчлэлт татах үед алдаа гарлаа.";
              Alert.alert("Алдаа", errorMessage, [
                {
                  text: "OK",
                  onPress: () => {
                    autoUpdatePromptVisible = false;
                  },
                },
              ]);
            }
          })();
        },
      },
    ]);
  }, [promptToApplyDownloadedUpdate]);

  const checkForAppUpdate = useCallback(
    async (force = false) => {
      if (__DEV__ || autoUpdateCheckInFlight || autoUpdatePromptVisible) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastAutoUpdateCheckAt < AUTO_UPDATE_CHECK_INTERVAL_MS) {
        return;
      }

      autoUpdateCheckInFlight = true;
      lastAutoUpdateCheckAt = now;

      try {
        const result = await checkForAppUpdateAvailability();
        if (result.status === "available") {
          promptToDownloadUpdate(result.message);
        }
      } catch (err) {
        console.log("Auto app update check failed", err);
      } finally {
        autoUpdateCheckInFlight = false;
      }
    },
    [promptToDownloadUpdate]
  );

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

  const pollRideReminders = useCallback(async () => {
    const token = await getToken();

    if (!token) {
      void clearRideReminderNotifications();
      return;
    }

    try {
      await syncRideReminderNotificationsFromServer();
    } catch (err) {
      console.log("Global ride reminder sync failed", err);
    }
  }, []);

  useEffect(() => {
    void checkForAppUpdate(true);

    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void checkForAppUpdate();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkForAppUpdate]);

  useEffect(() => {
    if (isPublicRoute) {
      resetNotificationSoundState();
      void clearRideReminderNotifications();
      void stopRideMeetupTracking();
      return;
    }

    void stopRideMeetupTracking();
    void pollNotificationSound();
    void pollRideReminders();

    const notificationTimer = setInterval(() => {
      void pollNotificationSound();
    }, 8000);

    const reminderTimer = setInterval(() => {
      void pollRideReminders();
    }, 60000);

    return () => {
      clearInterval(notificationTimer);
      clearInterval(reminderTimer);
    };
  }, [isPublicRoute, pollNotificationSound, pollRideReminders]);

  useEffect(() => {
    if (isPublicRoute) {
      return;
    }

    void syncPushTokenWithBackend();
  }, [isPublicRoute]);

  useEffect(() => {
    const receivedSubscription = Notifications.addNotificationReceivedListener((notification) => {
      resetNotificationSoundState();

      const data = notification.request.content.data || {};
      const type = String(data?.type ?? "").toLowerCase();

      if (
        ["booking_approved", "booking_rejected", "ride_cancelled", "ride_started_auto"].includes(type)
      ) {
        void syncRideReminderNotificationsFromServer();
      }
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

        if (
          ["ride_reminder", "booking_approved", "booking_rejected", "ride_cancelled", "ride_started_auto"].includes(type)
        ) {
          void syncRideReminderNotificationsFromServer();
        }

        if (rideId && type === "ride_reminder") {
          router.push({
            pathname: "/ride/[id]",
            params: {
              id: String(rideId),
              role: reminderRole === "driver" ? "driver" : "rider",
              promptLocation:
                String(data?.promptLocation ?? "").toLowerCase() === "meetup"
                  ? "meetup"
                  : undefined,
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
