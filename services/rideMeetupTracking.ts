import * as Location from "expo-location";

const LEGACY_RIDE_MEETUP_BACKGROUND_TASK = "oneway-ride-meetup-background";

export async function stopRideMeetupTracking() {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(
    LEGACY_RIDE_MEETUP_BACKGROUND_TASK
  ).catch(() => false);

  if (!hasStarted) {
    return;
  }

  await Location.stopLocationUpdatesAsync(LEGACY_RIDE_MEETUP_BACKGROUND_TASK).catch(
    () => null
  );
}
