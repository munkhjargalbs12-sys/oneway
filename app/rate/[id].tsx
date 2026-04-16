import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import { playActionSuccessSound } from "@/services/notificationSound";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function RateRide() {
  const { id, rideId, toUserId } = useLocalSearchParams<{
    id?: string;
    rideId?: string;
    toUserId: string;
  }>();
  const effectiveRideId = rideId ?? id;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submitRating = async () => {
    if (!effectiveRideId || !toUserId) {
      Alert.alert("Алдаа", "Ride эсвэл хэрэглэгчийн мэдээлэл дутуу байна");
      return;
    }

    try {
      await apiFetch("/ratings", {
        method: "POST",
        body: JSON.stringify({
          ride_id: effectiveRideId,
          to_user_id: toUserId,
          rating,
          comment,
        }),
      });

      void playActionSuccessSound();
      Alert.alert("Баярлалаа!", "Таны үнэлгээ хадгалагдлаа");
      router.replace("/(tabs)/home");
    } catch {
      Alert.alert("Алдаа", "Үнэлгээ хадгалахад алдаа гарлаа");
    }
  };

  return (
    <View style={styles.safe}>
      <LinearGradient
        colors={[AppTheme.colors.accentDeep, AppTheme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroEyebrow}>Rate Trip</Text>
        <Text style={styles.heroTitle}>Жолоочийн туршлагыг үнэлнэ үү</Text>
        <Text style={styles.heroBody}>
          Таны үнэлгээ дараагийн зорчигчдод итгэл өгөхөөс гадна жолоочийн чанарын түвшинг тодорхойлно.
        </Text>
      </LinearGradient>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Одны үнэлгээ</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((value) => (
            <TouchableOpacity key={value} activeOpacity={0.92} onPress={() => setRating(value)}>
              <Text style={[styles.star, rating >= value && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Сэтгэгдэл</Text>
        <TextInput
          placeholder="Туршлагаа товч хуваалцаарай..."
          placeholderTextColor={AppTheme.colors.textMuted}
          style={styles.input}
          multiline
          value={comment}
          onChangeText={setComment}
        />

        <TouchableOpacity activeOpacity={0.92} style={styles.primaryButton} onPress={submitRating}>
          <Text style={styles.primaryButtonText}>Илгээх</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  heroCard: {
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 22,
    paddingVertical: 24,
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
    fontSize: 20,
    fontWeight: "700",
    fontFamily: AppFontFamily,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 22,
  },
  star: {
    fontSize: 42,
    color: "#d7d1c6",
    marginHorizontal: 8,
  },
  starActive: {
    color: AppTheme.colors.gold,
  },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.md,
    padding: 14,
    height: 120,
    marginBottom: 20,
    textAlignVertical: "top",
    backgroundColor: AppTheme.colors.white,
    color: AppTheme.colors.text,
  },
  primaryButton: {
    backgroundColor: AppTheme.colors.accent,
    padding: 15,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
});
