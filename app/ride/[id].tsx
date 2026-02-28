import polyline from "@mapbox/polyline";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { apiFetch } from "../../services/apiClient";
import { getUser, isGuestMode } from "../../services/authStorage";

export default function RideDetail() {
  const { id, role } = useLocalSearchParams<{ id: string; role?: string }>();

  const [ride, setRide] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);

  const mapRef = useRef<MapView | null>(null);

  const firstNonEmpty = (...values: any[]) => {
    for (const v of values) {
      const s = String(v ?? "").trim();
      if (s) return s;
    }
    return "";
  };

  const isGenericName = (value: any) => {
    const s = String(value ?? "").trim().toLowerCase();
    return !s || s === "хэрэглэгч" || s === "хэрэлэгч" || s === "user";
  };

  const pickRequesterName = (...sources: any[]) => {
    for (const src of sources) {
      if (!src || typeof src !== "object") continue;

      const name = firstNonEmpty(
        src.name,
        src.full_name,
        src.fullName,
        src.username,
        src.user_name,
        src.display_name,
        src.displayName,
        src.nickname,
        src.nick_name,
        src.login,
        src.phone
      );
      if (name && !isGenericName(name)) return name;

      if (src.user && typeof src.user === "object") {
        const nested = firstNonEmpty(
          src.user.name,
          src.user.full_name,
          src.user.fullName,
          src.user.username,
          src.user.user_name,
          src.user.nickname,
          src.user.phone
        );
        if (nested && !isGenericName(nested)) return nested;
      }
    }
    return "";
  };

  const decodePolyline = (encoded: string) =>
    polyline.decode(encoded).map(([lat, lng]) => ({
      latitude: lat,
      longitude: lng,
    }));

  useEffect(() => {
    if (!id) return;

    const loadRide = async () => {
      try {
        const rideData = await apiFetch(`/rides/${id}`);
        setRide(rideData);

        const me = await apiFetch("/users/me");
        setUser(me);
      } catch (err) {
        console.log("Failed to load ride:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRide();
  }, [id]);

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

      // Backend responses vary by endpoint/version:
      // - { success: true, ... }
      // - { booking: {...} } or created object with id
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

      Alert.alert("Амжилттай", "Суудал захиалагдлаа");
      // Best-effort notification for the driver when a passenger books a seat.
      if (ride?.user_id) {
        try {
          const cachedUser = await getUser().catch(() => null);
          const me =
            user ||
            (await apiFetch("/users/me").catch(() => null));
          const requesterName = pickRequesterName(me, user, cachedUser) || `ID-${Number(me?.id || user?.id || cachedUser?.id || 0)}`;

          await apiFetch("/notifications", {
            method: "POST",
            body: JSON.stringify({
              to_user_id: Number(ride.user_id),
              ride_id: Number(rideId),
              from_user_id: Number(me?.id || user?.id || cachedUser?.id),
              from_user_name: requesterName,
              requester_name: requesterName,
              user_name: requesterName,
              avatar_id: me?.avatar_id || user?.avatar_id || cachedUser?.avatar_id || null,
              from_avatar_id: me?.avatar_id || user?.avatar_id || cachedUser?.avatar_id || null,
              title: "Суудлын зөвшөөрөл",
              body: `${requesterName} хэрэглэгч таны үүсгэсэн энэ чиглэлд суудал захиаллаа.`,
            }),
          });
        } catch (notifyErr) {
          console.log("Notification create failed:", notifyErr);
        }
      }

      router.push("/status");
    } catch (err: any) {
      console.log("Booking failed:", err);
      Alert.alert("Алдаа", err?.message || "Суудал захиалж чадсангүй");
    } finally {
      setBookingLoading(false);
    }
  };

  const updateStatus = async (action: "start" | "complete" | "cancel") => {
    if (!ride || !user) return;

    try {
      await apiFetch(`/rides/${ride.id}/${action}`, { method: "PATCH" });

      const isDriver = user.id === ride.user_id;

      if (action === "complete" && !isDriver) {
        router.push({
          pathname: "/rate/[id]",
          params: {
            id: ride.id.toString(),
            rideId: ride.id.toString(),
            toUserId: ride.user_id.toString(),
          },
        });
      } else {
        router.back();
      }
    } catch {
      Alert.alert("Алдаа", "Үйлдэл амжилтгүй");
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;
  if (!ride) return <Text style={styles.centerText}>Ride олдсонгүй</Text>;

  const status = String(ride?.status || "").toLowerCase();
  const isBookableStatus = ["active", "scheduled", "pending"].includes(status);

  const seatsLeft =
    typeof ride?.available_seats === "number"
      ? Math.max(Number(ride.available_seats), 0)
      : Math.max(
          Number(ride?.seats_total ?? ride?.seats ?? 0) - Number(ride?.seats_taken ?? 0),
          0
        );
  const isOwner = user?.id === ride.user_id;
  const isPassengerMode = role === "rider";
  const showDriverActions = isOwner && !isPassengerMode;
  const showBookButton = !isOwner && seatsLeft > 0 && isBookableStatus;

  const days = Array.isArray(ride?.days)
    ? ride.days
    : typeof ride?.days === "string" && ride.days.length > 0
      ? ride.days
          .replace(/[{}"]/g, "")
          .split(",")
          .map((d: string) => d.trim())
          .filter(Boolean)
      : [];

  const rideDateText = ride?.ride_date ? String(ride.ride_date).slice(0, 10) : "Огноо байхгүй";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MapView
          ref={mapRef}
          mapType="hybrid"
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
              strokeColor="#2563eb"
            />
          )}
        </MapView>

        <Text style={styles.title}>Очих газар -{ride.end_location || "Тодорхойгүй"}</Text>
        <Text style={styles.subText}>Цаг: {ride.start_time}   Суудал: {seatsLeft}   Үнэ: {ride.price}₮</Text>

        <View style={styles.metaWrap}>
          <Text style={styles.metaText}>Огноо: {rideDateText}</Text>
          <Text style={styles.metaText}>Төлөв: {ride.status}</Text>
          {days.length > 0 && <Text style={styles.metaText}>Давтамж: {days.join(", ")}</Text>}
        </View>

        {__DEV__ && (
          <View style={styles.debugWrap}>
            <Text style={styles.debugText}>debug.roleParam: {String(role ?? "-")}</Text>
            <Text style={styles.debugText}>debug.isOwner: {String(isOwner)}</Text>
            <Text style={styles.debugText}>debug.showDriverActions: {String(showDriverActions)}</Text>
            <Text style={styles.debugText}>debug.status: {String(ride.status)}</Text>
            <Text style={styles.debugText}>debug.isBookableStatus: {String(isBookableStatus)}</Text>
            <Text style={styles.debugText}>debug.seatsLeft: {String(seatsLeft)}</Text>
            <Text style={styles.debugText}>debug.showBookButton: {String(showBookButton)}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionWrap}>
        {showBookButton && (
          <TouchableOpacity onPress={bookRide} style={styles.greenBtn} disabled={bookingLoading}>
            <Text style={styles.btnText}>{bookingLoading ? "Захиалж байна..." : "Суудал захиалах"}</Text>
          </TouchableOpacity>
        )}

        {showDriverActions && ride.status === "active" && (
          <TouchableOpacity onPress={() => updateStatus("start")} style={styles.blueBtn}>
            <Text style={styles.btnText}>Ride эхлүүлэх</Text>
          </TouchableOpacity>
        )}

        {showDriverActions && ride.status === "started" && (
          <TouchableOpacity onPress={() => updateStatus("complete")} style={styles.greenBtn}>
            <Text style={styles.btnText}>Ride дуусгах</Text>
          </TouchableOpacity>
        )}

        {showDriverActions && ride.status !== "completed" && ride.status !== "cancelled" && (
          <TouchableOpacity onPress={() => updateStatus("cancel")} style={styles.redBtn}>
            <Text style={styles.btnText}>Ride цуцлах</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F6F8F7" },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  map: {
    height: 260,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
  },
  title: { fontSize: 22, fontWeight: "700", marginTop: 12 },
  subText: { marginTop: 8 },
  metaWrap: {
    marginTop: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  metaText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "500",
  },
  debugWrap: {
    marginTop: 8,
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#111827",
  },
  debugText: {
    color: "#e5e7eb",
    fontSize: 11,
  },
  actionWrap: { padding: 20, marginTop: "auto" },
  greenBtn: {
    backgroundColor: "#22c55e",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 12,
  },
  blueBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 12,
  },
  redBtn: {
    backgroundColor: "#dc2626",
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
    marginBottom: 12,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  centerText: { marginTop: 40, textAlign: "center" },
});
