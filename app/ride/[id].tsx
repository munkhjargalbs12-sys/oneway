import MapTypeHint from "@/components/MapTypeHint";
import MapTypeToggle, { type MapTypeOption } from "@/components/MapTypeToggle";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import {
  extractBookingIdByRide,
  getBookingStatusColor,
  getBookingStatusLabel,
} from "@/services/bookingStatus";
import {
  areNotificationsEnabled,
  ensureNotificationPermission,
  syncPushTokenWithBackend,
} from "@/services/pushNotifications";
import { formatRideDate } from "@/services/rideDate";
import { getRideStartDate } from "@/services/rideTiming";
import polyline from "@mapbox/polyline";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { apiFetch } from "../../services/apiClient";
import { isGuestMode } from "../../services/authStorage";
import { playActionSuccessSound } from "../../services/notificationSound";

const avatars: Record<string, any> = {
  grandfa: require("../../assets/profile/avatars/grandfa.png"),
  father: require("../../assets/profile/avatars/father.png"),
  guy: require("../../assets/profile/avatars/guy.png"),
  child: require("../../assets/profile/avatars/child.png"),
  grandma: require("../../assets/profile/avatars/grandma.png"),
  mother: require("../../assets/profile/avatars/mother.png"),
  women: require("../../assets/profile/avatars/women.png"),
  sister: require("../../assets/profile/avatars/sister.png"),
};

const seatImages: Record<number, any> = {
  1: require("../../assets/cars/1seat.png"),
  2: require("../../assets/cars/2seat.png"),
  3: require("../../assets/cars/3seat.png"),
  4: require("../../assets/cars/4seat.png"),
};

const MEETUP_TRACKING_LEAD_MINUTES = 30;
const MEETUP_TRACKING_GRACE_MINUTES = 45;

function getAvatarSource(avatarId?: string) {
  if (!avatarId) return avatars.sister;
  return avatars[avatarId] || avatars.sister;
}

function getRideOwnerName(ride: any) {
  return (
    ride?.user_name ||
    ride?.driver_name ||
    ride?.creator_name ||
    ride?.name ||
    ride?.user?.name ||
    ride?.driver?.name ||
    "Хэрэглэгч"
  );
}

function getLocationLabel(value: unknown, fallback: string) {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "completed") return styles.statusSuccess;
  if (normalized === "cancelled" || normalized === "canceled") return styles.statusDanger;
  if (normalized === "started" || normalized === "pending") return styles.statusWarning;
  return styles.statusNeutral;
}

function getBookingDescription(status?: string) {
  switch (String(status ?? "").toLowerCase()) {
    case "approved":
      return "Жолооч таны суудлыг баталгаажуулсан. Уулзах цэг, цагийн дагуу аялалдаа нэгдэнэ.";
    case "rejected":
      return "Энэ аяллын захиалга батлагдаагүй. Өөр тохирох аялал сонгох боломжтой.";
    case "cancelled":
    case "canceled":
      return "Энэ суудлын захиалга цуцлагдсан байна. Хэрэв хэрэгтэй бол өөр тохирох аялал сонгоно уу.";
    case "pending":
      return "Захиалга илгээгдсэн. Жолооч шийдвэр гармагц төлөв шинэчлэгдэнэ.";
    default:
      return "Энэ аяллын одоогийн захиалгын мэдээлэл энд харагдана.";
  }
}

function formatDistance(value?: number | null) {
  const distance = Number(value);
  if (!Number.isFinite(distance) || distance < 0) {
    return null;
  }

  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)} км`;
  }

  return `${Math.round(distance)} м`;
}

function formatLastSeen(value?: string | null) {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) {
    return "саяхан";
  }

  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes <= 0) {
    return "саяхан";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} мин өмнө`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} цаг өмнө`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} өдөр өмнө`;
}

function getMeetupParticipantStatusLabel(participant: any) {
  if (participant?.role === "driver" && participant?.location_verified) {
    return "Ирсэн, PIN бэлэн";
  }

  if (!participant?.pin_confirmed && participant?.location_verified) {
    return "Ирсэн, PIN хүлээж байна";
  }

  if (participant?.pin_confirmed) {
    return "PIN баталгаажсан";
  }

  if (participant?.arrived) {
    return "Ирсэн";
  }

  const attendanceStatus = String(participant?.attendance_status || "").toLowerCase();
  if (attendanceStatus === "arrived") {
    return "Ирсэн";
  }

  if (participant?.role === "driver") {
    return "Жолооч хянагдаж байна";
  }

  return "Ирц шалгаж байна";
}

function getMeetupSummaryCopy(presence: any, rideStatus: string) {
  const normalizedRideStatus = String(rideStatus || "").toLowerCase();
  const summary = presence?.summary;
  const driverArrived = Boolean(summary?.driver_arrived);
  const approvedPassengerCount = Number(summary?.approved_passenger_count || 0);
  const locationVerifiedPassengerCount = Number(summary?.location_verified_passenger_count || 0);
  const confirmedPassengerCount = Number(
    summary?.confirmed_passenger_count ?? summary?.arrived_passenger_count ?? 0
  );
  const remainingPassengers = Math.max(approvedPassengerCount - confirmedPassengerCount, 0);

  if (normalizedRideStatus === "started" || presence?.ride_started) {
    return "Баг бүрдэж, аялал эхэлсэн байна.";
  }

  if (summary?.ready_to_start) {
    return "Бүгд уулзах цэг дээр ирсэн. Аялал эхлэхэд бэлэн байна.";
  }

  if (!driverArrived && approvedPassengerCount === 0) {
    return "Одоогоор баталгаажсан зорчигч алга. Жолооч эхлэх цэг дээрээ ирэхийг шалгаж байна.";
  }

  if (!driverArrived) {
    return "Жолооч эхлэх цэг дээрээ ирэхийг шалгаж байна.";
  }

  if (remainingPassengers > 0) {
    if (locationVerifiedPassengerCount > 0) {
      return `Жолооч ирсэн. ${locationVerifiedPassengerCount} зорчигч уулзах цэг дээр ирсэн, ${remainingPassengers} PIN баталгаажуулалт хүлээж байна.`;
    }

    return `Жолооч ирсэн. Одоо ${remainingPassengers} зорчигч дутуу байна.`;
  }

  return "Зорчигчдын ирц шалгагдаж байна.";
}

