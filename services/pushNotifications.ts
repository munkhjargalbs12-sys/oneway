import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { apiFetch } from "./apiClient";
import { getToken } from "./authStorage";

const LAST_SYNCED_PUSH_TOKEN_KEY = "oneway_push_token_synced";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    null
  );
}

function hasGrantedPermission(
  settings: Notifications.NotificationPermissionsStatus
) {
  if (settings.status === "granted") {
    return true;
  }

  if (Platform.OS === "ios") {
    return (
      settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      settings.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL
    );
  }

  return false;
}

function normalizeExpoPushToken(value: string | null | undefined) {
  const token = String(value || "").trim();
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token)
    ? token
    : null;
}

async function ensureDefaultNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "OneWay Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 180, 250],
      lightColor: "#C47B55",
      sound: "default",
    });
  }
}

export async function getNotificationPermissionSettings() {
  await ensureDefaultNotificationChannel();
  return Notifications.getPermissionsAsync();
}

export async function areNotificationsEnabled() {
  const settings = await getNotificationPermissionSettings();
  return hasGrantedPermission(settings);
}

export async function ensureNotificationPermission() {
  await ensureDefaultNotificationChannel();

  const existing = await Notifications.getPermissionsAsync();
  if (hasGrantedPermission(existing)) {
    return existing;
  }

  return Notifications.requestPermissionsAsync();
}

export async function registerForPushNotificationsAsync() {
  await ensureDefaultNotificationChannel();

  if (!Device.isDevice) {
    console.log("Push notifications require a physical device");
    return null;
  }

  const finalSettings = await ensureNotificationPermission();

  if (!hasGrantedPermission(finalSettings)) {
    console.log("Push notification permission was not granted");
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.log("Missing EAS project id for Expo push token");
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return normalizeExpoPushToken(token.data);
  } catch (error) {
    console.log("Failed to get Expo push token", error);
    return null;
  }
}

export async function syncExpoPushTokenWithBackend(pushToken: string) {
  const normalized = normalizeExpoPushToken(pushToken);
  const authToken = await getToken();

  if (!normalized || !authToken) {
    return null;
  }

  const lastSyncedToken = await AsyncStorage.getItem(LAST_SYNCED_PUSH_TOKEN_KEY);
  if (lastSyncedToken === normalized) {
    return normalized;
  }

  await apiFetch("/users/push-token", {
    method: "POST",
    body: JSON.stringify({ expo_push_token: normalized }),
  });

  await AsyncStorage.setItem(LAST_SYNCED_PUSH_TOKEN_KEY, normalized);
  return normalized;
}

export async function syncPushTokenWithBackend() {
  const pushToken = await registerForPushNotificationsAsync();
  if (!pushToken) {
    return null;
  }

  return syncExpoPushTokenWithBackend(pushToken);
}

export async function clearPushTokenSyncState() {
  await AsyncStorage.removeItem(LAST_SYNCED_PUSH_TOKEN_KEY);
}

export async function removePushTokenFromBackend() {
  const authToken = await getToken();
  await clearPushTokenSyncState();

  if (!authToken) {
    return false;
  }

  try {
    await apiFetch("/users/push-token", { method: "DELETE" });
    return true;
  } catch (error) {
    console.log("Failed to remove push token from backend", error);
    return false;
  }
}
