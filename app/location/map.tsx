import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Circle, Marker } from "react-native-maps";

type Point = {
  latitude: number;
  longitude: number;
};

export default function MapPickScreen() {
  // 📍 Сонгогдсон цэг
  const [point, setPoint] = useState<Point | null>(null);

  // 🗺 Газрын зурагны төрөл (standard / hybrid)
  const [mapType, setMapType] = useState<"standard" | "hybrid">(
    "standard" // default map нь standard, toggle дээр дарвал hybrid болно
  );

  const mapRef = useRef<MapView | null>(null); // MapView-ийг manipulate хийх ref
  const autoGpsRan = useRef(false);           // Авто GPS нэг удаа ажиллах flag

  // 🌐 Scale (дэлгэц дээрх circle radius болон zoom)
  const [scale, setScale] =
    useState<"500"| "1000" |"2000"|"3000" | "5000" | "10000">("5000");

  // 🔹 Scale-ыг delta-д хөрвүүлэх (zoom)
  function scaleToDelta(scale:"500"| "1000" |"2000"|"3000"| "5000" | "10000") {
    switch (scale) {
      case "500": return 0.001;
      case "1000": return 0.002;
      case "2000": return 0.004;
      case "3000": return 0.006;
      case "5000": return 0.01;
      case "10000": return 0.02;
    }
  }

  // 🔹 Scale-ыг circle radius-д хөрвүүлэх
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

  // 🧭 GPS-ийг эхэнд нэг удаа авах
  useFocusEffect(
    useCallback(() => {
      if (autoGpsRan.current) return; // зөвхөн нэг удаа ажиллана
      autoGpsRan.current = true;

      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const delta = scaleToDelta("2000"); // эхний zoom

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
    }, [])
  );

  return (
    <View style={{ flex: 1 }}>
      {/* 🔝 ЗААВАР — газрын зураг дээр дарж эхлэх байршлаа сонгох */}
      {!point && (
        <View style={styles.guide}>
          <Text style={styles.guideText}>
            📍 Та явах эхлэх байршлаа{"\n"}
            газрын зураг дээр{" "}
            <Text style={{ fontWeight: "700" }}>удаан дарж</Text>{" "}
            сонгоно уу.
          </Text>
          <Text style={styles.guideSub}>
            Улаан байршил заагч гарсны дараа
            доорх товчоор үргэлжлүүлнэ.
          </Text>
        </View>
      )}

      {/* 🗺 MAP */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        mapType={mapType} // ✅ Газрын зураг солигддог
        initialRegion={{
          latitude: 47.918,
          longitude: 106.917,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation
        showsMyLocationButton
        onLongPress={(e) => setPoint(e.nativeEvent.coordinate)} // газрын зураг дээр удаан дарахад point set хийнэ
      >
        {/* Marker болон Circle */}
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
      
      {/* 🌀 Scale товчнууд */}
      <View
        style={{
          position: "absolute",
          bottom: 160,
          left: 20,
          backgroundColor: "rgba(0,0,0,0.6)",
          borderRadius: 14,
          flexDirection: "row",
          overflow: "hidden",
        }}
      >
        {["500", "1000" ,"2000", "5000", "10000"].map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => {
              if (!point || !mapRef.current) return;

              const delta = scaleToDelta(
                s as "500"| "1000" |"2000"| "5000" | "10000"
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
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor:
                scale === s ? "#2563eb" : "transparent",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 12 }}>
              1:{s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 📍 GPS overlay button — одоогийн байршилруу очих */}
      <View
        style={{
          position: "absolute",
          bottom: 100,
          right: 20,
          backgroundColor: "rgba(0,0,0,0.6)",
          borderRadius: 20,
          padding: 10,
          zIndex: 20,
        }}
      >
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

      {/* 🛰 MapType toggle button */}
      <View
        style={{
          position: "absolute",
          top: 40,
          left: 20,
          backgroundColor: "rgba(0,0,0,0.6)",
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 8,
          zIndex: 20,
        }}
      >
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

      {/* ✅ Bottom select button — сонгосон байршлыг баталгаажуулах */}
      <View style={styles.bottom}>
        <TouchableOpacity
          disabled={!point}
          onPress={async () => {
            if (!point || !mapRef.current) return;

            // 📸 SCREENSHOT
            const image = await mapRef.current.takeSnapshot({
              width: 300,
              height: 600,
              format: "png",
              quality: 0.8,
              result: "file",
            });

            // 📤 LOCATION SCREEN рүү буцах
            router.replace({
              pathname: "/location",
              params: {
                source: "map",
                type:"start",
                lat: point.latitude.toString(),
                lng: point.longitude.toString(),
                mapImage: image,
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
    position:"absolute",
    top:80,
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
});
