import { AppFontFamily, AppTheme } from "@/constants/theme";
import { API_URL } from "@/services/config";
import { playRideCreatedSound } from "@/services/notificationSound";
import { formatOfficialAddressFromGeocode } from "@/services/rideLocations";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { apiFetch } from "../../../services/apiClient";

const weekdays = ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан"];
const WEEKDAY_MAP = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const DEFAULT_START_DELAY_MINUTES = 15;
const MIN_START_LEAD_MINUTES = 5;

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function getDefaultRideStartDate() {
  const value = new Date(Date.now() + DEFAULT_START_DELAY_MINUTES * 60 * 1000);
  value.setSeconds(0, 0);
  return value;
}

function formatLocalDate(value: Date) {
  return [
    value.getFullYear(),
    padDatePart(value.getMonth() + 1),
    padDatePart(value.getDate()),
  ].join("-");
}

function formatLocalTime(value: Date) {
  return [padDatePart(value.getHours()), padDatePart(value.getMinutes())].join(":");
}

function buildRideStartDate(rideDate: string, startTime: string) {
  const dateParts = rideDate.split("-").map((part) => Number(part));
  const timeParts = startTime.split(":").map((part) => Number(part));
  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;

  if (
    dateParts.length !== 3 ||
    timeParts.length < 2 ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    !Number.isInteger(hour) ||
    !Number.isInteger(minute)
  ) {
    return null;
  }

  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  if (
    Number.isNaN(value.getTime()) ||
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day ||
    value.getHours() !== hour ||
    value.getMinutes() !== minute
  ) {
    return null;
  }

  return value;
}

function getRideTimeValidationMessage(rideDate: string, startTime: string, now = new Date()) {
  const rideStartDate = buildRideStartDate(rideDate, startTime);

  if (!rideStartDate) {
    return "Огноо эсвэл цагийн мэдээлэл буруу байна. Дахин сонгоно уу.";
  }

  const minimumStartDate = new Date(now.getTime() + MIN_START_LEAD_MINUTES * 60 * 1000);
  if (rideStartDate.getTime() < minimumStartDate.getTime()) {
    return `Эхлэх цаг өнгөрсөн эсвэл хэт ойрхон байна. Одоо цагаас дор хаяж ${MIN_START_LEAD_MINUTES} минутын дараах цаг сонгоно уу.`;
  }

  return null;
}

function isCoordinateLikeLabel(value: unknown) {
  return /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(String(value || "").trim());
}

