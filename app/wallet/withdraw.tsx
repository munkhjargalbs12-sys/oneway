import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import { playActionSuccessSound } from "@/services/notificationSound";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Withdraw() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadWallet = useCallback(async () => {
    setLoading(true);

    try {
      const wallet = await apiFetch("/wallet");
      setBalance(Number(wallet?.available_balance ?? wallet?.balance ?? 0));
    } catch (err: any) {
      setBalance(0);
      Alert.alert("Алдаа", err?.message || "Wallet ачаалж чадсангүй");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWallet();
    }, [loadWallet])
  );

  const withdrawAmount = Number(amount || 0);
  const fee = Math.floor(withdrawAmount * 0.01);
  const receive = Math.max(withdrawAmount - fee, 0);
  const isValid = Number.isFinite(withdrawAmount) && withdrawAmount > 0 && withdrawAmount <= balance;

  const submitWithdraw = async () => {
    if (!isValid) {
      Alert.alert("Алдаа", "Таталтын дүн буруу байна");
      return;
    }

    try {
      setSubmitting(true);
      const result = await apiFetch("/wallet/withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: withdrawAmount }),
      });

      void playActionSuccessSound();
      Alert.alert(
        "Амжилттай",
        `${withdrawAmount.toLocaleString()} OW татлаа. Шимтгэл: ${Number(result?.fee || fee).toLocaleString()} OW`
      );
      router.replace("/wallet");
    } catch (err: any) {
      Alert.alert("Алдаа", err?.message || "Таталт хийж чадсангүй");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.safe}>
      <LinearGradient
        colors={[AppTheme.colors.text, AppTheme.colors.accentDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroEyebrow}>Withdraw</Text>
        <Text style={styles.heroTitle}>OW Coin-оо татах</Text>
        <Text style={styles.heroBody}>
          Боломжит үлдэгдлээсээ дүнгээ оруулаад таталтын шимтгэл болон хүлээн авах дүнгээ урьдчилан харна.
        </Text>
      </LinearGradient>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Боломжит үлдэгдэл</Text>
        <Text style={styles.balanceValue}>
          {loading ? "Уншиж байна..." : `${balance.toLocaleString()} OW`}
        </Text>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.sectionTitle}>Таталтын дүн</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={AppTheme.colors.textMuted}
          style={styles.input}
        />

        {withdrawAmount > 0 ? (
          <View style={styles.breakdownCard}>
            <Text style={styles.breakdownText}>Шимтгэл (1%): {fee.toLocaleString()} OW</Text>
            <Text style={styles.breakdownStrong}>Танд очих дүн: {receive.toLocaleString()} OW</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity
        disabled={!isValid || submitting || loading}
        onPress={submitWithdraw}
        style={[styles.primaryButton, (!isValid || submitting || loading) && styles.primaryButtonDisabled]}
      >
        <Text style={styles.primaryButtonText}>{submitting ? "Түр хүлээнэ үү..." : "Confirm Withdraw"}</Text>
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
  balanceCard: {
    backgroundColor: AppTheme.colors.card,
    padding: 18,
    borderRadius: AppTheme.radius.lg,
    marginTop: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  balanceLabel: {
    color: AppTheme.colors.textMuted,
    fontSize: 12,
  },
  balanceValue: {
    color: AppTheme.colors.text,
    fontSize: 24,
    fontWeight: "700",
    fontFamily: AppFontFamily,
    marginTop: 8,
  },
  inputCard: {
    backgroundColor: AppTheme.colors.card,
    padding: 18,
    borderRadius: AppTheme.radius.lg,
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
  input: {
    marginTop: 14,
    backgroundColor: AppTheme.colors.white,
    padding: 15,
    borderRadius: AppTheme.radius.md,
    color: AppTheme.colors.text,
    fontSize: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  breakdownCard: {
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: AppTheme.radius.md,
    padding: 14,
    marginTop: 14,
  },
  breakdownText: {
    color: AppTheme.colors.warning,
    fontSize: 13,
  },
  breakdownStrong: {
    color: AppTheme.colors.accentDeep,
    fontSize: 14,
    fontWeight: "700",
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
  },
});
