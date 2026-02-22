import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { getToken } from "../../../services/authStorage";
const API_URL = "http://192.168.1.78:3000"; // Android emulator
// const API_URL = "http://localhost:3000"; // iOS

const seatImages: Record<number, any> = {
  1: require("../../../assets/cars/1seat.png"),
  2: require("../../../assets/cars/2seat.png"),
  3: require("../../../assets/cars/3seat.png"),
  4: require("../../../assets/cars/4seat.png"),
};



export default function Home() {
  const { role, source, lat, lng, location, refresh } =
    useLocalSearchParams();

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadRides = async () => {
      try {
        setLoading(true);

        const res = await fetch(`${API_URL}/rides`);
        const data = await res.json();

        setRides(data || []);
      } catch (err) {
        console.log("❌ Failed to load rides:", err);
      } finally {
        setLoading(false);
      }
    };

    loadRides();
  }, [refresh]);

const getAvailableSeats = (ride: any) => {
  return Math.min(Math.max(ride.seats, 1), 4);
  };

  return (
    <View style={{ flex: 1, padding: 16, backgroundColor: "#ffffff" }}>
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

    return (
<TouchableOpacity
  onPress={() => router.push(`/ride/${item.id}`)}
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
  source={require("@/assets/profile/avatars/sister.png")}
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
      <Text style={{ fontSize: 12, color: "#64748b" }}>
          Огноо: 📅 {item.ride_date}
      </Text>

      <Text style={{ fontWeight: "600", fontSize: 14 }}>
        ⏰ {item.start_time}
      </Text>
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
    source={seatImages[availableSeats]}
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


      <TouchableOpacity
       onPress={async () => {
  const token = await getToken();

  if (!token) {
    Alert.alert(
      "Нэвтрэх шаардлагатай",
      "Чиглэл нэмэхийн тулд бүртгүүлнэ үү"
    );
    return;
  }

  router.push({
    pathname: "/ride/create/map",
    params: { lat, lng },
  });
}}

        
        style={{
          position: "absolute",
          right: 20,
          bottom: 30,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#111827",
          justifyContent: "center",
          alignItems: "center",
          elevation: 6,
          zIndex: 100,
        }}
      >
        <Text style={{ color: "#fff", fontSize: 32, lineHeight: 32 }}>
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
}
