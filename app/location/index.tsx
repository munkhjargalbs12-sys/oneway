import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { apiFetch } from "@/services/apiClient";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Role = "driver" | "rider";
type SelectedLocation =
  | { source: "gps"; lat: string; lng: string }
  | { source: "manual"; location: string }
  | { source: "map"; lat: string; lng: string };

export default function LocationScreen() {
  const [manual, setManual] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [selected, setSelected] = useState<SelectedLocation | null>(null);
  const [areaText, setAreaText] = useState<string | null>(null);

  const params = useLocalSearchParams<{
    source?: string;
    lat?: string;
    lng?: string;
    mapImage?: string;
    role?: string;
  }>();

  const isRoleLocked = params.role === "driver" || params.role === "rider";

  useEffect(() => {
    if (params.role === "driver" || params.role === "rider") {
      setRole(params.role);
    }
  }, [params.role]);

  useEffect(() => {
    if (params.source !== "map" || !params.lat || !params.lng) return;

    setSelected({
      source: "map",
      lat: params.lat,
      lng: params.lng,
    });

    (async () => {
      const result = await Location.reverseGeocodeAsync({
        latitude: Number(params.lat),
        longitude: Number(params.lng),
      });

      if (result.length > 0) {
        const addr = result[0];
        const city = addr.city ?? "Улаанбаатар";
        const district = addr.district ?? "";
        const sub = addr.subregion ?? "";
        setAreaText(`${city} ${district} дүүрэг, ${sub}`);
      }
    })();
  }, [params.source, params.lat, params.lng]);

  function useManual() {
    if (!manual.trim()) {
      Alert.alert("Байршил оруулна уу");
      return;
    }

    setSelected({
      source: "manual",
      location: manual.trim(),
    });
  }

  async function ensureDriverRole() {
    try {
      const me = await apiFetch("/users/me");
      if (me?.role === "driver") return true;

      const res = await apiFetch("/auth/role", {
        method: "POST",
        body: JSON.stringify({ role: "driver" }),
      });

      return !!res?.success || res?.role === "driver";
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
      if (selected.source !== "gps" && selected.source !== "map") {
        Alert.alert("Жолооч горим", "Жолооч бол GPS эсвэл map байршил сонгоно уу");
        return;
      }

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
          role,
        },
      });
      return;
    }

    if (selected.source === "gps" || selected.source === "map") {
      router.replace({
        pathname: "/rides",
        params: {
          role,
          source: selected.source,
          lat: selected.lat,
          lng: selected.lng,
          location: areaText ?? "",
        },
      });
      return;
    }

    router.replace({
      pathname: "/rides",
      params: {
        role,
        source: "manual",
        location: selected.location,
      },
    });
  }

  return (
    <View style={styles.container}>
      {params.mapImage ? (
        <Image source={{ uri: params.mapImage }} style={styles.locationImage} resizeMode="cover" />
      ) : (
        <Image
          source={require("../../assets/images/location1.png")}
          style={styles.locationImage}
          resizeMode="contain"
        />
      )}

      {selected && selected.source !== "manual" && (
        <Text style={{ textAlign: "center", marginBottom: 8 }}>📍 Таны байршил</Text>
      )}

      {areaText && (
        <Text style={{ textAlign: "center", color: "#6B7280", marginBottom: 12 }}>{areaText}</Text>
      )}

      {!selected && (
        <>
          <Text style={styles.title}>📍 Та хаанаас явах вэ?</Text>
          <Text style={styles.hint}>Та хаанаас хөдөлөх вэ, явж эхлэх байршлаа сонгоно уу</Text>
        </>
      )}

      {isRoleLocked ? (
        <View style={styles.roleRow}>
          <View style={[styles.roleBtn, styles.roleActive]}>
            <Text style={styles.roleText}>{role === "driver" ? "Жолооч" : "Зорчигч"}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === "driver" && styles.roleActive]}
            onPress={() => setRole("driver")}
          >
            <Text style={styles.roleText}>Жолооч</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleBtn, role === "rider" && styles.roleActive]}
            onPress={() => setRole("rider")}
          >
            <Text style={styles.roleText}>Зорчигч</Text>
          </TouchableOpacity>
        </View>
      )}

      {selected && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedText}>
            {selected.source === "gps" && "📡 GPS ашигласан"}
            {selected.source === "manual" && `✍️ ${selected.location}`}
            {selected.source === "map" && "🗺 Газрын зургаас сонгосон"}
          </Text>
        </View>
      )}

      {!selected && (
        <>
          <Text style={styles.label}>✍️ Өөр газраас явах байршил</Text>

          <TextInput
            placeholder="Жишээ: Яармагийн эцэс"
            value={manual}
            onChangeText={setManual}
            onSubmitEditing={useManual}
            style={styles.input}
          />
        </>
      )}

      {!selected && (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/location/map",
              params: {
                ...(role ? { role } : {}),
              },
            })
          }
          style={styles.mapBtn}
        >
          <Text style={styles.mapText}>🗺 Газрын зургаас сонгох</Text>
        </TouchableOpacity>
      )}

      <View style={styles.bottomWrap}>
        <TouchableOpacity
          style={[styles.button, (!selected || !role) && { opacity: 0.5 }]}
          disabled={!selected || !role}
          onPress={goHome}
        >
          <Text style={styles.buttonText}>Үргэлжлүүлэх</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8F7",
    padding: 24,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },

  hint: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
  },

  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  roleBtn: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },

  roleActive: {
    borderColor: "#4CAF8C",
    backgroundColor: "#E8F5F1",
  },

  roleText: {
    fontWeight: "700",
    color: "#1F2937",
  },

  selectedInfo: {
    backgroundColor: "#E8F5F1",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },

  selectedText: {
    fontSize: 14,
    color: "#065F46",
  },

  label: {
    fontWeight: "600",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },

  button: {
    backgroundColor: "#4CAF8C",
    padding: 16,
    borderRadius: 28,
    alignItems: "center",
  },

  bottomWrap: {
    marginTop: "auto",
    paddingTop: 12,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  mapBtn: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#ECFEFF",
  },

  mapText: {
    fontSize: 16,
    textAlign: "center",
  },

  locationImage: {
    width: "100%",
    height: 220,
    marginBottom: 12,
  },
});
