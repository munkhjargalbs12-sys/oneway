import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { apiFetch } from "../../../services/apiClient";

/**
 * ⚠️ DEV API URL
 * Android emulator: http://10.0.2.2:3000
 * iOS simulator: http://localhost:3000
 */
const API_URL = "http://192.168.1.78:3000";

const weekdays = ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан"];

export default function RideCreationScreen() {
  const params = useLocalSearchParams();

  /** 📍 START / END — SAFE PARSE */
  const start = {
    lat: Number(
      Array.isArray(params.startLat) ? params.startLat[0] : params.startLat
    ),
    lng: Number(
      Array.isArray(params.startLng) ? params.startLng[0] : params.startLng
    ),
  };

  const end = {
    lat: Number(
      Array.isArray(params.endLat) ? params.endLat[0] : params.endLat
    ),
    lng: Number(
      Array.isArray(params.endLng) ? params.endLng[0] : params.endLng
    ),
  };

  const mapImageUri = params.mapImage
    ? `file://${Array.isArray(params.mapImage) ? params.mapImage[0] : params.mapImage}`
    : null;

  // 🪑 Seats
  const [seats, setSeats] = useState(1);
  const maxSeats = 5;

  // 💰 Price
  const [seatPrice, setSeatPrice] = useState(2000);
  const totalPrice = seats * seatPrice;
      // 📍 Destination name (manual)
  const [endLocationName, setEndLocationName] = useState("");
  // ⏰ Date & time
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // 📅 Weekdays
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);

  // 🔁 Backend-д явуулах weekday map
  const WEEKDAY_MAP = ["Mon", "Tue", "Wed", "Thu", "Fri"];

  const toggleWeekday = (index: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  /** 🚀 BACKEND FLOW */
  const ride_date = date.toISOString().split("T")[0];
  const start_time = time.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });

