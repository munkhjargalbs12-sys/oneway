import MapOverlayBackButton from "@/components/MapOverlayBackButton";
import MapTypeHint from "@/components/MapTypeHint";
import MapTypeToggle, { type MapTypeOption } from "@/components/MapTypeToggle";
import PlaceAutocompleteField from "@/components/PlaceAutocompleteField";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { API_URL } from "@/services/config";
import type { PlaceDetails } from "@/services/placeSearch";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";

type Point = { latitude: number; longitude: number };

function formatCoordinate(value: number) {
  return value.toFixed(4);
}

export default function CreateWayRoute() {
  const params = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    startLat?: string;
    startLng?: string;
    startLabel?: string;
  }>();

  const startLatRaw = params.lat ?? params.startLat;
  const startLngRaw = params.lng ?? params.startLng;
  const startLabel = Array.isArray(params.startLabel) ? params.startLabel[0] : params.startLabel;
  const startLat = Number(startLatRaw);
  const startLng = Number(startLngRaw);

  const mapRef = useRef<MapView | null>(null);
  const routePreviewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [end, setEnd] = useState<Point | null>(null);
  const [routeCoords, setRouteCoords] = useState<Point[]>([]);
  const [mapType, setMapType] = useState<MapTypeOption>("standard");
  const [loading, setLoading] = useState(false);
  const [destinationSearch, setDestinationSearch] = useState("");
  const [selectedDestination, setSelectedDestination] = useState<PlaceDetails | null>(null);

  useEffect(() => {
    return () => {
      if (routePreviewTimeoutRef.current) {
        clearTimeout(routePreviewTimeoutRef.current);
      }
    };
  }, []);

  if (!Number.isFinite(startLat) || !Number.isFinite(startLng)) {
    return (
      <View style={styles.invalidScreen}>
        <View style={styles.invalidCard}>
          <Text style={styles.invalidTitle}>Эхлэх байршил олдсонгүй</Text>
          <Text style={styles.invalidBody}>
            Маршрут үүсгэхийн өмнө эхлэх цэгээ location screen дээрээс дахин сонгоно уу.
          </Text>
          <TouchableOpacity activeOpacity={0.92} style={styles.invalidButton} onPress={() => router.back()}>
            <Text style={styles.invalidButtonText}>Буцах</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const start: Point = {
    latitude: startLat,
    longitude: startLng,
  };

  function decodePolyline(encoded: string) {
    const points: Point[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let b;
      let shift = 0;
      let result = 0;
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

  async function fetchRoute(destination: Point) {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          start: { lat: start.latitude, lng: start.longitude },
          end: { lat: destination.latitude, lng: destination.longitude },
        }),
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok || !data.polyline) {
        Alert.alert("Алдаа", data?.error || "Чиглэл олдсонгүй");
        return;
      }

      const coords = decodePolyline(data.polyline);
      setRouteCoords(coords);

      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 140, right: 40, bottom: 180, left: 40 },
        animated: true,
      });
    } catch (error) {
      console.log("Route fetch failed:", error);
      Alert.alert("Алдаа", "Backend холбогдсонгүй");
    } finally {
      setLoading(false);
    }
  }

  function focusEndPoint(target: Point, delta = 0.015) {
    mapRef.current?.animateToRegion(
      {
        latitude: target.latitude,
        longitude: target.longitude,
        latitudeDelta: delta,
        longitudeDelta: delta,
      },
      420
    );
  }

  function queueRouteFetch(destination: Point) {
    if (routePreviewTimeoutRef.current) {
      clearTimeout(routePreviewTimeoutRef.current);
    }

    routePreviewTimeoutRef.current = setTimeout(() => {
      routePreviewTimeoutRef.current = null;
      fetchRoute(destination);
    }, 260);
  }

  function applyDestination(
    point: Point,
    label?: string | null,
    place?: PlaceDetails | null,
    options?: { previewSearchFocus?: boolean }
  ) {
    const previewSearchFocus = options?.previewSearchFocus ?? false;
    setEnd(point);
    setRouteCoords([]);
    setSelectedDestination(place ?? null);
    setDestinationSearch(label || "");
    focusEndPoint(point, previewSearchFocus ? 0.008 : 0.015);

    if (previewSearchFocus) {
      queueRouteFetch(point);
      return;
    }

    fetchRoute(point);
  }

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        initialRegion={{
          latitude: start.latitude,
          longitude: start.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onLongPress={(event) => {
          const destination = event.nativeEvent.coordinate;
          setSelectedDestination(null);
          applyDestination(destination, "", null);
        }}
      >
        <Marker coordinate={start} pinColor={AppTheme.colors.accent} />
        {end ? <Marker coordinate={end} pinColor={AppTheme.colors.badge} /> : null}
        {routeCoords.length > 0 ? (
          <Polyline coordinates={routeCoords} strokeWidth={4} strokeColor={AppTheme.colors.accentDeep} />
        ) : null}
      </MapView>

      <MapOverlayBackButton />

      <View style={styles.searchWrap}>
        <PlaceAutocompleteField
          compact
          showGoogleHint={false}
          placeholder="Очих байршил хайх"
          value={destinationSearch}
          selectedPlaceId={selectedDestination?.placeId ?? null}
          selectedLabel={selectedDestination?.label ?? null}
          origin={{ lat: start.latitude, lng: start.longitude }}
          onChangeText={(text) => {
            setDestinationSearch(text);
            if (selectedDestination && text.trim() !== selectedDestination.label.trim()) {
              setSelectedDestination(null);
            }
          }}
          onSelectPlace={(place) => {
            applyDestination(
              { latitude: place.lat, longitude: place.lng },
              place.label,
              place,
              { previewSearchFocus: true }
            );
          }}
          label=""
        />
      </View>

      <View style={styles.toggleWrap}>
        <MapTypeToggle value={mapType} onChange={setMapType} />
        <MapTypeHint />
      </View>

      <View style={styles.bottomWrap}>
        <View style={styles.bottomBar}>
          <Text style={styles.bottomText} numberOfLines={2}>
            {selectedDestination?.label ||
              (end
                ? `Очих цэг: ${formatCoordinate(end.latitude)}, ${formatCoordinate(end.longitude)}`
                : startLabel
                  ? `Эхлэх цэг: ${startLabel}`
                  : "Очих байршлаа нэрээр хайх эсвэл map дээр удаан дарж сонгоно")}
          </Text>

          <TouchableOpacity
            activeOpacity={0.92}
            disabled={loading || !end}
            style={[styles.confirmButton, (loading || !end) && styles.confirmButtonDisabled]}
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
                  ...(startLabel ? { startLabel } : {}),
                  ...(selectedDestination?.label ? { endLabel: selectedDestination.label } : {}),
                  mapImage,
                },
              });
            }}
          >
            <Text style={styles.confirmButtonText}>
              {loading ? "Тооцоолж байна..." : "Батлах"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
  },
  map: {
    flex: 1,
  },
  invalidScreen: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
    justifyContent: "center",
    padding: 18,
  },
  invalidCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    padding: 22,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.floating,
  },
  invalidTitle: {
    color: AppTheme.colors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  invalidBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  invalidButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  invalidButtonText: {
    color: AppTheme.colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  searchWrap: {
    position: "absolute",
    top: 16,
    left: 76,
    right: 16,
    zIndex: 25,
  },
  toggleWrap: {
    position: "absolute",
    top: 78,
    right: 16,
    zIndex: 20,
  },
  bottomWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
  },
  bottomBar: {
    backgroundColor: "rgba(255,253,248,0.96)",
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(222,212,197,0.92)",
    ...AppTheme.shadow.floating,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bottomText: {
    flex: 1,
    color: AppTheme.colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    fontFamily: AppFontFamily,
  },
  confirmButton: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    opacity: 0.55,
  },
  confirmButtonText: {
    color: AppTheme.colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
