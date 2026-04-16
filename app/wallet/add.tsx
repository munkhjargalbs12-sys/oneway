import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import { playActionSuccessSound } from "@/services/notificationSound";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function AddCredit() {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(10000);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const presets = [10000, 20000, 50000];
  const finalAmount = selectedAmount !== null ? selectedAmount : Number(customAmount);

  const summaryText = useMemo(() => `${Number(finalAmount || 0).toLocaleString()} OW`, [finalAmount]);

  const submitTopup = async () => {
    if (!Number.isFinite(finalAmount) || finalAmount <= 0) {
      Alert.alert("Алдаа", "Цэнэглэх дүнгээ зөв оруулна уу");
      return;
    }

    try {
      setLoading(true);
      await apiFetch("/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amount: finalAmount }),
      });

      void playActionSuccessSound();
      Alert.alert("Амжилттай", `${finalAmount.toLocaleString()} OW нэмэгдлээ`);
      router.replace("/wallet");
    } catch (err: any) {
      Alert.alert("Алдаа", err?.message || "Зоос цэнэглэж чадсангүй");
    } finally {
      setLoading(false);
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
        <Text style={styles.heroEyebrow}>Top Up</Text>
        <Text style={styles.heroTitle}>Wallet-аа хурдан цэнэглэ</Text>
        <Text style={styles.heroBody}>
          Урьдчилан бэлдсэн дүнгээс сонгох эсвэл өөрийн хүссэн хэмжээгээр OW Coin нэмнэ.
        </Text>
      </LinearGradient>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Санал болгож буй дүн</Text>
        <View style={styles.presetGrid}>
          {presets.map((amount) => (
            <TouchableOpacity
              key={amount}
              activeOpacity={0.92}
              onPress={() => {
                setSelectedAmount(amount);
                setCustomAmount("");
              }}
              style={[styles.presetCard, selectedAmount === amount && styles.presetCardActive]}
            >
              <Text style={[styles.presetAmount, selectedAmount === amount && styles.presetAmountActive]}>
                {amount.toLocaleString()} OW
              </Text>
              <Text style={[styles.presetSub, selectedAmount === amount && styles.presetSubActive]}>
                ≈ {amount.toLocaleString()}₮
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Өөр дүн оруулах</Text>
        <TextInput
          placeholder="0"
          placeholderTextColor={AppTheme.colors.textMuted}
          keyboardType="numeric"
          value={customAmount}
          onChangeText={(text) => {
            setSelectedAmount(null);
            setCustomAmount(text);
          }}
          style={styles.input}
        />
        <Text style={styles.helperText}>1 OW = 1₮</Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Сонгосон дүн</Text>
        <Text style={styles.summaryValue}>{summaryText}</Text>
      </View>

      <TouchableOpacity
        disabled={!finalAmount || loading}
        style={[styles.primaryButton, (!finalAmount || loading) && styles.primaryButtonDisabled]}
        onPress={submitTopup}
      >
        <Text style={styles.primaryButtonText}>{loading ? "Түр хүлээнэ үү..." : "Үргэлжлүүлэх"}</Text>
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
  sectionCard: {
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
  },
  presetGrid: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  presetCard: {
    width: "48%",
    backgroundColor: AppTheme.colors.cardSoft,
    padding: 18,
    borderRadius: AppTheme.radius.md,
    marginRight: "4%",
    marginBottom: 12,
  },
  presetCardActive: {
    backgroundColor: AppTheme.colors.accent,
  },
  presetAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: AppTheme.colors.text,
  },
  presetAmountActive: {
    color: AppTheme.colors.white,
  },
  presetSub: {
    marginTop: 6,
    color: AppTheme.colors.textMuted,
  },
  presetSubActive: {
    color: "rgba(255,255,255,0.84)",
  },
  input: {
    marginTop: 14,
    backgroundColor: AppTheme.colors.white,
    color: AppTheme.colors.text,
    padding: 15,
    borderRadius: AppTheme.radius.md,
    fontSize: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  helperText: {
    marginTop: 10,
    color: AppTheme.colors.textMuted,
    fontSize: 12,
  },
  summaryCard: {
    backgroundColor: AppTheme.colors.cardSoft,
    padding: 18,
    borderRadius: AppTheme.radius.lg,
    marginTop: 16,
  },
  summaryLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
  },
  summaryValue: {
    color: AppTheme.colors.text,
    fontSize: 26,
    fontWeight: "700",
    fontFamily: AppFontFamily,
    marginTop: 8,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    ...AppTheme.shadow.floating,
  },
  primaryButtonDisabled: {
    opacity: 0.55,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
    fontSize: 16,
  },
});
