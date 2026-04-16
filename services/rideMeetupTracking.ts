import * as Location from "expo-location";

import { getToken } from "./authStorage";
import { apiFetch } from "./apiClient";
import {
  ensureRideMeetupBackgroundTracking,
  isRideMeetupBackgroundTrackingActive,
  stopRideMeetupBackgroundTracking,
} from "./rideMeetupBackgroundTask";
import { getRideStartDate } from "./rideTiming";

const TRACKING_LEAD_MINUTES = 30;
const TRACKING_GRACE_MINUTES = 45;
const LOCATION_TIME_INTERVAL_MS = 15000;
const LOCATION_DISTANCE_INTERVAL_METERS = 10;

type TrackingRole = "driver" | "rider";

type TrackingTarget = {
  key: string;
  role: TrackingRole;
  rideId: number;
  ride: any;
};

let locationSubscription: Location.LocationSubscription | null = null;
let activeTargetKey: string | null = null;
let reportInFlight = false;
let lastReportAt = 0;
let syncInFlight: Promise<boolean> | null = null;
let permissionRetryAfter = 0;
let backgroundPermissionRetryAfter = 0;

function normalizeStatus(value: any) {
  return String(value ?? "").trim().toLowerCase();
}

function toRideId(value: any) {
  const rideId = Number(value);
  return Number.isFinite(rideId) && rideId > 0 ? rideId : null;
}

function extractRideList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rides)) return payload.rides;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getBookingEntries(payload: any): any[] {
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function isTrackableRide(ride: any, now = new Date()) {
  const status = normalizeStatus(ride?.status);
  if (["started", "completed", "cancelled", "canceled"].includes(status)) {
    return false;
  }

  const startDate = getRideStartDate(ride);
  if (!startDate) {
    return false;
  }

  const startsAt = startDate.getTime();
  const nowTime = now.getTime();
  return (
    nowTime >= startsAt - TRACKING_LEAD_MINUTES * 60 * 1000 &&
    nowTime <= startsAt + TRACKING_GRACE_MINUTES * 60 * 1000
  );
}

function buildTargetKey(role: TrackingRole, rideId: number) {
  return `${role}:${rideId}`;
}

function compareTargets(first: TrackingTarget, second: TrackingTarget) {
  const firstDate = getRideStartDate(first.ride)?.getTime() ?? Number.POSITIVE_INFINITY;
  const secondDate = getRideStartDate(second.ride)?.getTime() ?? Number.POSITIVE_INFINITY;

  if (firstDate !== secondDate) {
    return firstDate - secondDate;
  }

  if (first.role !== second.role) {
    return first.role === "driver" ? -1 : 1;
  }

  return first.rideId - second.rideId;
}

async function ensureForegroundPermission() {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) {
    permissionRetryAfter = 0;
    return true;
  }

  if (Date.now() < permissionRetryAfter) {
    return false;
  }

  const requested = await Location.requestForegroundPermissionsAsync();
  if (!requested.granted) {
    permissionRetryAfter = Date.now() + 5 * 60 * 1000;
  } else {
    permissionRetryAfter = 0;
  }
  return requested.granted;
}

async function ensureBackgroundPermission() {
  const existing = await Location.getBackgroundPermissionsAsync();
  if (existing.granted) {
    backgroundPermissionRetryAfter = 0;
    return true;
  }

  if (Date.now() < backgroundPermissionRetryAfter) {
    return false;
  }

  const requested = await Location.requestBackgroundPermissionsAsync();
  if (!requested.granted) {
    backgroundPermissionRetryAfter = Date.now() + 10 * 60 * 1000;
  } else {
    backgroundPermissionRetryAfter = 0;
  }

  return requested.granted;
}

async function fetchMissingBookedRides(bookings: any, rideById: Map<number, any>) {
  const approvedRideIds = Array.from(
    new Set(
      getBookingEntries(bookings)
        .filter((booking) => normalizeStatus(booking?.status) === "approved")
        .map((booking) => toRideId(booking?.ride_id ?? booking?.ride?.id ?? booking?.id))
        .filter((rideId): rideId is number => rideId !== null && !rideById.has(rideId))
    )
  );

  if (approvedRideIds.length === 0) {
    return [];
  }

  const responses = await Promise.allSettled(
    approvedRideIds.map(async (rideId) => {
      try {
        return await apiFetch(`/rides/${rideId}`);
      } catch (error) {
        console.log(`Ride detail load skipped for meetup tracking (${rideId})`, error);
        return null;
      }
    })
  );

  return responses
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter(Boolean);
}

