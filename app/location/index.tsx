import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

export default function LocationScreen() {
  const [manual, setManual] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<
    | { source: "gps"; lat: string; lng: string }
    | { source: "manual"; location: string }
    | { source: "map"; lat: string; lng: string }
    | null
  >(null);
const params = useLocalSearchParams<{
  source?: string;
  lat?: string;
  lng?: string;
  mapImage?: string;
}>();
 
const [areaText, setAreaText] = useState<string | null>(null);
useEffect(() => {
  if (
    params.source !== "map" ||
    !params.lat ||
    !params.lng
  ) return;

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
      const khoroo = addr.subregion ?? "";

      setAreaText(
        `${city} ${district} дүүрэг, ${khoroo}`
      );
    }
  })();

}, [params.source, params.lat, params.lng]);


 // 📡 GPS
// GPS
async function useGPS() {
  try {
    setLoading(true);

    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Байршлын зөвшөөрөл хэрэгтэй");
      return;
    }

    // 1️⃣ GPS координат
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const lat = loc.coords.latitude.toString();
    const lng = loc.coords.longitude.toString();

    // 2️⃣ 🔥 ЭНД reverseGeocode
    const result = await Location.reverseGeocodeAsync({
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
    });

    if (result.length > 0) {
      const addr = result[0];
      const city = addr.city ?? "Улаанбаатар";
      const district = addr.district ?? "";
      const khoroo = addr.subregion ?? "";

      setAreaText(
        `${city} ${district} дүүрэг, ${khoroo}`
      );
    }

    // 3️⃣ Сонголт хадгалах
    setSelected({
      source: "gps",
      lat,
      lng,
    });

    // 4️⃣ Map screen рүү оруулах
    router.push({
      pathname: "/location/map",
      params: {
        source: "gps",
        lat,
        lng,
      },
    });

  } catch (e) {
    Alert.alert("GPS байршил авч чадсангүй");
  } finally {
    setLoading(false);
  }
}




  // ✍️ Manual
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

  function goHome() {
    if (!selected) {
      Alert.alert("Эхлээд байршлаа сонгоно уу");
      return;
    }

    router.replace({
      pathname: "/home",
      params: selected,
    });
  }

  return (
    <View style={styles.container}>
     {params.mapImage ? (
  <Image
    source={{ uri: params.mapImage }}
    style={styles.location1}
    resizeMode="cover"
  />
) : (
  <Image
    source={require("../../assets/images/location1.png")}
    style={styles.location1}
    resizeMode="contain"
  />
)}
{selected && selected.source !== "manual" && (
  <Text style={{ textAlign: "center", marginBottom: 8 }}>
    📍 Таны байршил
  </Text>
)}
{areaText && (
  <Text
    style={{
      textAlign: "center",
      color: "#6B7280",
      marginBottom: 12,
    }}
  >
    {areaText}
  </Text>
)}

      {/* HEADER */}
      <Text style={styles.title}>📍 Та хаанаас явах вэ?</Text>
      <Text style={styles.hint}>Та хаанаас хөдлөх вэ,
        Явж эхлэх байршлаа сонгоно уу
      </Text>

      {/* SELECTED INFO */}
      {selected && (
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedText}>
            {selected.source === "gps" && "📡 Та хэрвээ одоо байгаа газар явах замаа тодорхойлох бол (GPS)"}
            {selected.source === "manual" &&
              `✍️ ${selected.location}`}
            {selected.source === "map" &&
              "🗺 Газрын зургаас сонгосон"}
          </Text>
        </View>
      )}

      {/* GPS CARD */}
      <TouchableOpacity
        style={[
          styles.card,
          selected?.source === "gps" && styles.selected,
        ]}
        onPress={useGPS}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator />
        ) : (
          <Text style={styles.cardText}>
            📡 Одоогийн байршлаа ашиглах
          </Text>
        )}
      </TouchableOpacity>

      {/* MANUAL */}
      <Text style={styles.label}>✍️ Өөр газраас явах байршилаа тодорхойлох бол</Text>

      <TextInput
        placeholder="Жишээ:Яамарагийн  эцэс"
        value={manual}
        onChangeText={setManual}
        onSubmitEditing={useManual}
        style={styles.input}
      />

      {/* CONTINUE */}
      <TouchableOpacity
        style={[
          styles.button,
          !selected && { opacity: 0.5 },
        ]}
        disabled={!selected}
        onPress={goHome}
      >
        <Text style={styles.buttonText}>Үргэлжлүүлэх</Text>
      </TouchableOpacity>

      {/* MAP */}
      <TouchableOpacity
        onPress={() => router.push("/location/map")}
        style={styles.mapBtn}
      >
        <Text style={styles.mapText}>
          🗺 Газрын зургаас сонгох
        </Text>
      </TouchableOpacity>
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

  card: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },

  selected: {
    borderWidth: 2,
    borderColor: "#4CAF8C",
  },

  cardText: {
    fontSize: 16,
    fontWeight: "600",
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
  location1: {
  width: "100%",
  height: 220,
  marginBottom: 12,
},

});
