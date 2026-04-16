import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

import { apiFetch } from "./apiClient";

export const RIDE_MEETUP_BACKGROUND_TASK = "oneway-ride-meetup-background";

const STORED_TARGET_KEY = "oneway_ride_meetup_background_target";
const LAST_BACKGROUND_REPORT_KEY = "oneway_ride_meetup_background_last_report";
const REPORT_THROTTLE_MS = 12000;

type BackgroundTarget = {
  key: string;
  rideId: number;
  role: "driver" | "rider";
};

function normalizeRole(value: any): "driver" | "rider" {
  return String(value ?? "").trim().toLowerCase() === "driver" ? "driver" : "rider";
}

async function getStoredTarget(): Promise<BackgroundTarget | null> {
  const raw = await AsyncStorage.getItem(STORED_TARGET_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    const rideId = Number(parsed?.rideId);
    if (!Number.isFinite(rideId) || rideId <= 0) {
      return null;
    }

    return {
      key: String(parsed?.key || `${normalizeRole(parsed?.role)}:${rideId}`),
      rideId,
      role: normalizeRole(parsed?.role),
    };
  } catch {
    return null;
  }
}

async function setStoredTarget(target: BackgroundTarget | null) {
  if (!target) {
    await AsyncStorage.removeItem(STORED_TARGET_KEY);
    return;
  }

  await AsyncStorage.setItem(STORED_TARGET_KEY, JSON.stringify(target));
}

async function shouldThrottleBackgroundReport() {
  const raw = await AsyncStorage.getItem(LAST_BACKGROUND_REPORT_KEY);
  const lastReportAt = Number(raw);
  if (Number.isFinite(lastReportAt) && Date.now() - lastReportAt < REPORT_THROTTLE_MS) {
    return true;
  }

  await AsyncStorage.setItem(LAST_BACKGROUND_REPORT_KEY, String(Date.now()));
  return false;
}

async function clearBackgroundReportState() {
  await AsyncStorage.removeItem(LAST_BACKGROUND_REPORT_KEY);
}

if (!TaskManager.isTaskDefined(RIDE_MEETUP_BACKGROUND_TASK)) {
  TaskManager.defineTask(RIDE_MEETUP_BACKGROUND_TASK, async ({ data, error }) => {
    if (error) {
      console.log("Ride meetup background task error", error);
      return;
    }

    const target = await getStoredTarget();
    if (!target) {
      return;
    }

    const locations = Array.isArray((data as any)?.locations) ? (data as any).locations : [];
    const latest = locations[locations.length - 1];
    const coords = latest?.coords;

    if (!coords) {
      return;
    }

    if (await shouldThrottleBackgroundReport()) {
      return;
    }

    try {
      const response = await apiFetch(`/rides/${target.rideId}/presence`, {
        method: "POST",
        body: JSON.stringify({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        }),
      });

      if (
        response?.ride_started ||
        String(response?.ride_status || "").toLowerCase() === "started"
      ) {
        await stopRideMeetupBackgroundTracking();
      }
    } catch (taskError) {
      console.log("Ride meetup background sync failed", taskError);
    }
  });
}

export async function ensureRideMeetupBackgroundTracking(target: BackgroundTarget) {
  const backgroundPermission = await Location.getBackgroundPermissionsAsync();
  if (!backgroundPermission.granted) {
    return false;
  }

  await setStoredTarget(target);
  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
    RIDE_MEETUP_BACKGROUND_TASK
  ).catch(() => false);

  if (alreadyStarted) {
    return true;
  }

  await Location.startLocationUpdatesAsync(RIDE_MEETUP_BACKGROUND_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 15000,
    distanceInterval: 10,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.OtherNavigation,
    foregroundService: {
      notificationTitle: "OneWay байршил шалгаж байна",
      notificationBody: "Уулзах цэг дээр ирц баталгаажуулж байна.",
      notificationColor: "#C47B55",
      killServiceOnDestroy: false,
    },
  });

  return true;
}

export async function isRideMeetupBackgroundTrackingActive() {
  return Location.hasStartedLocationUpdatesAsync(RIDE_MEETUP_BACKGROUND_TASK).catch(
    () => false
  );
}

export async function stopRideMeetupBackgroundTracking() {
  const hasStarted = await isRideMeetupBackgroundTrackingActive();

  await setStoredTarget(null);
  await clearBackgroundReportState();

  if (!hasStarted) {
    return;
  }

  await Location.stopLocationUpdatesAsync(RIDE_MEETUP_BACKGROUND_TASK).catch(() => null);
}
