import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import { apiFetch } from "./apiClient";
import { getToken } from "./authStorage";
import { getRideStartDate } from "./rideTiming";

const REMINDER_PREFIX = "oneway-ride-reminder";
const REMINDER_KIND = "ride_reminder";
const REMINDER_CHANNEL_ID = "default";
const REMINDER_LEAD_MINUTES = 10;
const IMMEDIATE_REMINDER_DELAY_MS = 2000;
const IMMEDIATE_REMINDER_STATE_KEY = "oneway_ride_reminder_immediate_state";

type ReminderScheduleKind = "scheduled" | "late";

function hasGrantedPermission(
  settings: Notifications.NotificationPermissionsStatus
) {
  if (settings.status === "granted") {
    return true;
  }

  if (settings.ios) {
    return (
      settings.ios.status === Notifications.IosAuthorizationStatus.AUTHORIZED ||
      settings.ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      settings.ios.status === Notifications.IosAuthorizationStatus.EPHEMERAL
    );
  }

  return false;
}

function extractRideList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rides)) return payload.rides;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getBookingEntries(payload: any) {
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

function normalizeStatus(value: any) {
  return String(value ?? "").trim().toLowerCase();
}

function toRideId(value: any) {
  const rideId = Number(value);
  return Number.isFinite(rideId) && rideId > 0 ? rideId : null;
}

function buildReminderIdentifier(role: "driver" | "rider", rideId: number) {
  return `${REMINDER_PREFIX}:${role}:${rideId}`;
}

function isReminderRequest(request: Notifications.NotificationRequest) {
  return (
    String(request.identifier || "").startsWith(`${REMINDER_PREFIX}:`) ||
    String(request.content.data?.kind || "").trim().toLowerCase() === REMINDER_KIND
  );
}

function shouldScheduleRideReminder(ride: any, now = new Date()) {
  const status = normalizeStatus(ride?.status);
  if (["started", "completed", "cancelled", "canceled"].includes(status)) {
    return false;
  }

  const startDate = getRideStartDate(ride);
  if (!startDate) {
    return false;
  }

  const reminderDate = new Date(
    startDate.getTime() - REMINDER_LEAD_MINUTES * 60 * 1000
  );

  return reminderDate.getTime() > now.getTime();
}

function isReminderEligible(ride: any, now = new Date()) {
  const status = normalizeStatus(ride?.status);
  if (["started", "completed", "cancelled", "canceled"].includes(status)) {
    return false;
  }

  const startDate = getRideStartDate(ride);
  if (!startDate) {
    return false;
  }

  return startDate.getTime() > now.getTime();
}

function buildReminderTitle() {
  return "Уулзах цаг дөхлөө";
}

function buildReminderBody(ride: any) {
  const startLocation = String(ride?.start_location || "").trim();
  const endLocation = String(ride?.end_location || "").trim();
  const startTime = String(ride?.start_time || "").trim().slice(0, 5);

  const routePrefix = endLocation ? `${endLocation} чиглэлийн` : "Таны аяллын";
  const locationPrompt =
    "Таныг уулзах цэгт цагтаа очсоныг шалгахын тулд байршил заагчаа асаана уу.";

  if (startLocation && startTime) {
    return `${routePrefix} уулзалт ${startTime}-д эхэлнэ. ${startLocation} цэгтээ очоорой. ${locationPrompt}`;
  }

  if (startLocation) {
    return `${routePrefix} уулзалт 10 минутын дараа эхэлнэ. ${startLocation} цэгтээ очоорой. ${locationPrompt}`;
  }

  if (startTime) {
    return `${routePrefix} уулзалт ${startTime}-д эхэлнэ. Уулзах цэгтээ очоорой. ${locationPrompt}`;
  }

  return `10 минутын дараа аялал эхэлнэ. Уулзах цэгтээ очоорой. ${locationPrompt}`;
}

type ReminderTarget = {
  identifier: string;
  ride: any;
  role: "driver" | "rider";
};

type ImmediateReminderState = Record<string, string>;

type ReminderSchedulePlan = {
  triggerDate: Date;
  kind: ReminderScheduleKind;
  startKey: string;
};

function buildReminderTargets({
  allRides,
  myRides,
  bookings,
}: {
  allRides: any;
  myRides: any;
  bookings: any;
}) {
  const targets = new Map<string, ReminderTarget>();
  const now = new Date();

  for (const ride of extractRideList(myRides)) {
    const rideId = toRideId(ride?.id);
    if (!rideId || !isReminderEligible(ride, now)) {
      continue;
    }

    const identifier = buildReminderIdentifier("driver", rideId);
    targets.set(identifier, { identifier, ride, role: "driver" });
  }

  const rideById = new Map<number, any>();
  for (const ride of extractRideList(allRides)) {
    const rideId = toRideId(ride?.id);
    if (!rideId) continue;
    rideById.set(rideId, ride);
  }

  for (const booking of getBookingEntries(bookings)) {
    const rideId = toRideId(booking?.ride_id ?? booking?.ride?.id ?? booking?.id);
    if (!rideId || normalizeStatus(booking?.status) !== "approved") {
      continue;
    }

    const ride = rideById.get(rideId);
    if (!ride || !isReminderEligible(ride, now)) {
      continue;
    }

    const identifier = buildReminderIdentifier("rider", rideId);
    targets.set(identifier, { identifier, ride, role: "rider" });
  }

  return Array.from(targets.values());
}

async function getImmediateReminderState() {
  try {
    const raw = await AsyncStorage.getItem(IMMEDIATE_REMINDER_STATE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function saveImmediateReminderState(state: ImmediateReminderState) {
  const entries = Object.entries(state).filter(
    ([key, value]) => key && typeof value === "string" && value
  );

  if (entries.length === 0) {
    await AsyncStorage.removeItem(IMMEDIATE_REMINDER_STATE_KEY).catch(() => null);
    return;
  }

  await AsyncStorage.setItem(
    IMMEDIATE_REMINDER_STATE_KEY,
    JSON.stringify(Object.fromEntries(entries))
  ).catch(() => null);
}

function buildLateReminderBody(ride: any, now = new Date()) {
  const startLocation = String(ride?.start_location || "").trim();
  const endLocation = String(ride?.end_location || "").trim();
  const startTime = String(ride?.start_time || "").trim().slice(0, 5);
  const startDate = getRideStartDate(ride);
  const remainingMinutes = startDate
    ? Math.max(1, Math.ceil((startDate.getTime() - now.getTime()) / 60000))
    : null;
  const routePrefix = endLocation ? `${endLocation} чиглэлийн` : "Таны аяллын";
  const timePrompt = remainingMinutes
    ? `${remainingMinutes} минутын дараа`
    : "удахгүй";
  const locationPrompt =
    "Уулзах цэгт очсоныг баталгаажуулахын тулд location-оо яг одоо асаана уу.";

  if (startLocation && startTime) {
    return `${routePrefix} уулзалт ${timePrompt} эхэлнэ. ${startLocation} цэгтээ очоорой. ${startTime}-ийн өмнө ${locationPrompt}`;
  }

  if (startLocation) {
    return `${routePrefix} уулзалт ${timePrompt} эхэлнэ. ${startLocation} цэгтээ очоорой. ${locationPrompt}`;
  }

  if (startTime) {
    return `${routePrefix} уулзалт ${timePrompt} эхэлнэ. ${startTime}-ийн өмнө уулзах цэгтээ очоорой. ${locationPrompt}`;
  }

  return `${routePrefix} уулзалт ${timePrompt} эхэлнэ. Уулзах цэгтээ очоорой. ${locationPrompt}`;
}

function buildReminderNotificationContent(
  ride: any,
  kind: ReminderScheduleKind,
  now = new Date()
) {
  if (kind === "late") {
    return {
      title: "Аялал удахгүй эхэлнэ • Location асаана уу",
      body: buildLateReminderBody(ride, now),
    };
  }

  return {
    title: "Уулзах цаг дөхлөө • Location асаана уу",
    body: buildReminderBody(ride),
  };
}

function getReminderSchedulePlan(
  ride: any,
  identifier: string,
  sentImmediateState: ImmediateReminderState,
  now = new Date()
): ReminderSchedulePlan | null {
  const startDate = getRideStartDate(ride);
  if (!startDate || startDate.getTime() <= now.getTime()) {
    return null;
  }

  const reminderDate = new Date(
    startDate.getTime() - REMINDER_LEAD_MINUTES * 60 * 1000
  );
  const startKey = String(startDate.getTime());

  if (reminderDate.getTime() > now.getTime()) {
    return {
      triggerDate: reminderDate,
      kind: "scheduled",
      startKey,
    };
  }

  if (sentImmediateState[identifier] === startKey) {
    return null;
  }

  return {
    triggerDate: new Date(now.getTime() + IMMEDIATE_REMINDER_DELAY_MS),
    kind: "late",
    startKey,
  };
}

async function loadMissingBookedRides({
  allRides,
  myRides,
  bookings,
}: {
  allRides: any;
  myRides: any;
  bookings: any;
}) {
  const knownRideIds = new Set<number>();

  for (const ride of [...extractRideList(allRides), ...extractRideList(myRides)]) {
    const rideId = toRideId(ride?.id);
    if (rideId) {
      knownRideIds.add(rideId);
    }
  }

  const approvedRideIds = Array.from(
    new Set(
      getBookingEntries(bookings)
        .filter((booking: any) => normalizeStatus(booking?.status) === "approved")
        .map((booking: any) =>
          toRideId(booking?.ride_id ?? booking?.ride?.id ?? booking?.id)
        )
        .filter((rideId: number | null): rideId is number => rideId !== null && !knownRideIds.has(rideId))
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
        console.log(`Ride reminder detail load skipped (${rideId})`, error);
        return null;
      }
    })
  );

  return responses
    .map((result) => (result.status === "fulfilled" ? result.value : null))
    .filter(Boolean);
}

async function getExistingReminderIds() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return new Set(
    scheduled.filter(isReminderRequest).map((request) => String(request.identifier))
  );
}

async function ensureLocalNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (hasGrantedPermission(existing)) {
    return true;
  }

  return false;
}

