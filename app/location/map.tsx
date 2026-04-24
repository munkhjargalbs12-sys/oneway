import type { AppMapRef } from "@/components/AppMap";
// eslint-disable-next-line import/no-unresolved
import MapView, { Circle, Marker, PROVIDER_GOOGLE } from "@/components/AppMap";
import FeatureHintBubble from "@/components/FeatureHintBubble";
import MapOverlayBackButton from "@/components/MapOverlayBackButton";
import MapTypeHint from "@/components/MapTypeHint";
import MapTypeToggle, { type MapTypeOption } from "@/components/MapTypeToggle";
import PlaceAutocompleteField from "@/components/PlaceAutocompleteField";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Animated, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { PlaceDetails } from "@/services/placeSearch";

type Point = {
  latitude: number;
  longitude: number;
};

type Scale = "500" | "1000" | "2000" | "3000" | "5000" | "10000";
type HintId = "currentLocation" | "meetingLocation" | "mapType";

const HINT_STORAGE_KEYS: Record<HintId, string> = {
  currentLocation: "oneway_seen_current_location_hint_v3",
  meetingLocation: "oneway_seen_meeting_location_hint_v3",
  mapType: "oneway_seen_map_type_hint_v3",
};

const HINT_ORDER: HintId[] = ["currentLocation", "meetingLocation", "mapType"];