export default function RideCreationScreen() {
  const params = useLocalSearchParams();
  const startLabelParam = Array.isArray(params.startLabel) ? params.startLabel[0] : params.startLabel;
  const startAddressParam = Array.isArray(params.startAddress) ? params.startAddress[0] : params.startAddress;
  const endLabelParam = Array.isArray(params.endLabel) ? params.endLabel[0] : params.endLabel;
  const endAddressParam = Array.isArray(params.endAddress) ? params.endAddress[0] : params.endAddress;
  const endNameParam = Array.isArray(params.endName) ? params.endName[0] : params.endName;
  const startLatParam = Array.isArray(params.startLat) ? params.startLat[0] : params.startLat;
  const startLngParam = Array.isArray(params.startLng) ? params.startLng[0] : params.startLng;
  const endLatParam = Array.isArray(params.endLat) ? params.endLat[0] : params.endLat;
  const endLngParam = Array.isArray(params.endLng) ? params.endLng[0] : params.endLng;

  const start = useMemo(
    () => ({
      lat: Number(startLatParam),
      lng: Number(startLngParam),
    }),
    [startLatParam, startLngParam]
  );

  const end = useMemo(
    () => ({
      lat: Number(endLatParam),
      lng: Number(endLngParam),
    }),
    [endLatParam, endLngParam]
  );

  const mapImageParam = Array.isArray(params.mapImage) ? params.mapImage[0] : params.mapImage;
  const mapImageUri =
    typeof mapImageParam === "string" && mapImageParam.length > 0
      ? mapImageParam.startsWith("file://")
        ? mapImageParam
        : `file://${mapImageParam}`
      : null;

  const [seats, setSeats] = useState(1);
  const maxSeats = 5;
  const [seatPrice, setSeatPrice] = useState(2000);
  const [startLocationName, setStartLocationName] = useState("");
  const [startOfficialAddress, setStartOfficialAddress] = useState(
    typeof startAddressParam === "string"
      ? startAddressParam
      : typeof startLabelParam === "string" && !isCoordinateLikeLabel(startLabelParam)
        ? startLabelParam
        : ""
  );
  const [endOfficialAddress, setEndOfficialAddress] = useState(
    typeof endAddressParam === "string"
      ? endAddressParam
      : typeof endLabelParam === "string" && !isCoordinateLikeLabel(endLabelParam)
        ? endLabelParam
        : ""
  );
  const [endLocationName, setEndLocationName] = useState(
    typeof endNameParam === "string" ? endNameParam : ""
  );
  const [date, setDate] = useState(getDefaultRideStartDate);
  const [time, setTime] = useState(getDefaultRideStartDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([]);
  const [vehicleId, setVehicleId] = useState<number | null>(null);

  const pickVehicleId = (value: any): number | null => {
    const payload = Array.isArray(value) ? value[0] : value?.vehicle ?? value?.data ?? value;
    const id = Number(payload?.id);
    return Number.isFinite(id) && id > 0 ? id : null;
  };

  const toggleWeekday = (index: number) => {
    setSelectedWeekdays((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    );
  };

  const rideDate = formatLocalDate(date);
  const startTime = formatLocalTime(time);

  const createRideOnBackend = async () => {
    try {
      if (!vehicleId) {
        throw new Error("No vehicle selected. Please register a vehicle first.");
      }

      const days = selectedWeekdays.map((index) => WEEKDAY_MAP[index]);
      const normalizedStartLocationName = startLocationName.trim();
      const normalizedEndLocationName = endLocationName.trim();

      const routeRes = await fetch(`${API_URL}/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end }),
      });

      const routeData = await routeRes.json();

      await apiFetch("/rides", {
        method: "POST",
        body: JSON.stringify({
          start,
          end,
          start_location: normalizedStartLocationName,
          start_address: startOfficialAddress.trim(),
          start_place_name: normalizedStartLocationName,
          end_location: normalizedEndLocationName,
          end_address: endOfficialAddress.trim(),
          end_place_name: normalizedEndLocationName,
          ride_date: rideDate,
          start_time: startTime,
          polyline: routeData.polyline,
          price: seatPrice,
          seats,
          vehicle_id: vehicleId,
          days,
        }),
      });
    } catch (error) {
      console.log("createRideOnBackend ERROR:", error);
      throw error;
    }
  };

  const confirmRide = async () => {
    if (!startLocationName.trim()) {
      Alert.alert("Алдаа", "Эхлэх цэгийн нэршлээ оруулна уу");
      return;
    }

    if (!endLocationName.trim()) {
      Alert.alert("Алдаа", "Очих газрын нэршлээ оруулна уу");
      return;
    }

    const timeValidationMessage = getRideTimeValidationMessage(rideDate, startTime);
    if (timeValidationMessage) {
      Alert.alert("Цагийн тохиргоо буруу", timeValidationMessage);
      return;
    }

    try {
      if (!vehicleId) {
        Alert.alert("Алдаа", "Машин бүртгэгдээгүй байна. Машин бүртгэнэ үү.");
        router.push("/vehicle/add");
        return;
      }

      await createRideOnBackend();
      await playRideCreatedSound();

      router.replace({
        pathname: "/home",
        params: {
          rideCreated: "true",
          locationReminder: "create",
        },
      });
    } catch (error: any) {
      Alert.alert(
        "Алдаа",
        String(error?.message || "").trim() || "Чиглэл үүсгэхэд алдаа гарлаа"
      );
    }
  };

  const initVehicle = useCallback(async () => {
    try {
      const value = await apiFetch("/vehicles/me");
      setVehicleId(pickVehicleId(value));
    } catch (error) {
      console.log("Failed to load vehicle", error);
    }
  }, []);

  useEffect(() => {
    initVehicle();
  }, [initVehicle]);

  useEffect(() => {
    let cancelled = false;

    async function resolveAddress(
      point: { lat: number; lng: number },
      currentValue: string,
      setter: (value: string) => void,
      fallback: string
    ) {
      if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || currentValue.trim()) {
        return;
      }

      try {
        const result = await Location.reverseGeocodeAsync({
          latitude: point.lat,
          longitude: point.lng,
        });
        if (cancelled) return;

        const nextAddress = formatOfficialAddressFromGeocode(result[0], fallback);
        if (nextAddress) {
          setter(nextAddress);
        }
      } catch {
        if (!cancelled && fallback.trim()) {
          setter(fallback.trim());
        }
      }
    }

    void resolveAddress(
      start,
      startOfficialAddress,
      setStartOfficialAddress,
      typeof startLabelParam === "string" && !isCoordinateLikeLabel(startLabelParam)
        ? startLabelParam
        : ""
    );
    void resolveAddress(
      end,
      endOfficialAddress,
      setEndOfficialAddress,
      typeof endLabelParam === "string" && !isCoordinateLikeLabel(endLabelParam)
        ? endLabelParam
        : ""
    );

    return () => {
      cancelled = true;
    };
  }, [
    end,
    endLabelParam,
    endOfficialAddress,
    start,
    startLabelParam,
    startOfficialAddress,
  ]);

  useFocusEffect(
    useCallback(() => {
      initVehicle();
    }, [initVehicle])
  );

  const formattedDate = useMemo(
    () =>
      date.toLocaleDateString("mn-MN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [date]
  );

  const formattedTime = useMemo(
    () =>
      time.toLocaleTimeString("mn-MN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [time]
  );

  const repeatText = useMemo(() => {
    if (selectedWeekdays.length === 0) return "Нэг удаагийн аялал";
    return selectedWeekdays.map((index) => weekdays[index]).join(", ");
  }, [selectedWeekdays]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <LinearGradient
        colors={[AppTheme.colors.accentDeep, AppTheme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroEyebrow}>Ride Setup</Text>
        <Text style={styles.heroTitle}>Маршрутын дэлгэрэнгүйг бөглөнө үү</Text>
        <Text style={styles.heroBody}>
          Суудал, үнэ, цагийн мэдээллээ оруулснаар аялал бусдад харагдахад бэлэн болно.
        </Text>

        {mapImageUri ? (
          <Image source={{ uri: mapImageUri }} style={styles.heroImage} resizeMode="cover" />
        ) : null}
      </LinearGradient>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Суудал</Text>
          <Text style={styles.summaryValue}>{seats}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>1 суудлын үнэ</Text>
          <Text style={styles.summaryValue}>{seatPrice.toLocaleString()}₮</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Давтамж</Text>
          <Text style={styles.summaryValueSmall}>{selectedWeekdays.length ? "Давтамжтай" : "Нэг удаа"}</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Эхлэх цэгийн нэршил</Text>
        <Text style={styles.sectionBody}>
          Албан ёсны байршлыг map-аас авна. Харин зорчигч таныг олоход туслах яг уулзах цэгийн нэршлийг гараар бичнэ.
        </Text>
        <View style={styles.officialAddressBox}>
          <Text style={styles.officialAddressLabel}>Албан ёсны эхлэх хаяг</Text>
          <Text style={styles.officialAddressValue}>
            {startOfficialAddress || "Байршлын мэдээлэл авч байна..."}
          </Text>
        </View>
        <TextInput
          value={startLocationName}
          onChangeText={setStartLocationName}
          placeholder="Жишээ: 34-р байрны зүүн талын зогсоол"
          placeholderTextColor={AppTheme.colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Очих газрын нэршил</Text>
        <Text style={styles.sectionBody}>
          Албан ёсны очих хаягийг сонгосон байршлаас авна. Доор нь хэрэглэгчдэд ойлгомжтой богино нэршлээ бичнэ.
        </Text>
        <View style={styles.officialAddressBox}>
          <Text style={styles.officialAddressLabel}>Албан ёсны очих хаяг</Text>
          <Text style={styles.officialAddressValue}>
            {endOfficialAddress || "Байршлын мэдээлэл авч байна..."}
          </Text>
        </View>
        <TextInput
          value={endLocationName}
          onChangeText={setEndLocationName}
          placeholder="Жишээ: Цэцэг төвийн урд хаалга"
          placeholderTextColor={AppTheme.colors.textMuted}
          style={styles.input}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Суудал ба үнэ</Text>
        <Text style={styles.sectionBody}>
          Нэг зорчигчийн үнэ болон санал болгох суудлын тоогоо энд тохируулна.
        </Text>

        <View style={styles.rowBetween}>
          <Text style={styles.fieldLabel}>Нээлттэй суудал</Text>
          <View style={styles.seatSelector}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSeats((value) => Math.max(1, value - 1))}
              style={styles.seatButton}
            >
              <Text style={styles.seatButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.seatNumber}>{seats}</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setSeats((value) => Math.min(maxSeats, value + 1))}
              style={styles.seatButton}
            >
              <Text style={styles.seatButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.fieldLabel}>Нэг суудлын үнэ</Text>
          <TextInput
            style={styles.priceInput}
            keyboardType="numeric"
            value={seatPrice.toString()}
            onChangeText={(text) => {
              const cleaned = text.replace(/[^0-9]/g, "");
              setSeatPrice(cleaned ? parseInt(cleaned, 10) : 0);
            }}
          />
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Зарт харагдах үнэ</Text>
          <Text style={styles.totalValue}>{seatPrice.toLocaleString()}₮</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Цагийн тохиргоо</Text>
        <Text style={styles.sectionBody}>
          Зорчигчдод хамгийн ойлгомжтой schedule харагдах тул огноо, цагийг нягтлаарай.
        </Text>

        <View style={styles.rowBetween}>
          <Text style={styles.fieldLabel}>Огноо</Text>
          <TouchableOpacity activeOpacity={0.92} onPress={() => setShowDatePicker(true)} style={styles.pickerButton}>
            <Text style={styles.pickerButtonText}>{formattedDate}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.rowBetween}>
          <Text style={styles.fieldLabel}>Хөдлөх цаг</Text>
          <TouchableOpacity activeOpacity={0.92} onPress={() => setShowTimePicker(true)} style={styles.pickerButton}>
            <Text style={styles.pickerButtonText}>{formattedTime}</Text>
          </TouchableOpacity>
        </View>

        {showDatePicker ? (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(_, value) => {
              setShowDatePicker(false);
              if (value) setDate(value);
            }}
          />
        ) : null}

        {showTimePicker ? (
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour
            display="default"
            onChange={(_, value) => {
              setShowTimePicker(false);
              if (value) setTime(value);
            }}
          />
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Давтамж</Text>
        <Text style={styles.sectionBody}>
          Нэг удаагийн аялал бол хоосон орхи. Давтамжтай бол ажиллах өдрүүдээ сонгоорой.
        </Text>

        <View style={styles.weekdayWrap}>
          {weekdays.map((day, index) => {
            const active = selectedWeekdays.includes(index);
            return (
              <TouchableOpacity
                key={day}
                activeOpacity={0.92}
                onPress={() => toggleWeekday(index)}
                style={[styles.weekdayButton, active && styles.weekdayButtonActive]}
              >
                <Text style={[styles.weekdayText, active && styles.weekdayTextActive]}>{day}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.repeatCard}>
          <Text style={styles.repeatLabel}>Сонгосон төлөв</Text>
          <Text style={styles.repeatValue}>{repeatText}</Text>
        </View>
      </View>

      <View style={[styles.vehicleCard, !vehicleId && styles.vehicleCardWarning]}>
        <Text style={styles.vehicleTitle}>{vehicleId ? "Машин холбогдсон" : "Машин бүртгэх шаардлагатай"}</Text>
        <Text style={styles.vehicleBody}>
          {vehicleId
            ? "Аялал үүсгэхэд ашиглах машин тань системд бэлэн байна."
            : "Чиглэл нийтлэхийн өмнө дор хаяж нэг машин нэмэх хэрэгтэй."}
        </Text>
      </View>

      <TouchableOpacity activeOpacity={0.92} style={styles.confirmButton} onPress={confirmRide}>
        <Text style={styles.confirmButtonText}>Чиглэлээ нийтлэх</Text>
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
    padding: 20,
    overflow: "hidden",
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
  heroImage: {
    width: "100%",
    height: 190,
    borderRadius: AppTheme.radius.md,
    marginTop: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  summaryRow: {
    flexDirection: "row",
    marginTop: 16,
    marginBottom: 2,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  summaryLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  summaryValue: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  summaryValueSmall: {
    color: AppTheme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  sectionBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  officialAddressBox: {
    marginTop: 14,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.cardSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  officialAddressLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginBottom: 5,
  },
  officialAddressValue: {
    color: AppTheme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },
  input: {
    marginTop: 16,
    backgroundColor: AppTheme.colors.white,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 15,
    color: AppTheme.colors.text,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  fieldLabel: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  seatSelector: {
    flexDirection: "row",
    alignItems: "center",
  },
  seatButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: AppTheme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  seatButtonText: {
    color: AppTheme.colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
  seatNumber: {
    marginHorizontal: 14,
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  priceInput: {
    minWidth: 120,
    backgroundColor: AppTheme.colors.white,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: "center",
    color: AppTheme.colors.text,
  },
  totalCard: {
    marginTop: 16,
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
  },
  totalValue: {
    color: AppTheme.colors.accentDeep,
    fontSize: 20,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  pickerButton: {
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 150,
    alignItems: "center",
  },
  pickerButtonText: {
    color: AppTheme.colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  weekdayWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
  },
  weekdayButton: {
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  weekdayButtonActive: {
    backgroundColor: AppTheme.colors.accent,
  },
  weekdayText: {
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  weekdayTextActive: {
    color: AppTheme.colors.white,
  },
  repeatCard: {
    marginTop: 8,
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  repeatLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    marginBottom: 6,
  },
  repeatValue: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  vehicleCard: {
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  vehicleCardWarning: {
    backgroundColor: "#fbefd7",
    borderColor: "#ead8b6",
  },
  vehicleTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  vehicleBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  confirmButton: {
    minHeight: 58,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    ...AppTheme.shadow.floating,
  },
  confirmButtonText: {
    color: AppTheme.colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
