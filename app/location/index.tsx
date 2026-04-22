import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Role = "driver" | "rider";
type SelectedLocation =
  | { source: "map"; lat: string; lng: string; label?: string; address?: string }
  | { source: "place"; lat: string; lng: string; label: string; address?: string };

export default function LocationScreen() {
  const [role, setRole] = useState<Role | null>(null);
  const [selected, setSelected] = useState<SelectedLocation | null>(null);
  const [areaText, setAreaText] = useState<string | null>(null);

  const params = useLocalSearchParams<{
    source?: string;
    lat?: string;
    lng?: string;
    label?: string;
    address?: string;
    mapImage?: string;
    role?: string;
  }>();

  const isRoleLocked = params.role === "driver" || params.role === "rider";
  const mapImageValue = Array.isArray(params.mapImage) ? params.mapImage[0] : params.mapImage;
  const mapImageUri =
    typeof mapImageValue === "string" && mapImageValue.length > 0
      ? mapImageValue.startsWith("file://") || mapImageValue.startsWith("http")
        ? mapImageValue
        : `file://${mapImageValue}`
      : null;

  useEffect(() => {
    if (params.role === "driver" || params.role === "rider") {
      setRole(params.role);
    }
  }, [params.role]);

  useEffect(() => {
    const source = Array.isArray(params.source) ? params.source[0] : params.source;
    const lat = Array.isArray(params.lat) ? params.lat[0] : params.lat;
    const lng = Array.isArray(params.lng) ? params.lng[0] : params.lng;
    const label = Array.isArray(params.label) ? params.label[0] : params.label;
    const address = Array.isArray(params.address) ? params.address[0] : params.address;

    if ((source !== "map" && source !== "place") || !lat || !lng) return;

    if (source === "place" && label) {
      setSelected({
        source: "place",
        lat,
        lng,
        label,
        ...(address ? { address } : {}),
      });
      setAreaText(address || label);
      return;
    }

    setSelected({
      source: "map",
      lat,
      lng,
      ...(label ? { label } : {}),
      ...(address ? { address } : {}),
    });

    if (address || label) {
      setAreaText(address || label || "");
      return;
    }

    (async () => {
      const result = await Location.reverseGeocodeAsync({
        latitude: Number(lat),
        longitude: Number(lng),
      });

      if (result.length > 0) {
        const address = result[0];
        const city = address.city ?? "Улаанбаатар";
        const district = address.district ?? "";
        const subregion = address.subregion ?? "";
        setAreaText(`${city} ${district} дүүрэг, ${subregion}`.trim());
      }
    })();
  }, [params.address, params.label, params.lat, params.lng, params.source]);

  async function ensureDriverRole() {
    try {
      const me = await apiFetch("/users/me");
      if (me?.role === "driver") return true;

      const response = await apiFetch("/auth/role", {
        method: "POST",
        body: JSON.stringify({ role: "driver" }),
      });

      return !!response?.success || response?.role === "driver";
    } catch {
      return false;
    }
  }

  async function goHome() {
    if (!role) {
      Alert.alert("Эхлээд үүргээ сонгоно уу", "Жолооч эсвэл зорчигчоо сонгоно уу");
      return;
    }

    if (!selected) {
      Alert.alert("Эхлээд байршлаа сонгоно уу");
      return;
    }

    if (role === "driver") {
      const ok = await ensureDriverRole();
      if (!ok) {
        Alert.alert("Алдаа", "Жолоочийн эрх идэвхжүүлж чадсангүй. Дахин оролдоно уу.");
        return;
      }

      router.replace({
        pathname: "/home",
        params: {
          startLat: selected.lat,
          startLng: selected.lng,
          ...(selected.source === "place"
            ? { startLabel: selected.label }
            : areaText
              ? { startLabel: areaText }
              : {}),
          ...(selected.address || areaText
            ? { startAddress: selected.address || areaText || "" }
            : {}),
          role,
        },
      });
      return;
    }

    router.replace({
      pathname: "/rides",
      params: {
        role,
        source: selected.source,
        lat: selected.lat,
        lng: selected.lng,
        location: selected.source === "place" ? selected.label : areaText ?? "",
      },
    });
  }

  function openMap() {
    if (!role) {
      Alert.alert("Эхлээд үүргээ сонгоно уу", "Жолооч эсвэл зорчигчоо сонгоно уу");
      return;
    }

    router.push({
      pathname: "/location/map",
      params: {
        role,
      },
    });
  }

  const selectionTitle = useMemo(() => {
    if (!selected) return "Эхлэх байршлаа сонго";
    if (selected.source === "map") return "Map дээрээс сонгосон байршил";
    return "Газрын нэрээр сонгосон байршил";
  }, [selected]);

  const selectionBody = useMemo(() => {
    if (!selected) {
      return "Үүргээ сонгоод газрын зураг руу орж, эхлэх байршлаа нэрээр хайх эсвэл шууд map дээр сонгоно.";
    }

    if (selected.source === "place") {
      return selected.label;
    }

    if (selected.label) return selected.label;
    if (areaText) return areaText;
    return "Координат хадгалагдсан. Дараагийн алхам руу үргэлжлүүлж болно.";
  }, [areaText, selected]);

  function resetSelection() {
    setSelected(null);
    setAreaText(null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[AppTheme.colors.accentDeep, AppTheme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroEyebrow}>Start Point</Text>
          <Text style={styles.heroTitle}>Эхлэх байршлаа газрын зургаар сонго</Text>
          <Text style={styles.heroBody}>
            Энэ дэлгэц дээр зөвхөн үүргээ сонгоод map руу орно. Нэрээр хайх, marker тавих, байршил
            батлах бүх үйлдэл map дээрээ хийгдэнэ.
          </Text>
        </View>

        <Image
          source={mapImageUri ? { uri: mapImageUri } : require("../../assets/images/location1.png")}
          style={styles.heroImage}
          resizeMode={mapImageUri ? "cover" : "contain"}
        />
      </LinearGradient>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Явах хэлбэрээ сонго</Text>
        <Text style={styles.sectionBody}>
          {isRoleLocked
            ? "Энэ урсгалын үүрэг өмнөх алхмаас түгжигдсэн байна."
            : "Жолооч эсвэл зорчигчийн урсгалын алинаар үргэлжлэхээ сонгоорой."}
        </Text>

        <View style={styles.roleRow}>
          <TouchableOpacity
            activeOpacity={0.92}
            disabled={isRoleLocked}
            style={[
              styles.roleButton,
              role === "driver" && styles.roleButtonActive,
              isRoleLocked && role !== "driver" && styles.roleButtonDisabled,
            ]}
            onPress={() => setRole("driver")}
          >
            <Text style={[styles.roleLabel, role === "driver" && styles.roleLabelActive]}>Жолооч</Text>
            <Text style={[styles.roleCaption, role === "driver" && styles.roleCaptionActive]}>
              Маршрут үүсгэж, суудал санал болгоно
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.92}
            disabled={isRoleLocked}
            style={[
              styles.roleButton,
              role === "rider" && styles.roleButtonActive,
              isRoleLocked && role !== "rider" && styles.roleButtonDisabled,
            ]}
            onPress={() => setRole("rider")}
          >
            <Text style={[styles.roleLabel, role === "rider" && styles.roleLabelActive]}>Зорчигч</Text>
            <Text style={[styles.roleCaption, role === "rider" && styles.roleCaptionActive]}>
              Өөрт тохирох аялал хайж захиална
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.selectionCard}>
        <Text style={styles.selectionEyebrow}>Сонгогдсон төлөв</Text>
        <Text style={styles.selectionTitle}>{selectionTitle}</Text>
        <Text style={styles.selectionBody}>{selectionBody}</Text>

        {selected ? (
          <TouchableOpacity activeOpacity={0.9} style={styles.selectionReset} onPress={resetSelection}>
            <Text style={styles.selectionResetText}>Сонголтоо шинэчлэх</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.primaryButton, !role && styles.primaryButtonDisabled]}
        disabled={!role}
        onPress={selected ? goHome : openMap}
      >
        <Text style={styles.primaryButtonText}>
          {selected ? "Үргэлжлүүлэх" : "Газрын зураг руу орох"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.canvas },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 40 },
  heroCard: {
    borderRadius: AppTheme.radius.lg,
    padding: 20,
    marginBottom: 16,
    overflow: "hidden",
    ...AppTheme.shadow.floating,
  },
  heroTextWrap: { maxWidth: 270 },
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
  heroImage: {
    width: "100%",
    height: 184,
    borderRadius: AppTheme.radius.md,
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  sectionCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  sectionBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  roleRow: { marginTop: 16 },
  roleButton: {
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.cardSoft,
    padding: 16,
    marginBottom: 10,
  },
  roleButtonActive: { backgroundColor: AppTheme.colors.accent, borderColor: AppTheme.colors.accent },
  roleButtonDisabled: { opacity: 0.56 },
  roleLabel: { color: AppTheme.colors.text, fontSize: 17, fontWeight: "700" },
  roleLabelActive: { color: AppTheme.colors.white },
  roleCaption: { color: AppTheme.colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  roleCaptionActive: { color: "rgba(255,255,255,0.8)" },
  selectionCard: {
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: AppTheme.radius.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(47,107,83,0.12)",
  },
  selectionEyebrow: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  selectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  selectionBody: { color: AppTheme.colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: 8 },
  selectionReset: {
    alignSelf: "flex-start",
    marginTop: 14,
    backgroundColor: AppTheme.colors.white,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selectionResetText: { color: AppTheme.colors.accentDeep, fontSize: 12, fontWeight: "700" },
  primaryButton: {
    minHeight: 58,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    ...AppTheme.shadow.floating,
  },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: AppTheme.colors.white, fontSize: 16, fontWeight: "700" },
});