export default function MapPickScreen() {
  const params = useLocalSearchParams<{
    source?: string;
    lat?: string;
    lng?: string;
    label?: string;
    role?: string;
    returnTo?: string;
    pointKey?: string;
    scope?: string;
    radiusM?: string;
    startLat?: string;
    startLng?: string;
    startLabel?: string;
    endLat?: string;
    endLng?: string;
    endLabel?: string;
  }>();

  const [point, setPoint] = useState<Point | null>(null);
  const [pointLabel, setPointLabel] = useState("");
  const [searchText, setSearchText] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Point | null>(null);
  const [mapType, setMapType] = useState<MapTypeOption>("standard");
  const [hintQueue, setHintQueue] = useState<HintId[]>([]);
  const [scale, setScale] = useState<Scale>("5000");
  const mapRef = useRef<AppMapRef | null>(null);
  const autoGpsRan = useRef(false);
  const markerPulse = useRef(new Animated.Value(0)).current;
  const meetingIcon = require("../../assets/icons/meeting.png");
  const myLocationIcon = require("../../assets/icons/my location.png");
  const activeHint = hintQueue[0] ?? null;
  const returnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const pointKey = Array.isArray(params.pointKey) ? params.pointKey[0] : params.pointKey;
  const isEndPoint = pointKey === "end";
  const selectedPointLabel = pointLabel || (point ? `${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}` : "");
  const selectedPointMarkerLabel = isEndPoint ? "Очих цэг" : "Эхлэх цэг";
  const fieldPlaceholder = isEndPoint ? "Очих байршил хайх" : "Эхлэх байршил хайх";
  const selectedPointText = isEndPoint ? "Очих цэг сонгогдсон" : "Эхлэх цэг сонгогдсон";
  const emptyPointText = isEndPoint
    ? "Нэрээр хайх эсвэл map дээр удаан дарж очих цэгээ сонгоно"
    : "Нэрээр хайх эсвэл map дээр удаан дарж эхлэх цэгээ сонгоно";

  function scaleToDelta(nextScale: Scale) {
    switch (nextScale) {
      case "500":
        return 0.001;
      case "1000":
        return 0.002;
      case "2000":
        return 0.004;
      case "3000":
        return 0.006;
      case "5000":
        return 0.01;
      case "10000":
        return 0.02;
    }
  }

  function scaleToRadius(nextScale: Scale) {
    switch (nextScale) {
      case "500":
        return 50;
      case "1000":
        return 80;
      case "2000":
        return 150;
      case "3000":
        return 300;
      case "5000":
        return 600;
      case "10000":
        return 1200;
    }
  }

  function isSamePoint(first: Point | null, second: Point | null) {
    if (!first || !second) return false;
    return (
      Math.abs(first.latitude - second.latitude) < 0.00001 &&
      Math.abs(first.longitude - second.longitude) < 0.00001
    );
  }

  const focusPoint = useCallback(
    (target: Point, options?: { forceZoom?: boolean }) => {
      if (!mapRef.current) return;
      const forceZoom = options?.forceZoom ?? false;

      if (!forceZoom && currentLocation && !isSamePoint(target, currentLocation)) {
        mapRef.current.fitToCoordinates([target, currentLocation], {
          edgePadding: { top: 160, right: 80, bottom: 220, left: 80 },
          animated: true,
        });
        return;
      }

      const delta = forceZoom ? 0.008 : scaleToDelta(scale);
      mapRef.current.animateToRegion(
        {
          latitude: target.latitude,
          longitude: target.longitude,
          latitudeDelta: delta,
          longitudeDelta: delta,
        },
        420
      );
    },
    [currentLocation, scale]
  );

  const dismissHint = useCallback(async (hintId: HintId) => {
    setHintQueue((prev) =>
      prev[0] === hintId ? prev.slice(1) : prev.filter((item) => item !== hintId)
    );
  }, []);

  const focusCurrentLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Байршлын зөвшөөрөл хэрэгтэй");
      return;
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const region = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    };

    setCurrentLocation({
      latitude: region.latitude,
      longitude: region.longitude,
    });

    mapRef.current?.animateToRegion(region, 600);
  }, []);

  const focusMeetingPoint = useCallback(() => {
    if (!point) return;
    focusPoint(point);
  }, [focusPoint, point]);

  const applyPoint = useCallback(
    (
      nextPoint: Point,
      nextLabel = "",
      place: PlaceDetails | null = null,
      options?: { forceZoom?: boolean }
    ) => {
      setPoint(nextPoint);
      setPointLabel(nextLabel);
      setSearchText(nextLabel);
      setSelectedPlace(place);
      focusPoint(nextPoint, options);
    },
    [focusPoint]
  );

  const handleMapLongPress = useCallback(
    async (event: any) => {
      const nextPoint = event.nativeEvent.coordinate as Point;
      setSelectedPlace(null);
      applyPoint(nextPoint, "", null);

      if (!currentLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });

          setCurrentLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }
      }
    },
    [applyPoint, currentLocation]
  );

  useFocusEffect(
    useCallback(() => {
      if (autoGpsRan.current) return;
      autoGpsRan.current = true;

      (async () => {
        const delta = scaleToDelta("2000");
        const source = Array.isArray(params.source) ? params.source[0] : params.source;
        const lat = Array.isArray(params.lat) ? params.lat[0] : params.lat;
        const lng = Array.isArray(params.lng) ? params.lng[0] : params.lng;
        const label = Array.isArray(params.label) ? params.label[0] : params.label;

        if ((source === "map" || source === "place") && lat && lng) {
          const nextPoint = {
            latitude: Number(lat),
            longitude: Number(lng),
          };

          setPoint(nextPoint);
          setPointLabel(label || "");
          setSearchText(label || "");
          mapRef.current?.animateToRegion(
            {
              latitude: nextPoint.latitude,
              longitude: nextPoint.longitude,
              latitudeDelta: delta,
              longitudeDelta: delta,
            },
            600
          );
        }

        if (params.source === "gps" && params.lat && params.lng) {
          const gpsPoint = {
            latitude: Number(params.lat),
            longitude: Number(params.lng),
          };
          setCurrentLocation(gpsPoint);
          mapRef.current?.animateToRegion(
            {
              latitude: gpsPoint.latitude,
              longitude: gpsPoint.longitude,
              latitudeDelta: delta,
              longitudeDelta: delta,
            },
            600
          );
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setCurrentLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (!lat || !lng) {
          mapRef.current?.animateToRegion(
            {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: delta,
              longitudeDelta: delta,
            },
            600
          );
        }
      })();
    }, [params.label, params.lat, params.lng, params.source])
  );

  useEffect(() => {
    setHintQueue(HINT_ORDER);
  }, []);

  useEffect(() => {
    if (!activeHint) return;

    const timeout = setTimeout(() => {
      dismissHint(activeHint);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [activeHint, dismissHint]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(markerPulse, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(markerPulse, {
          toValue: 0,
          duration: 850,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [markerPulse]);

  const meetingMarkerPulseStyle = {
    transform: [
      {
        scale: markerPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.14],
        }),
      },
    ],
    opacity: markerPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.94, 1],
    }),
  };

  const currentMarkerPulseStyle = {
    transform: [
      {
        scale: markerPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.18],
        }),
      },
    ],
    opacity: markerPulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    }),
  };

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        mapType={mapType}
        initialRegion={{
          latitude: 47.918,
          longitude: 106.917,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
        onLongPress={handleMapLongPress}
      >
        {currentLocation ? (
          <Circle
            center={currentLocation}
            radius={scaleToRadius(scale)}
            strokeColor="rgba(47,107,83,0.3)"
            fillColor="rgba(47,107,83,0.12)"
          />
        ) : null}

        {point ? (
          <Marker coordinate={point} anchor={{ x: 0.5, y: 0.76 }} zIndex={18} tracksViewChanges>
            <View style={styles.selectedPointMarkerWrap} collapsable={false}>
              <View style={styles.selectedPointMarkerIconWrap}>
                <Animated.Image
                  source={meetingIcon}
                  style={[styles.selectedPointMarker, meetingMarkerPulseStyle]}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.selectedPointMarkerLabelPill}>
                <Text style={styles.selectedPointMarkerLabelText}>
                  {selectedPointMarkerLabel}
                </Text>
              </View>
            </View>
          </Marker>
        ) : null}

        {currentLocation ? (
          <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.86 }} zIndex={20} tracksViewChanges>
            <View style={styles.myLocationMarkerWrap} collapsable={false}>
              <Animated.Image
                source={myLocationIcon}
                style={[styles.myLocationMarker, currentMarkerPulseStyle]}
                resizeMode="contain"
              />
            </View>
          </Marker>
        ) : null}
      </MapView>

      <MapOverlayBackButton />

      <View style={styles.searchWrap}>
        <PlaceAutocompleteField
          compact
          showGoogleHint={false}
          placeholder={fieldPlaceholder}
          value={searchText}
          selectedPlaceId={selectedPlace?.placeId ?? null}
          selectedLabel={selectedPointLabel || selectedPlace?.label || null}
          onChangeText={(text) => {
            setSearchText(text);
            if (selectedPlace && text.trim() !== selectedPlace.label.trim()) {
              setSelectedPlace(null);
            }
          }}
            onSelectPlace={(place) => {
              applyPoint(
                {
                  latitude: place.lat,
                  longitude: place.lng,
                },
                place.label,
                place,
                { forceZoom: true }
              );
            }}
          label=""
        />
      </View>

      <View style={styles.scaleContainer}>
        {["500", "1000", "2000", "5000", "10000"].map((item) => (
          <TouchableOpacity
            key={item}
            activeOpacity={0.88}
            onPress={() => {
              const focusTarget = point ?? currentLocation;
              if (!focusTarget || !mapRef.current) return;

              const nextScale = item as Scale;
              const delta = scaleToDelta(nextScale);

              setScale(nextScale);
              mapRef.current.animateToRegion(
                {
                  latitude: focusTarget.latitude,
                  longitude: focusTarget.longitude,
                  latitudeDelta: delta,
                  longitudeDelta: delta,
                },
                400
              );
            }}
            style={[styles.scaleButton, scale === item && styles.scaleButtonActive]}
          >
            <Text style={[styles.scaleText, scale === item && styles.scaleTextActive]}>1:{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity activeOpacity={0.9} onPress={focusCurrentLocation} style={styles.iconButton}>
        <Image source={myLocationIcon} style={styles.iconImage} resizeMode="contain" />
      </TouchableOpacity>

      <View style={styles.currentHintWrap}>
        <FeatureHintBubble
          storageKey={HINT_STORAGE_KEYS.currentLocation}
          message="Энэ бол таны одоо байгаа байршил."
          maxWidth={200}
          visible={activeHint === "currentLocation"}
          onDismiss={() => dismissHint("currentLocation")}
          persistOnDismiss={false}
        />
      </View>

      <View style={styles.mapTypeWrap}>
        <MapTypeToggle value={mapType} onChange={setMapType} />
        <MapTypeHint
          storageKey={HINT_STORAGE_KEYS.mapType}
          visible={activeHint === "mapType"}
          onDismiss={() => dismissHint("mapType")}
          persistOnDismiss={false}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        disabled={!point}
        onPress={focusMeetingPoint}
        style={[styles.iconButton, styles.meetingButton, !point && styles.iconButtonDisabled]}
      >
        <Image source={meetingIcon} style={[styles.iconImage, !point && styles.iconImageDisabled]} resizeMode="contain" />
      </TouchableOpacity>

      <View style={styles.meetingHintWrap}>
        <FeatureHintBubble
          storageKey={HINT_STORAGE_KEYS.meetingLocation}
          message={isEndPoint ? "Энэ бол таны сонгосон очих цэг." : "Энэ бол таны сонгосон эхлэх цэг."}
          maxWidth={220}
          visible={activeHint === "meetingLocation"}
          onDismiss={() => dismissHint("meetingLocation")}
          persistOnDismiss={false}
        />
      </View>

      <View style={styles.bottomWrap}>
        <View style={styles.bottomBar}>
          <Text style={styles.bottomText} numberOfLines={2}>
            {selectedPointLabel || (point ? selectedPointText : emptyPointText)}
          </Text>

          <TouchableOpacity
            activeOpacity={0.92}
            disabled={!point}
            onPress={async () => {
              if (!point || !mapRef.current) return;

              if (returnTo === "home") {
                router.replace({
                  pathname: "/home",
                  params: {
                    startLat: point.latitude.toString(),
                    startLng: point.longitude.toString(),
                    ...(pointLabel ? { startLabel: pointLabel } : {}),
                    ...(selectedPlace?.address ? { startAddress: selectedPlace.address } : {}),
                  },
                });
                return;
              }

              if (returnTo === "ride-search") {
                router.replace({
                  pathname: "/ride/search" as never,
                  params: {
                    scope: params.scope,
                    radiusM: params.radiusM,
                    ...(params.startLat ? { startLat: params.startLat } : {}),
                    ...(params.startLng ? { startLng: params.startLng } : {}),
                    ...(params.startLabel ? { startLabel: params.startLabel } : {}),
                    ...(params.endLat ? { endLat: params.endLat } : {}),
                    ...(params.endLng ? { endLng: params.endLng } : {}),
                    ...(params.endLabel ? { endLabel: params.endLabel } : {}),
                    ...(pointKey === "end"
                      ? {
                          endLat: point.latitude.toString(),
                          endLng: point.longitude.toString(),
                          ...(selectedPointLabel ? { endLabel: selectedPointLabel } : {}),
                        }
                      : {
                          startLat: point.latitude.toString(),
                          startLng: point.longitude.toString(),
                          ...(selectedPointLabel ? { startLabel: selectedPointLabel } : {}),
                        }),
                  },
                });
                return;
              }

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
                  source: selectedPlace ? "place" : "map",
                  lat: point.latitude.toString(),
                  lng: point.longitude.toString(),
                  ...(selectedPointLabel ? { label: selectedPointLabel } : {}),
                  ...(selectedPlace?.address ? { address: selectedPlace.address } : {}),
                  mapImage: image,
                  ...(params.role ? { role: params.role } : {}),
                },
              });
            }}
            style={[styles.confirmButton, !point && styles.confirmButtonDisabled]}
          >
            <Text style={styles.confirmButtonText}>Батлах</Text>
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
  searchWrap: {
    position: "absolute",
    top: 16,
    left: 76,
    right: 16,
    zIndex: 25,
  },
  scaleContainer: {
    position: "absolute",
    bottom: 108,
    left: 16,
    right: 16,
    flexDirection: "row",
    backgroundColor: "rgba(255,253,248,0.94)",
    borderRadius: AppTheme.radius.md,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(222,212,197,0.92)",
    ...AppTheme.shadow.card,
  },
  scaleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.sm,
    alignItems: "center",
  },
  scaleButtonActive: {
    backgroundColor: AppTheme.colors.accent,
  },
  scaleText: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  scaleTextActive: {
    color: AppTheme.colors.white,
  },
  iconButton: {
    position: "absolute",
    top: 88,
    left: 16,
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(222,212,197,0.92)",
    backgroundColor: "rgba(255,253,248,0.94)",
    ...AppTheme.shadow.card,
  },
  meetingButton: {
    top: 160,
  },
  iconButtonDisabled: {
    opacity: 0.56,
  },
  iconImage: {
    width: 56,
    height: 56,
  },
  iconImageDisabled: {
    opacity: 0.55,
  },
  currentHintWrap: {
    position: "absolute",
    top: 102,
    left: 88,
    zIndex: 20,
  },
  meetingHintWrap: {
    position: "absolute",
    top: 174,
    left: 88,
    zIndex: 20,
  },
  mapTypeWrap: {
    position: "absolute",
    top: 78,
    right: 16,
    zIndex: 20,
  },
  myLocationMarker: {
    width: 46,
    height: 46,
  },
  myLocationMarkerWrap: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedPointMarker: {
    width: 46,
    height: 46,
  },
  selectedPointMarkerWrap: {
    width: 96,
    height: 92,
    paddingTop: 6,
    paddingBottom: 4,
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "visible",
  },
  selectedPointMarkerIconWrap: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  selectedPointMarkerLabelPill: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: "rgba(255,253,248,0.96)",
    borderWidth: 1,
    borderColor: "rgba(222,212,197,0.92)",
    ...AppTheme.shadow.card,
  },
  selectedPointMarkerLabelText: {
    color: AppTheme.colors.accentDeep,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    fontFamily: AppFontFamily,
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
