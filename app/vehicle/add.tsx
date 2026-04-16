import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import { playActionSuccessSound } from "@/services/notificationSound";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PLACEHOLDER_COLOR = AppTheme.colors.textMuted;
const CYRILLIC_PLATE_REGEX = /^[\u0400-\u04FF]{3}\d{4}$/u;

function normalizePlateInput(value: string) {
  const upper = value.toUpperCase();
  const letters = (upper.match(/[\u0400-\u04FF]/gu) ?? []).slice(0, 3).join("");
  const digits = (upper.match(/\d/g) ?? []).slice(0, 4).join("");
  return `${letters}${digits}`;
}

function isValidPlate(value: string) {
  return CYRILLIC_PLATE_REGEX.test(value);
}

export default function AddVehicleScreen() {
  const params = useLocalSearchParams();
  const modeParam = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const isEditMode = modeParam === "edit";

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");
  const [seats, setSeats] = useState("4");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(isEditMode);

  const seatCount = useMemo(() => Math.max(1, Number(seats) || 4), [seats]);
  const isPlateReady = isValidPlate(plate);

  useEffect(() => {
    if (!isEditMode) {
      setInitializing(false);
      return;
    }

    let active = true;

    const loadVehicle = async () => {
      try {
        const vehicle = await apiFetch("/vehicles/me");
        if (!active) return;

        if (!vehicle) {
          Alert.alert("Мэдээлэл алга", "Засах машин олдсонгүй.");
          router.back();
          return;
        }

        setBrand(String(vehicle.brand || ""));
        setModel(String(vehicle.model || ""));
        setColor(String(vehicle.color || ""));
        setPlate(normalizePlateInput(String(vehicle.plate_number || "")));
        setSeats(String(vehicle.seats || 4));
      } catch (error) {
        if (!active) return;
        Alert.alert(
          "Алдаа",
          error instanceof Error ? error.message : "Машины мэдээлэл ачаалж чадсангүй."
        );
        router.back();
      } finally {
        if (active) {
          setInitializing(false);
        }
      }
    };

    void loadVehicle();

    return () => {
      active = false;
    };
  }, [isEditMode]);

  const submitVehicle = async () => {
    const normalizedPlate = normalizePlateInput(plate);

    if (!brand.trim() || !model.trim() || !normalizedPlate) {
      Alert.alert("Алдаа", "Бүх шаардлагатай мэдээллээ бөглөнө үү");
      return;
    }

    if (!isValidPlate(normalizedPlate)) {
      Alert.alert(
        "Алдаа",
        "Улсын дугаар 3 кирилл үсэг, дараа нь 4 тоо байх ёстой. Жишээ: УБА1234"
      );
      return;
    }

    try {
      setLoading(true);
      setPlate(normalizedPlate);

      await apiFetch(isEditMode ? "/vehicles/me" : "/vehicles", {
        method: isEditMode ? "PATCH" : "POST",
        body: JSON.stringify({
          brand: brand.trim(),
          model: model.trim(),
          color: color.trim(),
          plate_number: normalizedPlate,
          seats: seatCount,
        }),
      });

      void playActionSuccessSound();
      Alert.alert(
        "Амжилттай",
        isEditMode
          ? "Машины мэдээлэл шинэчлэгдлээ. Баталгаажуулалтыг дахин шалгах хэрэгтэй байж болно."
          : "Машин амжилттай бүртгэгдлээ"
      );
      router.back();
    } catch (error) {
      Alert.alert(
        "Алдаа",
        error instanceof Error
          ? error.message
          : isEditMode
            ? "Машины мэдээлэл шинэчлэхэд алдаа гарлаа"
            : "Машин бүртгэхэд алдаа гарлаа"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.safe}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[AppTheme.colors.accentDeep, AppTheme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroEyebrow}>Driver Setup</Text>
        <Text style={styles.heroTitle}>
          {isEditMode
            ? "Машины мэдээллээ засаад профайлаа шинэчил"
            : "Машинаа бүртгээд жолоочийн урсгалаа идэвхжүүл"}
        </Text>
        <Text style={styles.heroBody}>
          {isEditMode
            ? "Улсын дугаар эсвэл машины мэдээлэл буруу орсон бол эндээс засна. Шинэчилсний дараа баталгаажуулалт дахин шаардагдаж болно."
            : "Машины үндсэн мэдээллээ нэг удаа оруулахад аялал үүсгэх үед шууд ашиглагдана."}
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{seatCount}</Text>
            <Text style={styles.heroStatLabel}>Суудал</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{isPlateReady ? "Бэлэн" : "Шалгана"}</Text>
            <Text style={styles.heroStatLabel}>Улсын дугаар</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Тээврийн хэрэгслийн мэдээлэл</Text>
        <Text style={styles.sectionBody}>
          {isEditMode
            ? "Засах шаардлагатай талбаруудаа шинэчлээд хадгална уу."
            : "Доорх талбаруудыг бөглөөд жолоочийн profile дээр машинаа холбоно."}
        </Text>

        {initializing ? (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Машины мэдээлэл ачаалж байна...</Text>
          </View>
        ) : null}

        <Field
          label="Марка"
          placeholder="Жишээ: Toyota"
          value={brand}
          onChangeText={setBrand}
        />

        <Field
          label="Модель"
          placeholder="Жишээ: Prius 30"
          value={model}
          onChangeText={setModel}
        />

        <Field
          label="Өнгө"
          placeholder="Жишээ: Цагаан"
          value={color}
          onChangeText={setColor}
        />

        <Field
          label="Улсын дугаар"
          placeholder="Жишээ: УБА1234"
          value={plate}
          autoCapitalize="characters"
          maxLength={7}
          onChangeText={(value) => setPlate(normalizePlateInput(value))}
        />
        <Text style={styles.fieldHint}>
          Эхний 3 тэмдэгт кирилл үсэг, дараагийн 4 тэмдэгт зөвхөн тоо байна.
        </Text>

        <View style={styles.rowBetween}>
          <Text style={styles.label}>Суудлын тоо</Text>
          <View style={styles.seatSelector}>
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.seatButton}
              onPress={() => setSeats(String(Math.max(1, seatCount - 1)))}
            >
              <Text style={styles.seatButtonText}>-</Text>
            </TouchableOpacity>

            <TextInput
              placeholder="4"
              placeholderTextColor={PLACEHOLDER_COLOR}
              style={styles.seatInput}
              keyboardType="number-pad"
              value={seats}
              onChangeText={setSeats}
            />

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.seatButton}
              onPress={() => setSeats(String(Math.min(8, seatCount + 1)))}
            >
              <Text style={styles.seatButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Зөвлөгөө</Text>
        <Text style={styles.tipText}>
          {isEditMode
            ? "Улсын дугаар засварласны дараа profile хэсгээс баталгаажуулалтаа дахин илгээвэл зөв."
            : "Бүртгэлийн дараа profile хэсгээс машинаа баталгаажуулснаар итгэлийн түвшин нэмэгдэнэ."}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.primaryButton, (loading || initializing) && styles.primaryButtonDisabled]}
        onPress={submitVehicle}
        disabled={loading || initializing}
      >
        <Text style={styles.primaryButtonText}>
          {loading
            ? "Хадгалж байна..."
            : isEditMode
              ? "Машины мэдээлэл шинэчлэх"
              : "Машин хадгалах"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize,
  maxLength,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  maxLength?: number;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={PLACEHOLDER_COLOR}
        style={styles.input}
        value={value}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
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
  heroStatsRow: {
    flexDirection: "row",
    marginTop: 18,
  },
  heroStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginRight: 10,
  },
  heroStatValue: {
    color: AppTheme.colors.white,
    fontSize: 20,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.74)",
    fontSize: 12,
    marginTop: 6,
  },
  formCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    padding: 18,
    marginTop: 16,
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
    marginBottom: 6,
  },
  loadingCard: {
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.md,
    backgroundColor: AppTheme.colors.cardSoft,
  },
  loadingText: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
  },
  fieldWrap: {
    marginTop: 14,
  },
  label: {
    color: AppTheme.colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: AppTheme.colors.text,
    backgroundColor: AppTheme.colors.white,
  },
  fieldHint: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
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
  seatInput: {
    width: 70,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: "center",
    color: AppTheme.colors.text,
    backgroundColor: AppTheme.colors.white,
  },
  tipCard: {
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: AppTheme.radius.lg,
    padding: 18,
    marginTop: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  tipTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  tipText: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: AppTheme.colors.accent,
    minHeight: 58,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    ...AppTheme.shadow.floating,
  },
  primaryButtonDisabled: {
    opacity: 0.58,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
});
