import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";


type Point = { latitude: number; longitude: number };

// 🔥 BACKEND API
const API_URL = "http://192.168.1.78:3000";




export default function CreateWayRoute() {
  const { lat, lng } = useLocalSearchParams();
  const mapRef = useRef<MapView | null>(null);

  const start: Point = {
    latitude: Number(lat),
    longitude: Number(lng),
  };

  const [end, setEnd] = useState<Point | null>(null);
  const [routeCoords, setRouteCoords] = useState<Point[]>([]);
  const [mapType, setMapType] = useState<"standard" | "hybrid">("hybrid");
  const [loading, setLoading] = useState(false);

  // 🔓 Google polyline decode
  function decodePolyline(encoded: string) {
    let points: Point[] = [];
    let index = 0,
      lat = 0,
      lng = 0;

    while (index < encoded.length) {
      let b,
        shift = 0,
        result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }

    return points;
  }

  // 🚗 Backend-ээс маршрут авах
async function fetchRoute(dest: Point) {
  try {
    setLoading(true);

    const res = await fetch(`${API_URL}/route`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true", // ⭐ ЭНЭ МӨР
      },
      body: JSON.stringify({
        start: { lat: start.latitude, lng: start.longitude },
        end: { lat: dest.latitude, lng: dest.longitude },
      }),
    });

    const data = await res.json();

    if (!data.polyline) {
      Alert.alert("Алдаа", "Маршрут олдсонгүй");
      return;
    }

    const coords = decodePolyline(data.polyline);
    setRouteCoords(coords);

    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 40, bottom: 260, left: 40 },
      animated: true,
    });
  } catch (err) {
    Alert.alert("Алдаа", "Backend холбогдсонгүй");
  } finally {
    setLoading(false);
  }
}


  return (
    <View style={{ flex: 1 }}>
      {/* 🗺 Map */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        initialRegion={{
          latitude: start.latitude,
          longitude: start.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onLongPress={(e) => {
          const dest = e.nativeEvent.coordinate;
          setEnd(dest);
          fetchRoute(dest);
        }}
      >
        <Marker coordinate={start} pinColor="green" />
        {end && <Marker coordinate={end} pinColor="red" />}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeWidth={4}
            strokeColor="#2563eb"
          />
        )}
      </MapView>

      {/* 🔁 Map type toggle */}
      <View
        style={{
          position: "absolute",
          top: 50,
          right: 20,
          flexDirection: "row",
          backgroundColor: "rgba(255,255,255,0.9)",
          borderRadius: 12,
          padding: 4,
        }}
      >
        {["standard", "hybrid"].map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setMapType(t as any)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: mapType === t ? "#2563eb" : "transparent",
              borderRadius: 8,
            }}
          >
            <Text
              style={{
                color: mapType === t ? "#fff" : "#64748b",
              }}
            >
              {t}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ⬇️ Bottom panel */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          padding: 16,
          backgroundColor: "#fff",
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
        {!end ? (
          <Text style={{ textAlign: "center", color: "#64748b" }}>
            📍 Очих байршлаа газрын зураг дээр{" "}
            <Text style={{ fontWeight: "700" }}>удаан дарж</Text> сонгоно уу
          </Text>
        ) : (
          <TouchableOpacity
            disabled={loading}
            style={{
              backgroundColor: "#111827",
              padding: 14,
              borderRadius: 12,
              opacity: loading ? 0.6 : 1,
            }}
            onPress={async () => {
              if (!mapRef.current || !end) return;

              const mapImage = await mapRef.current.takeSnapshot({
                width: 400,
                height: 600,
                format: "png",
                quality: 0.8,
                result: "file",
              });

              router.push({
                pathname: "/ride/create/form",
                params: {
                  startLat: start.latitude.toString(),
                  startLng: start.longitude.toString(),
                  endLat: end.latitude.toString(),
                  endLng: end.longitude.toString(),
                  mapImage,
                },
              });
            }}
          >
            <Text style={{ color: "#fff", textAlign: "center" }}>
                Чиглэл батлах
          </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
