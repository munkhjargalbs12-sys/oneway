import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";

type Point = {
  latitude: number;
  longitude: number;
};

export default function MapPickScreen() {
  const params = useLocalSearchParams<{
    source?: string;
    lat?: string;
    lng?: string;
    role?: string;
  }>();

  const [point, setPoint] = useState<Point | null>(null);
  const [mapType, setMapType] = useState<"standard" | "hybrid">("standard");
  const mapRef = useRef<MapView | null>(null);
  const autoGpsRan = useRef(false);

  const [scale, setScale] =
    useState<"500" | "1000" | "2000" | "3000" | "5000" | "10000">("5000");

  function scaleToDelta(
    scale: "500" | "1000" | "2000" | "3000" | "5000" | "10000"
  ) {
    switch (scale) {
      case "500": return 0.001;
      case "1000": return 0.002;
      case "2000": return 0.004;
      case "3000": return 0.006;
      case "5000": return 0.01;
      case "10000": return 0.02;
    }
  }

  function scaleToRadius(
    scale: "500" | "1000" | "2000" | "3000" | "5000" | "10000"
  ) {
    switch (scale) {
      case "500": return 50;
      case "1000": return 80;
      case "2000": return 150;
      case "3000": return 300;
      case "5000": return 600;
      case "10000": return 1200;
    }
  }

  // ✅ GPS эсвэл дамжуулсан координат ашиглах
  useFocusEffect(
    useCallback(() => {
      if (autoGpsRan.current) return;
      autoGpsRan.current = true;

      (async () => {
        const delta = scaleToDelta("2000");

        // 🔥 Хэрвээ GPS-аас coordinate дамжсан бол тэрийг ашиглана
        if (params.source === "gps" && params.lat && params.lng) {
          const lat = Number(params.lat);
          const lng = Number(params.lng);

          setPoint({ latitude: lat, longitude: lng });

          mapRef.current?.animateToRegion(
            {
              latitude: lat,
              longitude: lng,
              latitudeDelta: delta,
              longitudeDelta: delta,
            },
            600
          );

          return;
        }

        // 🧭 Үгүй бол өөрөө GPS авна
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") return;

        const loc =
          await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

        setPoint({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        mapRef.current?.animateToRegion(
          {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: delta,
            longitudeDelta: delta,
          },
          600
        );
      })();
    }, [params.source, params.lat, params.lng])
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#4d4d4d79" }}>
      <View style={{ flex: 1 }}>
        {!point && (
          <View style={styles.guide}>
            <Text style={styles.guideText}>
              📍 Та явах эхлэх байршлаа{"\n"}
              газрын зураг дээр <Text style={{ fontWeight: "700" }}>удаан дарж</Text> сонгоно уу.
            </Text>
            <Text style={styles.guideSub}>
              Улаан байршил заагч гарсны дараа доорх товчоор үргэлжлүүлнэ.
            </Text>
          </View>
        )}

        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          mapType={mapType}
          initialRegion={{
            latitude: 47.918,
            longitude: 106.917,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          showsMyLocationButton
          onLongPress={(e) => setPoint(e.nativeEvent.coordinate)}
        >
          {point && (
            <>
              <Marker coordinate={point} />
              <Circle
                center={point}
                radius={scaleToRadius(scale)}
                strokeColor="rgba(37,99,235,0.6)"
                fillColor="rgba(37,99,235,0.15)"
              />
            </>
          )}
        </MapView>

        {/* Scale Buttons */}
        <View style={styles.scaleContainer}>
          {["500", "1000", "2000", "5000", "10000"].map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => {
                if (!point || !mapRef.current) return;

                const delta = scaleToDelta(
                  s as "500" | "1000" | "2000" | "5000" | "10000"
                );

                setScale(s as any);

                mapRef.current.animateToRegion(
                  {
                    latitude: point.latitude,
                    longitude: point.longitude,
                    latitudeDelta: delta,
                    longitudeDelta: delta,
                  },
                  400
                );
              }}
              style={[
                styles.scaleBtn,
                scale === s && { backgroundColor: "#2563eb" },
              ]}
            >
              <Text style={{ color: "#fff", fontSize: 12 }}>1:{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* GPS Button */}
        <View style={styles.gpsBtn}>
          <TouchableOpacity
            onPress={async () => {
              const { status } =
                await Location.requestForegroundPermissionsAsync();

              if (status !== "granted") {
                Alert.alert("Байршлын зөвшөөрөл хэрэгтэй");
                return;
              }

              const loc =
                await Location.getCurrentPositionAsync({
                  accuracy: Location.Accuracy.Balanced,
                });

              const region = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              };

              setPoint({
                latitude: region.latitude,
                longitude: region.longitude,
              });

              mapRef.current?.animateToRegion(region, 600);
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16 }}>📍</Text>
          </TouchableOpacity>
        </View>

        {/* Map Type Toggle */}
        <View style={styles.mapTypeBtn}>
          <TouchableOpacity
            onPress={() =>
              setMapType((prev) =>
                prev === "standard" ? "hybrid" : "standard"
              )
            }
          >
            <Text style={{ color: "#fff", fontSize: 13 }}>
              {mapType === "standard" ? "🛰 Satellite" : "🗺 Map"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Confirm Button */}
        <View style={styles.bottom}>
          <TouchableOpacity
            disabled={!point}
            onPress={async () => {
              if (!point || !mapRef.current) return;

              const image = await mapRef.current.takeSnapshot({
                width: 300,
                height: 600,
                format: "png",
                quality: 0.8,
                result: "file",
              });

              router.replace({
                pathname: "/location",
                params: {
                  source: "map",
                  lat: point.latitude.toString(),
                  lng: point.longitude.toString(),
                  mapImage: image,
                  ...(params.role ? { role: params.role } : {}),
                },
              });
            }}
            style={[
              styles.btn,
              { backgroundColor: point ? "#2563eb" : "#94a3b8" },
            ]}
          >
            <Text style={{ color: "#fff", fontSize: 16 }}>
              Энэ байршлыг сонгох
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  btn: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  guide: {
    position: "absolute",
    top: 80,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 14,
    borderRadius: 14,
    zIndex: 10,
  },
  guideText: {
    color: "#fff",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  guideSub: {
    color: "#e5e7eb",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
  scaleContainer: {
    position: "absolute",
    bottom: 160,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    flexDirection: "row",
    overflow: "hidden",
  },
  scaleBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  gpsBtn: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    padding: 10,
    zIndex: 20,
  },
  mapTypeBtn: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 20,
  },
});
