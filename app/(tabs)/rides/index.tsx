import { apiFetch } from "@/services/apiClient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Image, StatusBar, Text, TouchableOpacity, View } from "react-native";

const seatImages: Record<number, any> = {
  1: require("../../../assets/cars/1seat.png"),
  2: require("../../../assets/cars/2seat.png"),
  3: require("../../../assets/cars/3seat.png"),
  4: require("../../../assets/cars/4seat.png"),
};

const avatars: Record<string, any> = {
  grandfa: require("../../../assets/profile/avatars/grandfa.png"),
  father: require("../../../assets/profile/avatars/father.png"),
  guy: require("../../../assets/profile/avatars/guy.png"),
  child: require("../../../assets/profile/avatars/child.png"),
  grandma: require("../../../assets/profile/avatars/grandma.png"),
  mother: require("../../../assets/profile/avatars/mother.png"),
  women: require("../../../assets/profile/avatars/women.png"),
  sister: require("../../../assets/profile/avatars/sister.png"),
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
    null
  );
}

function extractBookedRideIds(payload: any): number[] {
  const raw =
    (Array.isArray(payload?.ride_ids) && payload.ride_ids) ||
    (Array.isArray(payload?.bookings) && payload.bookings) ||
    (Array.isArray(payload?.items) && payload.items) ||
    (Array.isArray(payload) && payload) ||
    [];

  const ids = raw
    .map((entry: any) => Number(entry?.ride_id ?? entry?.ride?.id ?? entry?.id ?? entry))
    .filter((id: number) => Number.isFinite(id));

  return Array.from(new Set(ids));
}

export default function Home() {
  const { role, source, lat, lng, location, refresh } =
    useLocalSearchParams();

  

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookedRideIds, setBookedRideIds] = useState<number[]>([]);

  useEffect(() => {
    // keep effect simple: delegate to fetchRides below
    fetchRides();
  }, [refresh]);

  // fetch function reused by focus effect and pull-to-refresh
  const fetchRides = useCallback(async () => {
    try {
      setLoading(true);

      const [data, myBookings] = await Promise.all([
        apiFetch("/rides").catch(() => []),
        apiFetch("/bookings/mine").catch(() => ({ ride_ids: [] })),
      ]);

      const sorted = (data || []).sort(
        (a: any, b: any) => Number(b?.id || 0) - Number(a?.id || 0)
      );
      setRides(sorted);
      setBookedRideIds(
        extractBookedRideIds(myBookings)
      );
    } catch (err) {
      console.log("❌ Failed to load rides:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // reload when screen gains focus (so newly created rides appear)
  useFocusEffect(
    useCallback(() => {
      fetchRides();
    }, [fetchRides])
  );

const getAvailableSeats = (ride: any) => {
  // Prefer backend-provided `available_seats`, then `seats`, then compute from seats_total - seats_taken
  if (typeof ride?.available_seats === "number") {
    return Math.min(Math.max(ride.available_seats, 1), 4);
  }

  if (typeof ride?.seats === "number") {
    return Math.min(Math.max(ride.seats, 1), 4);
  }

  const seatsTotal = Number(ride?.seats_total) || 0;
  const seatsTaken = Number(ride?.seats_taken) || 0;
  const avail = Math.max(1, seatsTotal - seatsTaken || 1);
  return Math.min(avail, 4);
};

  const containerStyle = { flex: 1 };

  const fabBottom = 20;

  return (
    <View style={containerStyle}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 12 }}>
        Өглөөний чиглэлүүд
      </Text>

      <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 8 }}>
        {source === "gps" && "📍 Миний байршил (GPS)"}
        {source === "manual" && `📍 Явах байршил: ${location}`}
        {source === "map" && "📍 Газрын зургаас сонгосон байршил"}
      </Text>

      {role === "driver" && (
        <TouchableOpacity
          onPress={() => router.push("../")}
          style={{
            backgroundColor: "#22c55e",
            padding: 14,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontSize: 16 }}>
            ➕ Суудал нэмэх
          </Text>
        </TouchableOpacity>
      )}
<FlatList
  data={rides}
  keyExtractor={(item) => String(item.id)}
  contentContainerStyle={{ paddingBottom: 120 }}
  refreshing={loading}
  renderItem={({ item }) => {
    const availableSeats = getAvailableSeats(item);
    const isBooked = bookedRideIds.includes(Number(item.id));
    const ownerName = getRideOwnerName(item);

    return (
<TouchableOpacity
  onPress={() =>
    router.push({
      pathname: "/ride/[id]",
      params: {
        id: String(item.id),
        ...(role ? { role: String(role) } : {}),
      },
    })
  }
  style={{
    flexDirection: "row",
    alignItems: "center",

    padding: 12,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    marginBottom: 12,

    borderWidth: 1,
    borderColor: "#f0f0f0",
  }}
>
  {/* ① Profile зураг */}
 <Image
  source={getAvatarSource(item.avatar_id)}
  style={{
    width: 60,
    height: 60,
    borderRadius: 28,
    marginRight: 12,
  }}
/>


  {/* ② Текст мэдээлэл огноо */}
    <View style={{ flex: 1 }}>
    <View style={{ marginBottom: 4 }}>
      {ownerName ? (
        <Text style={{ fontSize: 13, fontWeight: "700", color: "#0f172a" }}>
          {ownerName}
        </Text>
      ) : null}
      <Text style={{ fontSize: 12, color: "#64748b" }}>
          Огноо: 📅 {item.ride_date}
      </Text>

      <Text style={{ fontWeight: "600", fontSize: 14 }}>
        ⏰ {item.start_time}
      </Text>
      {isBooked && (
        <Text style={{ marginTop: 4, fontSize: 12, fontWeight: "700", color: "#16a34a" }}>
          ✓ Суудал захиалсан
        </Text>
      )}
    </View>
      <Text
          style={{ fontSize: 12, color: "#475569", marginTop: 4 }}
          numberOfLines={2}
>
        📍 Очих газар:{item.end_location}
    </Text>


    <Text style={{ fontSize: 12, marginTop: 2 }}>
      Суудал: {item.price}₮
    </Text>
  </View>

  {/* ③ Машины зураг */}
  <Image
    source={seatImages[availableSeats] || seatImages[1]}
    style={{
      width: 80,
      height: 90,
      resizeMode: "contain",
      marginLeft: 8,
    }}
  />
</TouchableOpacity>

    );
  }}
/>


      {/* Floating add button removed from this screen — creation happens on Home */}
    </View>
  );
}


