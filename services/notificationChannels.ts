import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export const DEFAULT_NOTIFICATION_CHANNEL_ID = "default";
export const RIDE_REMINDER_NOTIFICATION_CHANNEL_ID = "ride-reminder";
export const RIDE_REMINDER_NOTIFICATION_SOUND = "horn.wav";

export async function ensureDefaultNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      DEFAULT_NOTIFICATION_CHANNEL_ID,
      {
        name: "OneWay Alerts",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 180, 250],
        lightColor: "#C47B55",
        sound: "default",
      }
    );
  }
}

export async function ensureRideReminderNotificationChannel() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(
      RIDE_REMINDER_NOTIFICATION_CHANNEL_ID,
      {
        name: "Ride reminders",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 400, 160, 400],
        lightColor: "#C47B55",
        sound: RIDE_REMINDER_NOTIFICATION_SOUND,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.NOTIFICATION,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        },
      }
    );
  }
}

export async function ensureNotificationChannels() {
  await Promise.all([
    ensureDefaultNotificationChannel(),
    ensureRideReminderNotificationChannel(),
  ]);
}
