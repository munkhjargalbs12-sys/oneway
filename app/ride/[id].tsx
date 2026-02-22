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
import { isGuestMode } from "../../services/authStorage";

export default function RideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [ride, setRide] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<MapView | null>(null);

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
        console.log("❌ Failed to load ride:", err);
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
      await apiFetch("/bookings", {
        method: "POST",
        body: JSON.stringify({ ride_id: ride.id, seats_booked: 1 }),
      });

      Alert.alert("Амжилттай", "Суудал захиалагдлаа");
      router.push("/status");
    } catch {
      Alert.alert("Алдаа", "Суудал захиалж чадсангүй");
    }
  };

  // ⭐ Ride статус солих
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

  const seatsLeft = ride.seats_total - ride.seats_taken;
  const isDriver = user?.id === ride.user_id;

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

        <Text style={styles.title}>Эхлэх цэг → {ride.end_location}</Text>
        <Text style={styles.subText}>
          ⏰ {ride.start_time} 💺 {seatsLeft} 💰 {ride.price}₮
        </Text>
      </View>

      <View style={styles.actionWrap}>
        {!isDriver && seatsLeft > 0 && ride.status === "active" && (
          <TouchableOpacity onPress={bookRide} style={styles.greenBtn}>
            <Text style={styles.btnText}>Суудал захиалах</Text>
          </TouchableOpacity>
        )}

        {isDriver && ride.status === "active" && (
          <TouchableOpacity
            onPress={() => updateStatus("start")}
            style={styles.blueBtn}
          >
            <Text style={styles.btnText}>Ride эхлүүлэх</Text>
          </TouchableOpacity>
        )}

        {isDriver && ride.status === "started" && (
          <TouchableOpacity
            onPress={() => updateStatus("complete")}
            style={styles.greenBtn}
          >
            <Text style={styles.btnText}>Ride дуусгах</Text>
          </TouchableOpacity>
        )}

        {isDriver &&
          ride.status !== "completed" &&
          ride.status !== "cancelled" && (
            <TouchableOpacity
              onPress={() => updateStatus("cancel")}
              style={styles.redBtn}
            >
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
