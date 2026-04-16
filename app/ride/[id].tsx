import MapTypeHint from "@/components/MapTypeHint";
import MapTypeToggle, { type MapTypeOption } from "@/components/MapTypeToggle";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import {
  extractBookingIdByRide,
  getBookingStatusColor,
  getBookingStatusLabel,
} from "@/services/bookingStatus";
import polyline from "@mapbox/polyline";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
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

export default function RideDetail() {
  const { id, role } = useLocalSearchParams<{ id: string; role?: string }>();

  const [ride, setRide] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [mapType, setMapType] = useState<MapTypeOption>("standard");

  const mapRef = useRef<MapView | null>(null);

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

  const rideDateText = ride?.ride_date
    ? String(ride.ride_date).slice(0, 10)
    : "Огноо байхгүй";
  const ownerName = getRideOwnerName(ride);
  const routeTitle = `${getLocationLabel(ride?.start_location, "Эхлэх цэг тодорхойгүй")} → ${getLocationLabel(
    ride?.end_location,
    "Очих газар тодорхойгүй"
  )}`;
  const seatImageIndex = Math.min(Math.max(seatsLeft, 1), 4);
  const normalizedBookingStatus = String(bookingStatus || "").toLowerCase();
  const hasActiveBooking = ["pending", "approved"].includes(normalizedBookingStatus);
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