export async function clearRideReminderNotifications() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();

  await Promise.all(
    scheduled
      .filter(isReminderRequest)
      .map((request) =>
        Notifications.cancelScheduledNotificationAsync(String(request.identifier)).catch(
          () => null
        )
      )
  );

  await saveImmediateReminderState({});
}

export async function syncRideReminderNotifications({
  allRides,
  myRides,
  bookings,
}: {
  allRides: any;
  myRides: any;
  bookings: any;
}) {
  const hasPermission = await ensureLocalNotificationPermission();
  if (!hasPermission) {
    return false;
  }

  const fetchedBookedRides = await loadMissingBookedRides({ allRides, myRides, bookings });
  const targets = buildReminderTargets({
    allRides: [...extractRideList(allRides), ...fetchedBookedRides],
    myRides,
    bookings,
  });
  const existingIds = await getExistingReminderIds();
  const immediateReminderState = await getImmediateReminderState();
  const nextImmediateReminderState: ImmediateReminderState = {};

  await Promise.all(
    Array.from(existingIds).map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier).catch(() => null)
    )
  );

  for (const target of targets) {
    const plan = getReminderSchedulePlan(
      target.ride,
      target.identifier,
      immediateReminderState
    );
    if (!plan) {
      continue;
    }

    const content = buildReminderNotificationContent(
      target.ride,
      plan.kind
    );

    await Notifications.scheduleNotificationAsync({
      identifier: target.identifier,
      content: {
        title: content.title,
        body: content.body,
        sound: "default",
        data: {
          kind: REMINDER_KIND,
          type: REMINDER_KIND,
          rideId: Number(target.ride?.id),
          role: target.role,
          promptLocation: "meetup",
          reminderScheduleKind: plan.kind,
          screen: "/ride/[id]",
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: plan.triggerDate,
        channelId: REMINDER_CHANNEL_ID,
      },
    });

    if (plan.kind === "late") {
      nextImmediateReminderState[target.identifier] = plan.startKey;
    }
  }

  await saveImmediateReminderState(nextImmediateReminderState);

  return true;
}

export async function syncRideReminderNotificationsFromServer() {
  const token = await getToken();
  if (!token) {
    await clearRideReminderNotifications();
    return false;
  }

  const [allRidesResult, myRidesResult, bookingsResult] = await Promise.allSettled([
    apiFetch("/rides"),
    apiFetch("/rides/mine"),
    apiFetch("/bookings/mine"),
  ]);

  const allRides = allRidesResult.status === "fulfilled" ? allRidesResult.value : [];
  const myRides = myRidesResult.status === "fulfilled" ? myRidesResult.value : [];
  const bookings =
    bookingsResult.status === "fulfilled" ? bookingsResult.value : { bookings: [] };

  return syncRideReminderNotifications({
    allRides,
    myRides,
    bookings,
  });
}
