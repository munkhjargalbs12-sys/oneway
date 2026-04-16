import { AppFontFamily, AppTheme } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Role() {
  const params = useLocalSearchParams();
  const [role, setRole] = useState<"driver" | "rider" | null>(null);

  return (
    <View style={styles.safe}>
      <LinearGradient
        colors={[AppTheme.colors.accentDeep, AppTheme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Image
          source={require("../assets/images/role-header.png")}
          style={styles.heroImage}
          resizeMode="contain"
        />
        <Text style={styles.heroEyebrow}>Choose Mode</Text>
        <Text style={styles.heroTitle}>Та одоохондоо ямар байдлаар ашиглах вэ?</Text>
        <Text style={styles.heroBody}>
          Жолооч эсвэл зорчигчийн урсгалыг сонгосноор дараагийн байршлын алхам автоматаар тохирно.
        </Text>
      </LinearGradient>

      <View style={styles.cardGrid}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.optionCard, role === "driver" && styles.optionCardActive]}
          onPress={() => setRole("driver")}
        >
          <Image source={require("../assets/images/driver.png")} style={styles.cardImage} resizeMode="contain" />
          <Text style={[styles.optionTitle, role === "driver" && styles.optionTitleActive]}>Машинтай</Text>
          <Text style={[styles.optionText, role === "driver" && styles.optionTextActive]}>
            Би бусдыг замдаа хамт авч явна
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[styles.optionCard, role === "rider" && styles.optionCardActive]}
          onPress={() => setRole("rider")}
        >
          <Image source={require("../assets/images/rider.png")} style={styles.cardImage} resizeMode="contain" />
          <Text style={[styles.optionTitle, role === "rider" && styles.optionTitleActive]}>Машингүй</Text>
          <Text style={[styles.optionText, role === "rider" && styles.optionTextActive]}>
            Би тохирох унаа хайж хамт явна
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.primaryButton, !role && styles.primaryButtonDisabled]}
        disabled={!role}
        onPress={() =>
          router.push({
            pathname: "/location",
            params: { ...params, role },
          })
        }
      >
        <Text style={styles.primaryButtonText}>Үргэлжлүүлэх</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
  },
  heroCard: {
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 22,
    paddingVertical: 22,
    ...AppTheme.shadow.floating,
  },
  heroImage: {
    width: "100%",
    height: 180,
    marginBottom: 14,
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
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  heroBody: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  cardGrid: {
    marginTop: 16,
  },
  optionCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    ...AppTheme.shadow.card,
  },
  optionCardActive: {
    backgroundColor: AppTheme.colors.accent,
    borderColor: AppTheme.colors.accent,
  },
  cardImage: {
    width: 104,
    height: 104,
    marginBottom: 12,
  },
  optionTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  optionTitleActive: {
    color: AppTheme.colors.white,
  },
  optionText: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  optionTextActive: {
    color: "rgba(255,255,255,0.84)",
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: "auto",
    ...AppTheme.shadow.floating,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
