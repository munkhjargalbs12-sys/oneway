import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

let notificationPlayer: AudioPlayer | null = null;
let rideReminderPlayer: AudioPlayer | null = null;
let rideCreatedPlayer: AudioPlayer | null = null;
let actionSuccessPlayer: AudioPlayer | null = null;
let appReadyPlayer: AudioPlayer | null = null;
let audioModeReady = false;
let hasPrimedUnreadBaseline = false;
let hasPlayedAppReadyThisSession = false;
let previousUnreadKeys = new Set<string>();
let lastPlayedAt = 0;
let lastRideReminderPlayedAt = 0;
let lastRideCreatedPlayedAt = 0;
let lastActionSuccessPlayedAt = 0;

function buildNotificationKey(item: any, index: number) {
  const rawId = item?.id ?? item?.notification_id ?? item?.notificationId ?? null;
  if (rawId !== null && rawId !== undefined && String(rawId).trim()) {
    return `id:${String(rawId).trim()}`;
  }

  const createdAt = String(item?.created_at ?? item?.createdAt ?? "");
  const type = String(item?.type ?? "");
  const title = String(item?.title ?? "");
  const body = String(item?.body ?? "");

  return `fallback:${index}:${createdAt}:${type}:${title}:${body}`;
}

function getUnreadNotificationEntries(list: any[]) {
  if (!Array.isArray(list)) return [];

  return list
    .filter((item) => !item?.is_read)
    .map((item, index) => ({
      item,
      key: buildNotificationKey(item, index),
    }));
}

function isRideReminderNotification(item: any) {
  return String(item?.type ?? "").trim().toLowerCase() === "ride_reminder";
}

async function ensureAudioMode() {
  if (!audioModeReady) {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "mixWithOthers",
    });
    audioModeReady = true;
  }
}

async function replayPlayer(player: AudioPlayer) {
  await player.seekTo(0).catch(() => null);
  player.play();
}

async function ensureNotificationPlayer() {
  await ensureAudioMode();

  if (!notificationPlayer) {
    notificationPlayer = createAudioPlayer(
      require("../assets/sounds/notification-beep.wav")
    );
    notificationPlayer.volume = 0.78;
  }

  return notificationPlayer;
}

async function ensureRideReminderPlayer() {
  await ensureAudioMode();

  if (!rideReminderPlayer) {
    rideReminderPlayer = createAudioPlayer(
      require("../assets/sounds/horn.wav")
    );
    rideReminderPlayer.volume = 0.9;
  }

  return rideReminderPlayer;
}

async function ensureRideCreatedPlayer() {
  await ensureAudioMode();

  if (!rideCreatedPlayer) {
    rideCreatedPlayer = createAudioPlayer(
      require("../assets/sounds/ride-created.wav")
    );
    rideCreatedPlayer.volume = 0.8;
  }

  return rideCreatedPlayer;
}

async function ensureActionSuccessPlayer() {
  await ensureAudioMode();

  if (!actionSuccessPlayer) {
    actionSuccessPlayer = createAudioPlayer(
      require("../assets/sounds/action-success.wav")
    );
    actionSuccessPlayer.volume = 0.74;
  }

  return actionSuccessPlayer;
}

async function ensureAppReadyPlayer() {
  await ensureAudioMode();

  if (!appReadyPlayer) {
    appReadyPlayer = createAudioPlayer(require("../assets/sounds/app-open.wav"));
    appReadyPlayer.volume = 0.46;
  }

  return appReadyPlayer;
}

async function playNotificationSound() {
  const now = Date.now();
  if (now - lastPlayedAt < 1200) {
    return false;
  }

  lastPlayedAt = now;

  try {
    const player = await ensureNotificationPlayer();
    await replayPlayer(player);
    return true;
  } catch (error) {
    console.log("Notification sound playback failed", error);
    return false;
  }
}

async function playRideReminderSound() {
  const now = Date.now();
  if (now - lastRideReminderPlayedAt < 1200) {
    return false;
  }

  lastRideReminderPlayedAt = now;

  try {
    const player = await ensureRideReminderPlayer();
    await replayPlayer(player);
    return true;
  } catch (error) {
    console.log("Ride reminder sound playback failed", error);
    return false;
  }
}

export function resetNotificationSoundState() {
  hasPrimedUnreadBaseline = false;
  previousUnreadKeys = new Set<string>();
}

export async function syncNotificationSound(list: any[]) {
  const nextUnreadEntries = getUnreadNotificationEntries(list);
  const nextUnreadKeys = new Set(nextUnreadEntries.map((entry) => entry.key));

  if (!hasPrimedUnreadBaseline) {
    previousUnreadKeys = nextUnreadKeys;
    hasPrimedUnreadBaseline = true;
    return false;
  }

  const newUnreadEntries = nextUnreadEntries.filter(
    (entry) => !previousUnreadKeys.has(entry.key)
  );

  previousUnreadKeys = nextUnreadKeys;

  if (newUnreadEntries.length === 0) {
    return false;
  }

  if (newUnreadEntries.some((entry) => isRideReminderNotification(entry.item))) {
    return await playRideReminderSound();
  }

  return await playNotificationSound();
}

export async function playRideCreatedSound() {
  const now = Date.now();
  if (now - lastRideCreatedPlayedAt < 900) {
    return false;
  }

  lastRideCreatedPlayedAt = now;

  try {
    const player = await ensureRideCreatedPlayer();
    await replayPlayer(player);
    return true;
  } catch (error) {
    console.log("Ride created sound playback failed", error);
    return false;
  }
}

export async function playActionSuccessSound() {
  const now = Date.now();
  if (now - lastActionSuccessPlayedAt < 700) {
    return false;
  }

  lastActionSuccessPlayedAt = now;

  try {
    const player = await ensureActionSuccessPlayer();
    await replayPlayer(player);
    return true;
  } catch (error) {
    console.log("Action success sound playback failed", error);
    return false;
  }
}

export async function playAppReadySoundOncePerSession() {
  if (hasPlayedAppReadyThisSession) {
    return false;
  }

  try {
    const player = await ensureAppReadyPlayer();
    await replayPlayer(player);
    hasPlayedAppReadyThisSession = true;
    return true;
  } catch (error) {
    console.log("App ready sound playback failed", error);
    return false;
  }
}
