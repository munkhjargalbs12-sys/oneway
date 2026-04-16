import PlaceAutocompleteField from "@/components/PlaceAutocompleteField";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import {
  formatRadiusLabel,
  getDefaultRadius,
  getRadiusOptions,
  type RideScope,
} from "@/services/rideSearch";
import type { PlaceDetails } from "@/services/placeSearch";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Point = {
  lat: number;
  lng: number;
};

function readString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readPoint(latValue?: string | string[], lngValue?: string | string[]) {
  const lat = Number(readString(latValue));
  const lng = Number(readString(lngValue));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function formatCoordinateLabel(point: Point) {
  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
}

function getDisplayLabel(point: Point | null, label?: string | null) {
  if (label && label.trim()) {
    return label.trim();
  }

  return point ? formatCoordinateLabel(point) : "";
}

export default function RideSearchScreen() {
  const params = useLocalSearchParams<{
    scope?: string;
    radiusM?: string;
    startLat?: string;
    startLng?: string;
    startLabel?: string;
    endLat?: string;
    endLng?: string;
    endLabel?: string;
  }>();

  const scope: RideScope =
    readString(params.scope) === "intercity" ? "intercity" : "local";
  const radiusOptions = getRadiusOptions(scope);
  const fallbackRadius = getDefaultRadius(scope);
  const radiusParam = Number(readString(params.radiusM));
  const resolvedRadius = radiusOptions.includes(radiusParam) ? radiusParam : fallbackRadius;

  const [radiusMeters, setRadiusMeters] = useState(resolvedRadius);
  const [startPoint, setStartPoint] = useState<Point | null>(readPoint(params.startLat, params.startLng));
  const [endPoint, setEndPoint] = useState<Point | null>(readPoint(params.endLat, params.endLng));
  const [startText, setStartText] = useState(
    getDisplayLabel(readPoint(params.startLat, params.startLng), readString(params.startLabel))
  );
  const [endText, setEndText] = useState(
    getDisplayLabel(readPoint(params.endLat, params.endLng), readString(params.endLabel))
  );
  const [selectedStartPlace, setSelectedStartPlace] = useState<PlaceDetails | null>(null);
  const [selectedEndPlace, setSelectedEndPlace] = useState<PlaceDetails | null>(null);
  const [startSelectionMode, setStartSelectionMode] = useState<"map" | "place" | null>(null);
  const [endSelectionMode, setEndSelectionMode] = useState<"map" | "place" | null>(null);

  useEffect(() => {
    setRadiusMeters(resolvedRadius);
  }, [resolvedRadius]);

  useEffect(() => {
    const nextPoint = readPoint(params.startLat, params.startLng);
    const nextLabel = getDisplayLabel(nextPoint, readString(params.startLabel));
    setStartPoint(nextPoint);
    setStartText(nextLabel);
    setSelectedStartPlace(null);
    setStartSelectionMode(nextPoint ? "map" : null);
  }, [params.startLat, params.startLng, params.startLabel]);

  useEffect(() => {
    const nextPoint = readPoint(params.endLat, params.endLng);
    const nextLabel = getDisplayLabel(nextPoint, readString(params.endLabel));
    setEndPoint(nextPoint);
    setEndText(nextLabel);
    setSelectedEndPlace(null);
    setEndSelectionMode(nextPoint ? "map" : null);
  }, [params.endLat, params.endLng, params.endLabel]);

  const scopeTitle = scope === "intercity" ? "Хот хооронд" : "Хот дотор";
  const scopeBody =
    scope === "intercity"
      ? "Илүү урт чиглэлүүдийг өргөн радиусаар route дагуу тааруулж хайна."
      : "Ойрын чиглэлүүдийг эхлэх болон очих цэгийн ойролцоогоор хайна.";

  const searchSummary = useMemo(() => {
    if (!startPoint || !endPoint) {
      return "Эхлэх ба очих цэгээ map эсвэл үгээр сонгоно уу.";
    }

    return `${getDisplayLabel(startPoint, startText)} → ${getDisplayLabel(endPoint, endText)}`;
  }, [endPoint, endText, startPoint, startText]);

  function openMapPicker(pointKey: "start" | "end") {
    router.push({
      pathname: "/location/map",
      params: {
        returnTo: "ride-search",
        pointKey,
        scope,
        radiusM: String(radiusMeters),
        ...(startPoint ? { startLat: String(startPoint.lat), startLng: String(startPoint.lng) } : {}),
        ...(startText ? { startLabel: startText } : {}),
        ...(endPoint ? { endLat: String(endPoint.lat), endLng: String(endPoint.lng) } : {}),
        ...(endText ? { endLabel: endText } : {}),
      },
    });
  }

  function applyPlace(pointKey: "start" | "end", place: PlaceDetails) {
    const nextPoint = { lat: place.lat, lng: place.lng };

    if (pointKey === "start") {
      setStartPoint(nextPoint);
      setStartText(place.label);
      setSelectedStartPlace(place);
      setStartSelectionMode("place");
      return;
    }

    setEndPoint(nextPoint);
    setEndText(place.label);
    setSelectedEndPlace(place);
    setEndSelectionMode("place");
  }

  function clearPoint(pointKey: "start" | "end") {
    if (pointKey === "start") {
      setStartPoint(null);
      setStartText("");
      setSelectedStartPlace(null);
      setStartSelectionMode(null);
      return;
    }

    setEndPoint(null);
    setEndText("");
    setSelectedEndPlace(null);
    setEndSelectionMode(null);
  }

  function submitSearch() {
    if (!startPoint || !endPoint) {
      Alert.alert("Алдаа", "Эхлэх болон очих цэгээ хоёуланг нь сонгоно уу.");
      return;
    }

    router.replace({
      pathname: "/rides",
      params: {
        scope,
        searchStartLat: String(startPoint.lat),
        searchStartLng: String(startPoint.lng),
        searchStartLabel: getDisplayLabel(startPoint, startText),
        searchEndLat: String(endPoint.lat),
        searchEndLng: String(endPoint.lng),
        searchEndLabel: getDisplayLabel(endPoint, endText),
        radiusM: String(radiusMeters),
      },
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[AppTheme.colors.accentDeep, AppTheme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroEyebrow}>Ride Search</Text>
        <Text style={styles.heroTitle}>{scopeTitle} чиглэл хайх</Text>
        <Text style={styles.heroBody}>{scopeBody}</Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Эхлэх цэг</Text>
        <Text style={styles.sectionBody}>
          Газрын зургаас сонгож болно, map ашиглахгүй бол үгээр хайж болно.
        </Text>

        <PlaceAutocompleteField
          label=""
          compact={false}
          showGoogleHint={false}
          placeholder="Эхлэх байршил хайх"
          value={startText}
          selectedPlaceId={
            selectedStartPlace?.placeId || (startSelectionMode === "map" && startPoint ? "map-start" : null)
          }
          selectedLabel={getDisplayLabel(startPoint, startText)}
          onChangeText={(text) => {
            setStartText(text);
            if (selectedStartPlace && text.trim() !== selectedStartPlace.label.trim()) {
              setSelectedStartPlace(null);
              setStartSelectionMode(null);
            }
          }}
          onSelectPlace={(place) => applyPlace("start", place)}
        />

        <View style={styles.actionRow}>
          <TouchableOpacity activeOpacity={0.92} style={styles.secondaryButton} onPress={() => openMapPicker("start")}>
            <Text style={styles.secondaryButtonText}>Map дээр сонгох</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.92} style={styles.ghostButton} onPress={() => clearPoint("start")}>
            <Text style={styles.ghostButtonText}>Цэвэрлэх</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Очих цэг</Text>
        <Text style={styles.sectionBody}>
          Очих байршлаа бас map эсвэл үгээр сонгож болно.
        </Text>

        <PlaceAutocompleteField
          label=""
          compact={false}
          showGoogleHint={false}
          placeholder="Очих байршил хайх"
          value={endText}
          selectedPlaceId={
            selectedEndPlace?.placeId || (endSelectionMode === "map" && endPoint ? "map-end" : null)
          }
          selectedLabel={getDisplayLabel(endPoint, endText)}
          origin={startPoint ? { lat: startPoint.lat, lng: startPoint.lng } : null}
          onChangeText={(text) => {
            setEndText(text);
            if (selectedEndPlace && text.trim() !== selectedEndPlace.label.trim()) {
              setSelectedEndPlace(null);
              setEndSelectionMode(null);
            }
          }}
          onSelectPlace={(place) => applyPlace("end", place)}
        />

        <View style={styles.actionRow}>
          <TouchableOpacity activeOpacity={0.92} style={styles.secondaryButton} onPress={() => openMapPicker("end")}>
            <Text style={styles.secondaryButtonText}>Map дээр сонгох</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.92} style={styles.ghostButton} onPress={() => clearPoint("end")}>
            <Text style={styles.ghostButtonText}>Цэвэрлэх</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Хайлтын радиус</Text>
        <Text style={styles.sectionBody}>
          {scope === "intercity"
            ? "Хот хоорондын хайлт дээр route дагуух ойролцооллыг өргөн радиусаар шалгана."
            : "Хот дотор эхлэл болон очих цэгийн ойролцоо таарах чиглэлүүдийг шалгана."}
        </Text>

        <View style={styles.radiusRow}>
          {radiusOptions.map((option) => {
            const active = option === radiusMeters;
            return (
              <TouchableOpacity
                key={option}
                activeOpacity={0.92}
                style={[styles.radiusChip, active && styles.radiusChipActive]}
                onPress={() => setRadiusMeters(option)}
              >
                <Text style={[styles.radiusChipText, active && styles.radiusChipTextActive]}>
                  {formatRadiusLabel(option)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Одоогийн хайлт</Text>
        <Text style={styles.summaryValue}>{searchSummary}</Text>
        <Text style={styles.summaryMeta}>Радиус: {formatRadiusLabel(radiusMeters)}</Text>
      </View>

      <TouchableOpacity activeOpacity={0.92} style={styles.primaryButton} onPress={submitSearch}>
        <Text style={styles.primaryButtonText}>Чиглэл хайх</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 22,
    ...AppTheme.shadow.floating,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 10,
    fontFamily: AppFontFamily,
  },
  heroTitle: {
    color: AppTheme.colors.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  heroBody: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  sectionCard: {
    marginTop: 16,
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 18,
    ...AppTheme.shadow.card,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  sectionBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 14,
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  ghostButton: {
    minWidth: 96,
    minHeight: 48,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.white,
  },
  ghostButtonText: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  radiusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  radiusChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.cardSoft,
  },
  radiusChipActive: {
    backgroundColor: AppTheme.colors.accent,
  },
  radiusChipText: {
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  radiusChipTextActive: {
    color: AppTheme.colors.white,
  },
  summaryCard: {
    marginTop: 16,
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: AppTheme.radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  summaryLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  summaryValue: {
    color: AppTheme.colors.text,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  summaryMeta: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 56,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.accentDeep,
    ...AppTheme.shadow.floating,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
