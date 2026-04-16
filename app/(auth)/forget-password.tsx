import { AppFontFamily, AppTheme } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function ForgotPasswordScreen() {
  const [phone, setPhone] = useState("");

  const handleSend = () => {
    Alert.alert("Мэдэгдэл", "OTP илгээх backend урсгалыг дараагийн алхмаар холбоно.");
  };

  return (
    <View style={styles.safe}>
      <LinearGradient
        colors={[AppTheme.colors.accentDeep, AppTheme.colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroEyebrow}>Recovery</Text>
        <Text style={styles.heroTitle}>Нууц үгээ сэргээх</Text>
        <Text style={styles.heroBody}>
          Бүртгэлтэй утасны дугаараа оруулаад баталгаажуулах кодын урсгал руу шилжинэ.
        </Text>
      </LinearGradient>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>Утасны дугаар</Text>
        <Text style={styles.sectionBody}>
          Таны аккаунттай холбоотой дугаарыг зөв оруулах нь сэргээх кодыг зөв илгээхэд чухал.
        </Text>

        <TextInput
          placeholder="Утасны дугаар"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholderTextColor={AppTheme.colors.textMuted}
          style={styles.input}
        />

        <TouchableOpacity activeOpacity={0.92} style={styles.primaryButton} onPress={handleSend}>
          <Text style={styles.primaryButtonText}>Код илгээх</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.92} style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Буцах</Text>
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
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: AppTheme.colors.white,
    color: AppTheme.colors.text,
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 56,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.accent,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.cardSoft,
  },
  secondaryButtonText: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