const createRideOnBackend = async () => {
  try {
    console.log("🟡 createRideOnBackend CALLED");
    const days = selectedWeekdays.map((i) => WEEKDAY_MAP[i]);
    console.log("🗓 POST days:", days);

    const routeRes = await fetch(`${API_URL}/route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ start, end }),
    });

    const routeData = await routeRes.json();
    console.log("🟡 routeData:", routeData);

    await apiFetch("/rides", {
  method: "POST",
  body: JSON.stringify({
    start,
    end,
    end_location: endLocationName,
    ride_date,
    start_time,
    polyline: routeData.polyline,
    price: totalPrice,
    seats,
    days,
      }),
    });

    console.log("🟢 POST /rides SENT");
  } catch (err) {
    console.log("❌ createRideOnBackend ERROR:", err);
    throw err;
  }
};


  const confirmRide = async () => {
        // ⛔ Очих газар шалгах
        if (!endLocationName.trim()) {
          Alert.alert("Алдаа", "Очих газраа оруулна уу");
         return; // 👈 ЭНЭ ЧУХАЛ
       }
    console.log("🟢 CONFIRM RIDE CLICKED")
    try {
      await createRideOnBackend();

      router.replace({
        pathname: "/home",
        params: { rideCreated: "true" },
      });
    } catch (err) {
      Alert.alert("Алдаа", "Чиглэл үүсгэхэд алдаа гарлаа");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {mapImageUri && (
        <Image
          source={{ uri: mapImageUri }}
          style={styles.mapImage}
          resizeMode="cover"
        />
      )}

      <Text style={styles.heading}>🚗 Чиглэл үүсгэх</Text>
      {/* Destination name */}
        <View style={styles.row}>
            <Text style={styles.label}>Очих газар:</Text>
        </View>
          <TextInput
             value={endLocationName}
            onChangeText={setEndLocationName}
            placeholder="Жишээ: Сүхбаатарын талбай"
            style={{
            borderWidth: 1,
            borderColor: "#94a3b8",
            borderRadius: 8,
            padding: 10,
            marginBottom: 20,
            backgroundColor: "#fff",
             }}
          />

      {/* Seats */}
      <View style={styles.row}>
        <Text style={styles.label}>Суудал:</Text>
        <View style={styles.seatSelector}>
          <TouchableOpacity
            onPress={() => setSeats((s) => Math.max(1, s - 1))}
            style={styles.seatBtn}
          >
            <Text style={styles.seatBtnText}>-</Text>
          </TouchableOpacity>

          <Text style={styles.seatNumber}>{seats}</Text>

          <TouchableOpacity
            onPress={() => setSeats((s) => Math.min(maxSeats, s + 1))}
            style={styles.seatBtn}
          >
            <Text style={styles.seatBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Seat price */}
      <View style={styles.row}>
        <Text style={styles.label}>Нэг суудлын үнэ:</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={seatPrice.toString()}
          onChangeText={(t) => {
            const num = parseInt(t.replace(/[^0-9]/g, ""), 10);
            if (!isNaN(num)) setSeatPrice(num);
          }}
        />
      </View>

      {/* Total */}
      <View style={styles.row}>
        <Text style={styles.label}>Нийт үнэ:</Text>
        <Text style={styles.value}>{totalPrice.toLocaleString()}₮</Text>
      </View>

      {/* Date */}
      <View style={styles.row}>
        <Text style={styles.label}>Он сар өдөр:</Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          style={styles.timeBtn}
        >
          <Text>{date.toDateString()}</Text>
        </TouchableOpacity>
      </View>

      {/* Time */}
      <View style={styles.row}>
        <Text style={styles.label}>Явах цаг:</Text>
        <TouchableOpacity
          onPress={() => setShowTimePicker(true)}
          style={styles.timeBtn}
        >
          <Text>
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={(_, d) => {
            setShowDatePicker(false);
            if (d) setDate(d);
          }}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={time}
          mode="time"
          is24Hour
          display="default"
          onChange={(_, t) => {
            setShowTimePicker(false);
            if (t) setTime(t);
          }}
        />
      )}

      {/* Weekdays */}
      <Text style={styles.weekdayTitle}>Долоо хоногийн өдөр</Text>
      <View style={styles.weekdayWrap}>
        {weekdays.map((day, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => toggleWeekday(i)}
            style={[
              styles.weekdayBtn,
              selectedWeekdays.includes(i) && styles.weekdayActive,
            ]}
          >
            <Text
              style={{
                color: selectedWeekdays.includes(i) ? "#fff" : "#1e293b",
              }}
            >
              {day}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.confirmBtn} onPress={confirmRide}>
        <Text style={styles.confirmText}>Чиглэл үүсгэх</Text>
      </TouchableOpacity>
    </ScrollView>
    
  );
}

const styles = StyleSheet.create({
  container: 
  { flex: 1, padding: 24, backgroundColor: "#f8fafc" },
  heading: 
  { fontSize: 22, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  mapImage: 
  { width: "100%", height: 200, marginBottom: 16, borderRadius: 12 },
  row: 
  { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  label: 
  { fontSize: 16, fontWeight: "500", color: "#1e293b" },
  value: 
  { fontSize: 16, fontWeight: "600", color: "#2563eb" },
  seatSelector: 
  { flexDirection: "row", alignItems: "center" },
  seatBtn:
   { width: 36, height: 36, borderRadius: 18, backgroundColor: "#2563eb", justifyContent: "center", alignItems: "center" },
  seatBtnText: 
  { color: "#fff", fontSize: 20, fontWeight: "700" },
  seatNumber: { marginHorizontal: 12, fontSize: 16, fontWeight: "600" },
  timeBtn: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#e2e8f0", borderRadius: 8 },
  input: { borderWidth: 1, borderColor: "#94a3b8", borderRadius: 6, padding: 6, width: 100, textAlign: "center" },
  confirmBtn: { marginTop: 40, backgroundColor: "#2563eb", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  confirmText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  weekdayTitle: { marginTop: 16, fontWeight: "600", color: "#1e293b" },
  weekdayWrap: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  weekdayBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 6, marginBottom: 6, backgroundColor: "#e2e8f0" },
  weekdayActive: { backgroundColor: "#2563eb" },
});