function shouldPromptForMeetupLocation(ride: any, user: any, bookingStatus?: string | null) {
  const normalizedBookingStatus = String(bookingStatus || "").toLowerCase();
  const rideStatus = String(ride?.status || "").toLowerCase();
  const startDate = getRideStartDate(ride);

  if (
    !startDate ||
    !user ||
    !ride ||
    !(
      user?.id === ride?.user_id || normalizedBookingStatus === "approved"
    ) ||
    ["started", "completed", "cancelled", "canceled"].includes(rideStatus)
  ) {
    return false;
  }

  const now = Date.now();
  return (
    now >=
      startDate.getTime() - MEETUP_TRACKING_LEAD_MINUTES * 60 * 1000 &&
    now <=
      startDate.getTime() + MEETUP_TRACKING_GRACE_MINUTES * 60 * 1000
  );
}

export default function RideDetail() {
  const { id, role, promptLocation } = useLocalSearchParams<{
    id: string;
    role?: string;
    promptLocation?: string;
  }>();

  const [ride, setRide] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [mapType, setMapType] = useState<MapTypeOption>("standard");
  const [meetupPresence, setMeetupPresence] = useState<any>(null);
  const [meetupLoading, setMeetupLoading] = useState(false);
  const [meetupError, setMeetupError] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<
    boolean | null
  >(null);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [meetupLocationReady, setMeetupLocationReady] = useState<
    boolean | null
  >(null);
  const [meetupLocationLoading, setMeetupLocationLoading] = useState(false);
  const [meetupPin, setMeetupPin] = useState("");
  const [meetupPinLoading, setMeetupPinLoading] = useState(false);

  const mapRef = useRef<MapView | null>(null);
  const meetupLocationAlertShownRef = useRef(false);

  const decodePolyline = (encoded: string) =>
    polyline.decode(encoded).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));

  const loadRide = useCallback(
    async (rideIdParam?: string | number | null) => {
      const rideId = rideIdParam ?? id;
      if (!rideId) return null;

      const rideData = await apiFetch(`/rides/${rideId}`);
      setRide(rideData);

      try {
        const me = await apiFetch("/users/me");
        setUser(me);

        const myBookings = await apiFetch("/bookings/mine").catch(() => null);
        const rideIdNumber = Number(rideData?.id);
        const rawStatus =
          myBookings?.status_by_ride?.[String(rideData?.id)] ??
          myBookings?.status_by_ride?.[rideIdNumber];
        const bookingIdByRide = extractBookingIdByRide(myBookings);
        const nextBookingId = Number.isFinite(rideIdNumber)
          ? bookingIdByRide?.[rideIdNumber]
          : undefined;
        setBookingId(typeof nextBookingId === "number" ? nextBookingId : null);
        setBookingStatus(typeof rawStatus === "string" ? rawStatus : null);
      } catch {
        setUser(null);
        setBookingId(null);
        setBookingStatus(null);
      }

      return rideData;
    },
    [id]
  );

  useEffect(() => {
    if (!id) return;

    const loadInitialRide = async () => {
      try {
        await loadRide(id);
      } catch (err) {
        console.log("Failed to load ride:", err);
      } finally {
        setLoading(false);
      }
    };

    loadInitialRide();
  }, [id, loadRide]);

  useEffect(() => {
    if (ride?.polyline && mapRef.current) {
      const coords = decodePolyline(ride.polyline);
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  }, [ride]);

  const loadMeetupPresence = useCallback(async () => {
    const rideId = ride?.id ?? (id ? Number(id) : null);
    if (!rideId || !user) {
      setMeetupPresence(null);
      setMeetupError(null);
      return null;
    }

    setMeetupLoading(true);

    try {
      const data = await apiFetch(`/rides/${rideId}/presence`);
      setMeetupPresence(data);
      setMeetupError(null);
      return data;
    } catch (err: any) {
      const message = String(err?.message || "").trim();
      setMeetupPresence(null);
      setMeetupError(message || "Уулзах цэгийн мэдээллийг ачаалж чадсангүй.");
      return null;
    } finally {
      setMeetupLoading(false);
    }
  }, [id, ride?.id, user]);

  useEffect(() => {
    const normalizedBookingStatus = String(bookingStatus || "").toLowerCase();
    const canViewMeetupStatus =
      Boolean(user) && Boolean(ride) && (user?.id === ride?.user_id || normalizedBookingStatus === "approved");

    if (!canViewMeetupStatus) {
      setMeetupPresence(null);
      setMeetupError(null);
      setMeetupLoading(false);
      return;
    }

    void loadMeetupPresence();
    const intervalId = setInterval(() => {
      void loadMeetupPresence();
    }, 15000);

    return () => {
      clearInterval(intervalId);
    };
  }, [bookingStatus, loadMeetupPresence, ride, user]);

  const loadNotificationState = useCallback(async () => {
    const normalizedBookingStatus = String(bookingStatus || "").toLowerCase();
    const rideStatus = String(ride?.status || "").toLowerCase();
    const shouldPromptForNotifications =
      Boolean(user) &&
      ["pending", "approved"].includes(normalizedBookingStatus) &&
      !["started", "completed", "cancelled", "canceled"].includes(rideStatus);

    if (!shouldPromptForNotifications) {
      setNotificationsEnabled(null);
      return;
    }

    try {
      const enabled = await areNotificationsEnabled();
      setNotificationsEnabled(enabled);
    } catch {
      setNotificationsEnabled(false);
    }
  }, [bookingStatus, ride?.status, user]);

  useEffect(() => {
    void loadNotificationState();
  }, [loadNotificationState]);

  useEffect(() => {
    const normalizedBookingStatus = String(bookingStatus || "").toLowerCase();
    const rideStatus = String(ride?.status || "").toLowerCase();
    const shouldPromptForNotifications =
      Boolean(user) &&
      ["pending", "approved"].includes(normalizedBookingStatus) &&
      !["started", "completed", "cancelled", "canceled"].includes(rideStatus);

    if (!shouldPromptForNotifications) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void loadNotificationState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [bookingStatus, loadNotificationState, ride?.status, user]);

  const openMeetupLocationSettings = useCallback((message: string) => {
    Alert.alert("Location асаана уу", message, [
      { text: "Дараа" },
      {
        text: "Settings",
        onPress: () => {
          void Linking.openSettings().catch(() => null);
        },
      },
    ]);
  }, []);

  const loadMeetupLocationState = useCallback(async () => {
    if (!shouldPromptForMeetupLocation(ride, user, bookingStatus)) {
      setMeetupLocationReady(null);
      return null;
    }

    try {
      const [foreground, servicesEnabled] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.hasServicesEnabledAsync().catch(() => true),
      ]);

      const ready = foreground.granted && servicesEnabled;
      setMeetupLocationReady(ready);

      return {
        foregroundGranted: foreground.granted,
        servicesEnabled,
        ready,
      };
    } catch {
      setMeetupLocationReady(false);
      return {
        foregroundGranted: false,
        servicesEnabled: false,
        ready: false,
      };
    }
  }, [bookingStatus, ride, user]);

  useEffect(() => {
    void loadMeetupLocationState();
  }, [loadMeetupLocationState]);

  useEffect(() => {
    if (!shouldPromptForMeetupLocation(ride, user, bookingStatus)) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void loadMeetupLocationState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [bookingStatus, loadMeetupLocationState, ride, user]);

  const handleMeetupCheckIn = useCallback(async () => {
    const rideId = ride?.id ?? (id ? Number(id) : null);
    if (!rideId) {
      Alert.alert("Алдаа", "Ride мэдээлэл дутуу байна.");
      return;
    }

    setMeetupLocationLoading(true);

    try {
      let foreground = await Location.getForegroundPermissionsAsync();
      if (!foreground.granted) {
        foreground = await Location.requestForegroundPermissionsAsync();
      }

      if (!foreground.granted) {
        setMeetupLocationReady(false);
        openMeetupLocationSettings(
          "Уулзах цэг дээр ирснээ баталгаажуулахын тулд app-д байршлын зөвшөөрөл өгнө үү."
        );
        return;
      }

      let servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => true);
      if (!servicesEnabled && Platform.OS === "android") {
        await Location.enableNetworkProviderAsync().catch(() => null);
        servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => false);
      }

      if (!servicesEnabled) {
        setMeetupLocationReady(false);
        openMeetupLocationSettings(
          "Уулзах цэгийн ирцийг баталгаажуулахын тулд утасныхаа Location service-ийг асаана уу."
        );
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const response = await apiFetch(`/rides/${rideId}/presence`, {
        method: "POST",
        body: JSON.stringify({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
          check_in: true,
        }),
      });

      setMeetupPresence(response);
      setMeetupLocationReady(true);
      void playActionSuccessSound();

      if (response?.ride_started) {
        await loadRide(rideId);
        Alert.alert("Нэг чиглэл эхэллээ", "Нэг чиглэл амжилттай эхэллээ. Good luck!");
        return;
      }

      const actorRole = String(response?.actor_role || "").toLowerCase();
      if (actorRole === "driver") {
        Alert.alert(
          "Ирсэн баталгаажлаа",
          response?.meetup_code
            ? "PIN код гарлаа. Зорчигчид ирэхээр кодоо хэлж ирцийг нь баталгаажуулна."
            : "Таны байршил баталгаажлаа."
        );
      } else if (response?.summary?.driver_arrived) {
        Alert.alert(
          "Ирсэн баталгаажлаа",
          "Жолоочоос 4 оронтой PIN код аваад ирцээ баталгаажуулна уу."
        );
      } else {
        Alert.alert(
          "Ирсэн баталгаажлаа",
          "Та уулзах цэг дээр ирсэн байна. Жолоочийг хүлээж байна."
        );
      }

      void loadMeetupPresence();
    } catch (err: any) {
      const message = String(err?.message || "").trim();
      Alert.alert("Ирц баталгаажсангүй", message || "Байршлаа шалгаад дахин оролдоно уу.");
    } finally {
      setMeetupLocationLoading(false);
    }
  }, [id, loadMeetupPresence, loadRide, openMeetupLocationSettings, ride?.id]);

  useEffect(() => {
    if (
      String(promptLocation || "").toLowerCase() !== "meetup" ||
      meetupLocationReady !== false ||
      meetupLocationAlertShownRef.current ||
      !shouldPromptForMeetupLocation(ride, user, bookingStatus)
    ) {
      return;
    }

    meetupLocationAlertShownRef.current = true;
    Alert.alert(
      "Location асаана уу",
      "10 минутын reminder ирсэн тул уулзах цэг дээр ирсэн бол location-оо шалгуулаад баталгаажуулна уу.",
      [
        { text: "Дараа" },
        {
          text: "Ирснээ батлах",
          onPress: () => {
            void handleMeetupCheckIn();
          },
        },
      ]
    );
  }, [
    bookingStatus,
    handleMeetupCheckIn,
    meetupLocationReady,
    promptLocation,
    ride,
    user,
  ]);

  const handleEnableNotifications = useCallback(async () => {
    setNotificationLoading(true);

    try {
      await ensureNotificationPermission();
      const enabled = await areNotificationsEnabled();
      setNotificationsEnabled(enabled);

      if (enabled) {
        await syncPushTokenWithBackend();
        Alert.alert(
          "Мэдэгдэл идэвхжлээ",
          "Жолоочийн шийдвэр, 10 минутын өмнөх сануулга, аялал эхэлсэн мэдэгдлийг одоо хүлээж авна."
        );
        return;
      }

      Alert.alert(
        "Мэдэгдлээ асаана уу",
        "Суудал захиалсан тул жолоочийн зөвшөөрөл, 10 минутын өмнөх сануулга, аялал эхэлсэн мэдэгдлийг алдахгүйн тулд Settings дотроос notifications-оо асаана уу.",
        [
          { text: "Дараа" },
          {
            text: "Settings",
            onPress: () => {
              void Linking.openSettings().catch(() => null);
            },
          },
        ]
      );
    } catch {
      Alert.alert(
        "Алдаа",
        "Notification permission шалгах үед алдаа гарлаа. Дараа нь дахин оролдоно уу."
      );
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  const bookRide = async () => {
    const guest = await isGuestMode();
    if (guest) {
      Alert.alert("Нэвтрэх шаардлагатай", "Суудал захиалахын тулд нэвтэрнэ үү");
      return;
    }

    try {
      setBookingLoading(true);
      const rideId = ride?.id ?? (id ? Number(id) : null);
      if (!rideId) {
        Alert.alert("Алдаа", "Ride мэдээлэл дутуу байна. Дахин оролдоно уу.");
        return;
      }

      const res = await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({ ride_id: rideId, seats: 1 }),
      });

      const success =
        res?.success === true ||
        res?.ok === true ||
        !!res?.booking ||
        !!res?.id ||
        !!res?.data?.id;

      if (!success) {
        const serverMessage =
          res?.error ||
          res?.message ||
          res?.detail ||
          "Суудал захиалж чадсангүй";
        Alert.alert("Алдаа", serverMessage);
        return;
      }

      void playActionSuccessSound();
      Alert.alert("Амжилттай", "Суудал захиалагдлаа");
      router.push({
        pathname: "/status",
        params: { status: String(res?.status || "pending") },
      });
    } catch (err: any) {
      const errorMessage = String(err?.message || "").trim();

      if (
        errorMessage === "Ride not available" ||
        errorMessage === "Ride is full" ||
        errorMessage === "Ride already started" ||
        errorMessage === "Ride already finished" ||
        errorMessage === "Not enough seats"
      ) {
        try {
          await loadRide(ride?.id ?? id);
        } catch (reloadErr) {
          console.log("Failed to refresh ride after booking error:", reloadErr);
        }

        let description = "Энэ чиглэл одоо захиалга авах боломжгүй болсон байна.";
        if (errorMessage === "Not enough seats" || errorMessage === "Ride is full") {
          description = "Энэ чиглэл дээр сул суудал дууссан байна.";
        } else if (errorMessage === "Ride already started") {
          description = "Энэ чиглэл аль хэдийн эхэлсэн байна.";
        } else if (errorMessage === "Ride already finished") {
          description = "Энэ чиглэл дууссан эсвэл цуцлагдсан байна.";
        }

        Alert.alert("Чиглэл шинэчлэгдсэн", description);
        return;
      }

      console.log("Booking failed:", err);
      Alert.alert("Алдаа", errorMessage || "Суудал захиалж чадсангүй");
    } finally {
      setBookingLoading(false);
    }
  };

  const updateStatus = async (action: "start" | "complete" | "cancel") => {
    if (!ride || !user) return;

    try {
      await apiFetch(`/rides/${ride.id}/${action}`, { method: "PATCH" });
      void playActionSuccessSound();
      router.back();
    } catch {
      Alert.alert("Алдаа", "Үйлдэл амжилтгүй");
    }
  };

  const confirmMeetupPin = async () => {
    const rideId = ride?.id ?? (id ? Number(id) : null);
    const pinLength = Number(meetupPresence?.meetup_pin_length || 4);
    const normalizedPin = meetupPin.replace(/\D/g, "");

    if (!rideId) {
      Alert.alert("Алдаа", "Ride мэдээлэл дутуу байна.");
      return;
    }

    if (normalizedPin.length !== pinLength) {
      Alert.alert("PIN дутуу байна", `${pinLength} оронтой PIN код оруулна уу.`);
      return;
    }

    try {
      setMeetupPinLoading(true);
      const response = await apiFetch(`/rides/${rideId}/presence/pin`, {
        method: "POST",
        body: JSON.stringify({ code: normalizedPin }),
      });

      setMeetupPresence(response);
      setMeetupPin("");
      void playActionSuccessSound();

      if (response?.ride_started) {
        await loadRide(rideId);
        Alert.alert("Нэг чиглэл эхэллээ", "Нэг чиглэл амжилттай эхэллээ. Good luck!");
        return;
      }

      Alert.alert("Баталгаажлаа", "Уулзалтын ирц PIN кодоор баталгаажлаа.");
    } catch (err: any) {
      Alert.alert("Алдаа", err?.message || "PIN баталгаажуулж чадсангүй.");
    } finally {
      setMeetupPinLoading(false);
    }
  };

  const cancelMyBooking = async () => {
    if (!bookingId) {
      Alert.alert("Алдаа", "Захиалгын мэдээлэл дутуу байна.");
      return;
    }

    try {
      setBookingLoading(true);
      const res = await apiFetch(`/bookings/${bookingId}/cancel`, { method: "PATCH" });
      const nextStatus = String(res?.status || "cancelled");

      void playActionSuccessSound();
      await loadRide(ride?.id ?? id);
      setBookingStatus(nextStatus);
      Alert.alert("Амжилттай", "Суудлын захиалгаа цуцаллаа.");
    } catch (err: any) {
      Alert.alert("Алдаа", err?.message || "Суудлын захиалга цуцлагдсангүй");
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerWrap}>
        <ActivityIndicator size="large" color={AppTheme.colors.accent} />
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.centerText}>Ride олдсонгүй</Text>
      </View>
    );
  }

  const status = String(ride?.status || "").toLowerCase();
  const isBookableStatus = ["active", "scheduled", "pending"].includes(status);

  const seatsLeft =
    typeof ride?.available_seats === "number"
      ? Math.max(Number(ride.available_seats), 0)
      : Math.max(
          Number(ride?.seats_total ?? ride?.seats ?? 0) -
            Number(ride?.seats_taken ?? 0),
          0
        );

  const isOwner = user?.id === ride.user_id;
  const isPassengerMode = role === "rider";
  const days = Array.isArray(ride?.days)
    ? ride.days
    : typeof ride?.days === "string" && ride.days.length > 0
      ? ride.days
          .replace(/[{}"]/g, "")
          .split(",")
          .map((d: string) => d.trim())
          .filter(Boolean)
      : [];

  const rideDateText = formatRideDate(ride?.ride_date, "Огноо байхгүй");
  const ownerName = getRideOwnerName(ride);
  const routeTitle = `${getLocationLabel(ride?.start_location, "Эхлэх цэг тодорхойгүй")} → ${getLocationLabel(
    ride?.end_location,
    "Очих газар тодорхойгүй"
  )}`;
  const seatImageIndex = Math.min(Math.max(seatsLeft, 1), 4);
  const normalizedBookingStatus = String(bookingStatus || "").toLowerCase();
  const hasActiveBooking = ["pending", "approved"].includes(normalizedBookingStatus);
  const shouldPromptForNotifications =
    !isOwner &&
    hasActiveBooking &&
    !["started", "completed", "cancelled", "canceled"].includes(status);
  const shouldPromptForMeetupLocationNow = shouldPromptForMeetupLocation(
    ride,
    user,
    bookingStatus
  );
  const showDriverActions = isOwner && !isPassengerMode;
  const showBookButton = !isOwner && !hasActiveBooking && seatsLeft > 0 && isBookableStatus;
  const canRateRide =
    Boolean(user) && !isOwner && status === "completed" && bookingStatus === "approved";
  const bookingLabel = normalizedBookingStatus
    ? getBookingStatusLabel(normalizedBookingStatus)
    : null;
  const bookingToneColor = normalizedBookingStatus
    ? getBookingStatusColor(normalizedBookingStatus)
    : AppTheme.colors.textMuted;
  const showBookingState = !isOwner && Boolean(normalizedBookingStatus);
  const canCancelBooking =
    !isOwner &&
    Boolean(bookingId) &&
    ["pending", "approved"].includes(normalizedBookingStatus) &&
    !["started", "completed", "cancelled", "canceled"].includes(status);
  const showUnavailableState =
    !isOwner && !showBookButton && !showBookingState && !canRateRide;
  const canViewMeetupStatus = Boolean(user) && (isOwner || normalizedBookingStatus === "approved");
  const meetupParticipants = Array.isArray(meetupPresence?.participants)
    ? meetupPresence.participants
    : [];
  const currentMeetupParticipant = meetupParticipants.find(
    (participant: any) => Number(participant?.user_id) === Number(user?.id)
  );
  const currentMeetupLocationVerified = Boolean(
    currentMeetupParticipant?.location_verified ||
      currentMeetupParticipant?.arrived_at ||
      (isOwner && meetupPresence?.summary?.driver_arrived)
  );
  const currentMeetupPinConfirmed = Boolean(
    currentMeetupParticipant?.pin_confirmed || currentMeetupParticipant?.arrived
  );
  const meetupSummaryText = meetupPresence
    ? getMeetupSummaryCopy(meetupPresence, ride?.status)
    : null;
  const rideStartDate = getRideStartDate(ride);
  const isMeetupWindowUpcoming =
    rideStartDate ? rideStartDate.getTime() > Date.now() && !meetupPresence : false;
  const meetupInfoCopy = meetupPresence
    ? `Эхлэх цэгээс ${meetupPresence?.required_start_radius_meters ?? 10}м дотор "Би уулзах цэгт ирсэн" товч дарж байршлаа баталгаажуулна. Дараа нь зорчигч жолоочийн PIN кодоор ирцээ батална.`
    : "Ирцийн шалгалт ride эхлэхээс 30 минутын өмнө идэвжинэ.";

  const meetupPinLength = Number(meetupPresence?.meetup_pin_length || 4);
  const driverMeetupCode = isOwner ? String(meetupPresence?.meetup_code || "") : "";
  const canMeetupCheckIn =
    canViewMeetupStatus &&
    shouldPromptForMeetupLocationNow &&
    !currentMeetupLocationVerified &&
    !["started", "completed", "cancelled", "canceled"].includes(status);
  const canConfirmMeetupPin =
    Boolean(meetupPresence) &&
    !isOwner &&
    normalizedBookingStatus === "approved" &&
    !["started", "completed", "cancelled", "canceled"].includes(status) &&
    currentMeetupLocationVerified &&
    Boolean(meetupPresence?.summary?.driver_arrived) &&
    !currentMeetupPinConfirmed &&
    meetupPresence?.pin_confirmation_enabled !== false;

  const goToRating = () => {
    if (!ride?.id || !ride?.user_id) {
      Alert.alert("Алдаа", "Ride мэдээлэл дутуу байна.");
      return;
    }

    router.push({
      pathname: "/rate/[id]",
      params: {
        id: String(ride.id),
        rideId: String(ride.id),
        toUserId: String(ride.user_id),
      },
    });
  };

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.mapCard}>
        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            mapType={mapType}
            style={styles.map}
            initialRegion={{
              latitude: ride.start_lat,
              longitude: ride.start_lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={{ latitude: ride.start_lat, longitude: ride.start_lng }} />
            <Marker coordinate={{ latitude: ride.end_lat, longitude: ride.end_lng }} />
            {ride.polyline && (
              <Polyline
                coordinates={decodePolyline(ride.polyline)}
                strokeWidth={4}
                strokeColor={AppTheme.colors.accent}
              />
            )}
          </MapView>

          <View style={styles.mapTypeWrap}>
            <MapTypeToggle value={mapType} onChange={setMapType} />
            <MapTypeHint />
          </View>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryTopRow}>
          <View style={styles.ownerRow}>
            <Image source={getAvatarSource(ride?.avatar_id)} style={styles.avatar} />
            <View style={styles.ownerTextWrap}>
              <Text style={styles.ownerLabel}>Жолооч</Text>
              <Text style={styles.ownerName}>{ownerName}</Text>
            </View>
          </View>

          <View style={[styles.statusBadge, getStatusTone(status)]}>
            <Text style={styles.statusBadgeText}>{ride.status}</Text>
          </View>
        </View>

        <Text style={styles.title}>{routeTitle}</Text>

        <View style={styles.infoGrid}>
          <InfoPill label="Огноо" value={rideDateText} />
          <InfoPill label="Цаг" value={ride.start_time || "-"} />
          <InfoPill label="Сул суудал" value={String(seatsLeft)} />
          <InfoPill label="1 суудлын үнэ" value={`${ride.price ?? 0}₮`} />
        </View>

        {days.length > 0 && (
          <View style={styles.metaCard}>
            <Text style={styles.metaTitle}>Давтамж</Text>
            <Text style={styles.metaText}>{days.join(", ")}</Text>
          </View>
        )}

        <View style={styles.routeCard}>
          <View style={styles.routeCopy}>
            <Text style={styles.routeTitle}>Маршрутын товч</Text>
            <Text style={styles.routeText}>
              Эхлэх цэгээс очих байршил хүртэлх чиглэлийг газрын зураг дээрээс
              хараад, доорх товчоор дараагийн үйлдлээ сонгоно уу.
            </Text>
          </View>

          <View style={styles.seatCard}>
            <Image
              source={seatImages[seatImageIndex] || seatImages[1]}
              style={styles.seatImage}
            />
          </View>
        </View>

        {__DEV__ && (
          <View style={styles.debugWrap}>
            <Text style={styles.debugText}>debug.roleParam: {String(role ?? "-")}</Text>
            <Text style={styles.debugText}>debug.isOwner: {String(isOwner)}</Text>
            <Text style={styles.debugText}>
              debug.showDriverActions: {String(showDriverActions)}
            </Text>
            <Text style={styles.debugText}>debug.status: {String(ride.status)}</Text>
            <Text style={styles.debugText}>
              debug.isBookableStatus: {String(isBookableStatus)}
            </Text>
            <Text style={styles.debugText}>debug.seatsLeft: {String(seatsLeft)}</Text>
            <Text style={styles.debugText}>
              debug.showBookButton: {String(showBookButton)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.actionBody}>
          {showDriverActions
            ? "Энэ аяллыг жолоочийн талаас эхлүүлэх, дуусгах, эсвэл цуцлах үйлдлүүд."
            : "Энэ хэсгээс суудал захиалах, захиалгынхаа төлөвийг харах, эсвэл үнэлгээ үлдээнэ."}
        </Text>

        {showBookingState ? (
          <View style={[styles.bookingStateCard, { borderColor: `${bookingToneColor}35` }]}>
            <Text style={styles.bookingStateLabel}>Миний захиалга</Text>
            <View style={[styles.bookingStateBadge, { backgroundColor: `${bookingToneColor}18` }]}>
              <Text style={[styles.bookingStateBadgeText, { color: bookingToneColor }]}>
                {bookingLabel}
              </Text>
            </View>
            <Text style={styles.bookingStateText}>{getBookingDescription(normalizedBookingStatus)}</Text>
          </View>
        ) : null}

        {shouldPromptForNotifications && notificationsEnabled === false ? (
          <View style={styles.notificationReminderCard}>
            <Text style={styles.notificationReminderTitle}>
              Мэдэгдлээ асаагаарай
            </Text>
            <Text style={styles.notificationReminderBody}>
              Та суудал захиалсан байна. Жолоочийн зөвшөөрөл, 10 минутын өмнөх
              сануулга, аялал эхэлсэн мэдэгдлийг алдахгүйн тулд notifications-оо
              асаана уу.
            </Text>

            <TouchableOpacity
              activeOpacity={0.92}
              style={[
                styles.notificationReminderButton,
                notificationLoading && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleEnableNotifications();
              }}
              disabled={notificationLoading}
            >
              {notificationLoading ? (
                <ActivityIndicator size="small" color={AppTheme.colors.white} />
              ) : (
                <Text style={styles.notificationReminderButtonText}>
                  Notifications асаах
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {canMeetupCheckIn ? (
          <View style={styles.meetupLocationCard}>
            <Text style={styles.meetupLocationTitle}>
              Уулзах цэг дээр ирсэн үү?
            </Text>
            <Text style={styles.meetupLocationBody}>
              Энэ товчийг уулзах цэг дээрээ ирсний дараа дарна. Бид таны одоогийн
              байршлыг эхлэх цэгээс 10м радиуст байгаа эсэхээр шалгана.
            </Text>

            <TouchableOpacity
              activeOpacity={0.92}
              style={[
                styles.meetupLocationButton,
                meetupLocationLoading && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleMeetupCheckIn();
              }}
              disabled={meetupLocationLoading}
            >
              {meetupLocationLoading ? (
                <ActivityIndicator size="small" color={AppTheme.colors.white} />
              ) : (
                <Text style={styles.meetupLocationButtonText}>
                  Би уулзах цэгт ирсэн
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {canViewMeetupStatus ? (
          <View style={styles.meetupCard}>
            <View style={styles.meetupHeaderRow}>
              <View style={styles.meetupHeaderCopy}>
                <Text style={styles.meetupTitle}>Уулзах цэгийн ирц</Text>
                <Text style={styles.meetupBody}>
                  {meetupSummaryText ||
                    (isMeetupWindowUpcoming
                      ? "Удахгүй уулзах цэгийн байршил шалгалт эхэлнэ."
                      : "Уулзах цэгийн төлөвийг шинэчилж байна.")}
                </Text>
              </View>

              <View
                style={[
                  styles.meetupStatusPill,
                  meetupPresence?.summary?.ready_to_start || String(ride?.status || "").toLowerCase() === "started"
                    ? styles.meetupStatusReady
                    : styles.meetupStatusPending,
                ]}
              >
                <Text
                  style={[
                    styles.meetupStatusPillText,
                    meetupPresence?.summary?.ready_to_start || String(ride?.status || "").toLowerCase() === "started"
                      ? styles.meetupStatusReadyText
                      : styles.meetupStatusPendingText,
                  ]}
                >
                  {String(ride?.status || "").toLowerCase() === "started"
                    ? "Эхэлсэн"
                    : meetupPresence?.summary?.ready_to_start
                      ? "Бэлэн"
                      : "Шалгагдаж байна"}
                </Text>
              </View>
            </View>

            <Text style={styles.meetupHint}>{meetupInfoCopy}</Text>

            {meetupPresence ? (
              <View style={styles.meetupStatsRow}>
                <View style={styles.meetupStatBox}>
                  <Text style={styles.meetupStatLabel}>Жолооч</Text>
                  <Text style={styles.meetupStatValue}>
                    {meetupPresence?.summary?.driver_arrived ? "Ирсэн" : "Хүлээгдэж байна"}
                  </Text>
                </View>
                <View style={styles.meetupStatBox}>
                  <Text style={styles.meetupStatLabel}>Зорчигч</Text>
                  <Text style={styles.meetupStatValue}>
                    {Number(
                      meetupPresence?.summary?.confirmed_passenger_count ??
                        meetupPresence?.summary?.arrived_passenger_count ??
                        0
                    )}/
                    {Number(meetupPresence?.summary?.approved_passenger_count || 0)}
                  </Text>
                </View>
              </View>
            ) : null}

            {driverMeetupCode ? (
              <View style={styles.meetupPinPanel}>
                <Text style={styles.meetupPinLabel}>Уулзалтын PIN</Text>
                <Text style={styles.meetupPinCode}>{driverMeetupCode}</Text>
                <Text style={styles.meetupPinHelp}>
                  Зорчигч эхлэх цэг дээр ирэхэд энэ кодыг хэлж ирцээ баталгаажуулна.
                </Text>
              </View>
            ) : null}

            {canConfirmMeetupPin ? (
              <View style={styles.meetupPinPanel}>
                <Text style={styles.meetupPinLabel}>Жолоочийн PIN</Text>
                <View style={styles.meetupPinEntryRow}>
                  <TextInput
                    value={meetupPin}
                    onChangeText={(text) => {
                      setMeetupPin(text.replace(/\D/g, "").slice(0, meetupPinLength));
                    }}
                    placeholder="0000"
                    placeholderTextColor={AppTheme.colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={meetupPinLength}
                    style={styles.meetupPinInput}
                  />
                  <TouchableOpacity
                    activeOpacity={0.9}
                    style={[
                      styles.meetupPinButton,
                      meetupPinLoading && styles.buttonDisabled,
                    ]}
                    onPress={() => {
                      void confirmMeetupPin();
                    }}
                    disabled={meetupPinLoading}
                  >
                    {meetupPinLoading ? (
                      <ActivityIndicator size="small" color={AppTheme.colors.white} />
                    ) : (
                      <Text style={styles.meetupPinButtonText}>Батлах</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.meetupPinHelp}>
                  Жолоочоос авсан 4 оронтой PIN кодоор уулзах цэг дээр ирснээ баталгаажуулна.
                </Text>
              </View>
            ) : null}

            {meetupLoading && !meetupPresence ? (
              <View style={styles.meetupLoadingRow}>
                <ActivityIndicator size="small" color={AppTheme.colors.accent} />
                <Text style={styles.meetupLoadingText}>Уулзах цэгийн мэдээлэл ачаалж байна...</Text>
              </View>
            ) : null}

            {!meetupLoading && meetupError ? (
              <View style={styles.meetupErrorWrap}>
                <Text style={styles.meetupErrorText}>{meetupError}</Text>
              </View>
            ) : null}

            {meetupParticipants.length > 0 ? (
              <View style={styles.meetupParticipantsWrap}>
                {meetupParticipants.map((participant: any) => {
                  const distanceLabel =
                    formatDistance(participant?.distance_to_start_meters) ||
                    formatDistance(participant?.distance_to_driver_meters);
                  const lastSeenLabel = formatLastSeen(participant?.last_seen_at);

                  return (
                    <View key={`${participant?.role || "participant"}-${participant?.user_id || Math.random()}`} style={styles.meetupParticipantRow}>
                      <View style={styles.meetupParticipantCopy}>
                        <Text style={styles.meetupParticipantName}>
                          {participant?.name || (participant?.role === "driver" ? "Жолооч" : "Зорчигч")}
                        </Text>
                        <Text style={styles.meetupParticipantMeta}>
                          {participant?.role === "driver" ? "Жолооч" : "Зорчигч"}
                          {distanceLabel ? ` • ${distanceLabel}` : ""}
                          {lastSeenLabel ? ` • ${lastSeenLabel}` : ""}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.meetupParticipantBadge,
                          participant?.arrived ? styles.meetupParticipantBadgeReady : styles.meetupParticipantBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.meetupParticipantBadgeText,
                            participant?.arrived
                              ? styles.meetupParticipantBadgeReadyText
                              : styles.meetupParticipantBadgePendingText,
                          ]}
                        >
                          {getMeetupParticipantStatusLabel(participant)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}
          </View>
        ) : null}

        {showUnavailableState ? (
          <View style={styles.infoNotice}>
            <Text style={styles.infoNoticeTitle}>Одоогоор захиалах боломжгүй</Text>
            <Text style={styles.infoNoticeText}>
              Суудал дууссан эсвэл аяллын төлөв захиалга авах боломжгүй болсон байна.
            </Text>
          </View>
        ) : null}
        <Text style={styles.actionTitle}>Үйлдлүүд</Text>

        {showBookButton && (
          <TouchableOpacity
            onPress={bookRide}
            style={[styles.primaryBtn, bookingLoading && styles.buttonDisabled]}
            disabled={bookingLoading}
          >
            <Text style={styles.btnText}>
              {bookingLoading ? "Захиалж байна..." : "Суудал захиалах"}
            </Text>
          </TouchableOpacity>
        )}

        {canCancelBooking && (
          <TouchableOpacity
            onPress={() =>
              Alert.alert(
                "Суудал цуцлах уу?",
                "Энэ чиглэл дээрх суудлын захиалгаа цуцлахдаа итгэлтэй байна уу?",
                [
                  { text: "Болих", style: "cancel" },
                  {
                    text: "Цуцлах",
                    style: "destructive",
                    onPress: () => {
                      void cancelMyBooking();
                    },
                  },
                ]
              )
            }
            style={[styles.ghostDangerBtn, bookingLoading && styles.buttonDisabled]}
            disabled={bookingLoading}
          >
            <Text style={styles.ghostDangerBtnText}>
              {bookingLoading ? "Цуцалж байна..." : "Суудлын захиалга цуцлах"}
            </Text>
          </TouchableOpacity>
        )}

        {canRateRide && (
          <TouchableOpacity onPress={goToRating} style={styles.secondaryBtn}>
            <Text style={styles.btnText}>Жолоочийг үнэлэх</Text>
          </TouchableOpacity>
        )}

        {showDriverActions && ride.status === "active" && (
          <TouchableOpacity
            onPress={() => updateStatus("start")}
            style={styles.secondaryBtn}
          >
            <Text style={styles.btnText}>Ride эхлүүлэх</Text>
          </TouchableOpacity>
        )}

        {showDriverActions && ride.status === "started" && (
          <TouchableOpacity
            onPress={() => updateStatus("complete")}
            style={styles.primaryBtn}
          >
            <Text style={styles.btnText}>Ride дуусгах</Text>
          </TouchableOpacity>
        )}

        {showDriverActions &&
          ride.status !== "completed" &&
          ride.status !== "cancelled" && (
            <TouchableOpacity
              onPress={() => updateStatus("cancel")}
              style={styles.dangerBtn}
            >
              <Text style={styles.btnText}>Ride цуцлах</Text>
            </TouchableOpacity>
          )}
      </View>
    </ScrollView>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
  },
  content: {
    padding: 16,
    paddingBottom: 132,
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: AppTheme.colors.canvas,
  },
  centerText: {
    marginTop: 12,
    textAlign: "center",
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  mapCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 28,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  mapWrap: {
    position: "relative",
  },
  map: {
    height: 280,
    borderRadius: 22,
  },
  mapTypeWrap: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 10,
  },
  summaryCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  summaryTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 24,
    marginRight: 12,
  },
  ownerTextWrap: {
    flex: 1,
  },
  ownerLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginBottom: 2,
  },
  ownerName: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  statusBadge: {
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusNeutral: {
    backgroundColor: AppTheme.colors.cardSoft,
  },
  statusSuccess: {
    backgroundColor: "#deefe3",
  },
  statusWarning: {
    backgroundColor: "#f5e7d2",
  },
  statusDanger: {
    backgroundColor: "#f6ded9",
  },
  statusBadgeText: {
    color: AppTheme.colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: AppTheme.colors.text,
    marginBottom: 14,
    fontFamily: AppFontFamily,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  infoPill: {
    minWidth: "47%",
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  infoPillLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  infoPillValue: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  metaCard: {
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 14,
  },
  metaTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: AppTheme.colors.text,
    marginBottom: 4,
  },
  metaText: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  routeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 14,
    gap: 12,
  },
  routeCopy: {
    flex: 1,
  },
  routeTitle: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  routeText: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  seatCard: {
    width: 92,
    height: 104,
    borderRadius: 18,
    backgroundColor: AppTheme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  seatImage: {
    width: 74,
    height: 88,
    resizeMode: "contain",
  },
  debugWrap: {
    marginTop: 12,
    borderRadius: 14,
    padding: 10,
    backgroundColor: "#111827",
  },
  debugText: {
    color: "#e5e7eb",
    fontSize: 11,
  },
  actionCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  actionTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: AppFontFamily,
    marginTop: 2,
    marginBottom: 12,
  },
  actionBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 14,
  },
  bookingStateCard: {
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  bookingStateLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  bookingStateBadge: {
    alignSelf: "flex-start",
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  bookingStateBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  bookingStateText: {
    color: AppTheme.colors.text,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  notificationReminderCard: {
    backgroundColor: "#fff8ec",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ead4aa",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  notificationReminderTitle: {
    color: AppTheme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  notificationReminderBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  notificationReminderButton: {
    minHeight: 48,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.warning,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  notificationReminderButtonText: {
    color: AppTheme.colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  meetupLocationCard: {
    backgroundColor: "#fff2ea",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#ebc7b0",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  meetupLocationTitle: {
    color: AppTheme.colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  meetupLocationBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
  },
  meetupLocationButton: {
    minHeight: 48,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accentDeep,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  meetupLocationButtonText: {
    color: AppTheme.colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  meetupCard: {
    backgroundColor: AppTheme.colors.accentGlow,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#cfe0d6",
  },
  meetupHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  meetupHeaderCopy: {
    flex: 1,
  },
  meetupTitle: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  meetupBody: {
    color: AppTheme.colors.text,
    fontSize: 13,
    lineHeight: 20,
  },
  meetupHint: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  meetupStatusPill: {
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  meetupStatusReady: {
    backgroundColor: "#d7e7dd",
  },
  meetupStatusPending: {
    backgroundColor: "#f4e8cf",
  },
  meetupStatusPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  meetupStatusReadyText: {
    color: AppTheme.colors.accentDeep,
  },
  meetupStatusPendingText: {
    color: AppTheme.colors.warning,
  },
  meetupStatsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  meetupStatBox: {
    flex: 1,
    backgroundColor: AppTheme.colors.white,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d8e4dd",
  },
  meetupStatLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  meetupStatValue: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  meetupPinPanel: {
    marginTop: 12,
    backgroundColor: AppTheme.colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#d8e4dd",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  meetupPinLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  meetupPinCode: {
    color: AppTheme.colors.text,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800",
    marginTop: 4,
  },
  meetupPinHelp: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  meetupPinEntryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  meetupPinInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cfe0d6",
    backgroundColor: "#f8fbf9",
    color: AppTheme.colors.text,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  meetupPinButton: {
    minWidth: 92,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: AppTheme.colors.accentDeep,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  meetupPinButtonText: {
    color: AppTheme.colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  meetupLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  meetupLoadingText: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
  },
  meetupErrorWrap: {
    marginTop: 12,
    backgroundColor: "#fff3e9",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#edd4b4",
  },
  meetupErrorText: {
    color: AppTheme.colors.warning,
    fontSize: 12,
    lineHeight: 18,
  },
  meetupParticipantsWrap: {
    marginTop: 12,
    gap: 10,
  },
  meetupParticipantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: AppTheme.colors.white,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#d8e4dd",
  },
  meetupParticipantCopy: {
    flex: 1,
  },
  meetupParticipantName: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 3,
  },
  meetupParticipantMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  meetupParticipantBadge: {
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  meetupParticipantBadgeReady: {
    backgroundColor: "#d7e7dd",
  },
  meetupParticipantBadgePending: {
    backgroundColor: "#f3ead7",
  },
  meetupParticipantBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  meetupParticipantBadgeReadyText: {
    color: AppTheme.colors.accentDeep,
  },
  meetupParticipantBadgePendingText: {
    color: AppTheme.colors.warning,
  },
  infoNotice: {
    backgroundColor: "#f5ecdd",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },
  infoNoticeTitle: {
    color: AppTheme.colors.warning,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  infoNoticeText: {
    color: AppTheme.colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  primaryBtn: {
    backgroundColor: AppTheme.colors.accent,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryBtn: {
    backgroundColor: "#2e5fa7",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  dangerBtn: {
    backgroundColor: AppTheme.colors.danger,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 12,
  },
  btnText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  ghostDangerBtn: {
    backgroundColor: "#f8e8e5",
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e7bdb6",
  },
  ghostDangerBtnText: {
    color: AppTheme.colors.danger,
    fontWeight: "700",
    fontSize: 15,
  },
});