function buildTrackingTargets({
  allRides,
  myRides,
  bookings,
}: {
  allRides: any;
  myRides: any;
  bookings: any;
}) {
  const now = new Date();
  const targets: TrackingTarget[] = [];
  const rideById = new Map<number, any>();

  for (const ride of [...extractRideList(allRides), ...extractRideList(myRides)]) {
    const rideId = toRideId(ride?.id);
    if (!rideId) continue;
    rideById.set(rideId, ride);
  }

  for (const ride of extractRideList(myRides)) {
    const rideId = toRideId(ride?.id);
    if (!rideId || !isTrackableRide(ride, now)) {
      continue;
    }

    targets.push({
      key: buildTargetKey("driver", rideId),
      role: "driver",
      rideId,
      ride,
    });
  }

  for (const booking of getBookingEntries(bookings)) {
    if (normalizeStatus(booking?.status) !== "approved") {
      continue;
    }

    const rideId = toRideId(booking?.ride_id ?? booking?.ride?.id ?? booking?.id);
    if (!rideId) {
      continue;
    }

    const ride = rideById.get(rideId);
    if (!ride || !isTrackableRide(ride, now)) {
      continue;
    }

    targets.push({
      key: buildTargetKey("rider", rideId),
      role: "rider",
      rideId,
      ride,
    });
  }

  return targets.sort(compareTargets);
}

async function reportRideMeetupPresence(target: TrackingTarget, coords: Location.LocationObjectCoords) {
  if (reportInFlight || activeTargetKey !== target.key) {
    return;
  }

  const now = Date.now();
  if (now - lastReportAt < 7000) {
    return;
  }

  reportInFlight = true;
  lastReportAt = now;

  try {
    const response = await apiFetch(`/rides/${target.rideId}/presence`, {
      method: "POST",
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      }),
    });

    if (response?.ride_started || normalizeStatus(response?.ride_status) === "started") {
      await stopRideMeetupTracking();
    }
  } catch (error) {
    console.log("Ride meetup presence sync failed", error);
  } finally {
    reportInFlight = false;
  }
}

async function startForegroundLocationTracking(target: TrackingTarget) {
  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: LOCATION_TIME_INTERVAL_MS,
      distanceInterval: LOCATION_DISTANCE_INTERVAL_METERS,
      mayShowUserSettingsDialog: true,
    },
    (location) => {
      if (!location?.coords || activeTargetKey !== target.key) {
        return;
      }

      void reportRideMeetupPresence(target, location.coords);
    }
  );

  return true;
}

export async function stopRideMeetupTracking() {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }

  await stopRideMeetupBackgroundTracking();

  activeTargetKey = null;
  reportInFlight = false;
  lastReportAt = 0;
}

export async function syncRideMeetupTracking() {
  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    const token = await getToken();
    if (!token) {
      await stopRideMeetupTracking();
      return false;
    }

    const [allRidesResult, myRidesResult, bookingsResult] = await Promise.allSettled([
      apiFetch("/rides"),
      apiFetch("/rides/mine"),
      apiFetch("/bookings/mine"),
    ]);

    const allRides = allRidesResult.status === "fulfilled" ? allRidesResult.value : [];
    const myRides = myRidesResult.status === "fulfilled" ? myRidesResult.value : [];
    const bookings = bookingsResult.status === "fulfilled" ? bookingsResult.value : { bookings: [] };

    const rideById = new Map<number, any>();
    for (const ride of [...extractRideList(allRides), ...extractRideList(myRides)]) {
      const rideId = toRideId(ride?.id);
      if (!rideId) continue;
      rideById.set(rideId, ride);
    }

    const fetchedBookedRides = await fetchMissingBookedRides(bookings, rideById);
    const targets = buildTrackingTargets({
      allRides: [...extractRideList(allRides), ...fetchedBookedRides],
      myRides,
      bookings,
    });

    const nextTarget = targets[0] || null;
    if (!nextTarget) {
      await stopRideMeetupTracking();
      return false;
    }

    if (activeTargetKey === nextTarget.key) {
      if (locationSubscription) {
        return true;
      }

      if (await isRideMeetupBackgroundTrackingActive()) {
        return true;
      }
    }

    const hasForegroundPermission = await ensureForegroundPermission();
    if (!hasForegroundPermission) {
      await stopRideMeetupTracking();
      return false;
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
    if (!servicesEnabled) {
      await stopRideMeetupTracking();
      return false;
    }

    await stopRideMeetupTracking();

    activeTargetKey = nextTarget.key;
    reportInFlight = false;
    lastReportAt = 0;

    const initialLocation = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    }).catch(() => null);

    if (initialLocation?.coords) {
      void reportRideMeetupPresence(nextTarget, initialLocation.coords);
    }

    const hasBackgroundPermission = await ensureBackgroundPermission();
    if (hasBackgroundPermission) {
      const backgroundStarted = await ensureRideMeetupBackgroundTracking({
        key: nextTarget.key,
        rideId: nextTarget.rideId,
        role: nextTarget.role,
      }).catch((error) => {
        console.log("Ride meetup background tracking failed to start", error);
        return false;
      });

      if (backgroundStarted) {
        return true;
      }
    }

    return startForegroundLocationTracking(nextTarget);
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}
