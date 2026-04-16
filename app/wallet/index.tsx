import AppIconBadge from "@/components/AppIconBadge";
import IllustratedEmptyState from "@/components/IllustratedEmptyState";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type WalletSummary = {
  balance: number;
  locked_balance: number;
  available_balance: number;
};

type WalletTransaction = {
  id: string;
  type: string;
  title: string;
  amount: number;
  created_at?: string;
};

const emptyWallet: WalletSummary = {
  balance: 0,
  locked_balance: 0,
  available_balance: 0,
};

export default function Wallet() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletSummary>(emptyWallet);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summary, tx] = await Promise.all([apiFetch("/wallet"), apiFetch("/wallet/transactions")]);

      setWallet({
        balance: Number(summary?.balance || 0),
        locked_balance: Number(summary?.locked_balance || 0),
        available_balance: Number(summary?.available_balance || 0),
      });
      setTransactions(Array.isArray(tx) ? tx : []);
    } catch (err: any) {
      setWallet(emptyWallet);
      setTransactions([]);
      setError(err?.message || "Wallet мэдээлэл ачаалж чадсангүй");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadWallet();
    }, [loadWallet])
  );

  const recentTransactions = transactions.slice(0, 5);
  const summaryCards = useMemo(
    () => [
      { label: "Боломжит", value: wallet.available_balance },
      { label: "Түгжигдсэн", value: wallet.locked_balance },
    ],
    [wallet.available_balance, wallet.locked_balance]
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={recentTransactions}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={[AppTheme.colors.text, AppTheme.colors.accentDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroTopRow}>
                <View>
                  <Text style={styles.heroEyebrow}>Wallet</Text>
                  <Text style={styles.heroTitle}>OW Coin-оо цэгцтэй удирд</Text>
                </View>

                <TouchableOpacity activeOpacity={0.92} onPress={() => router.push("/wallet/history")}>
                  <Text style={styles.historyLink}>Түүх</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.balanceLabel}>Нийт үлдэгдэл</Text>
              <Text style={styles.balanceValue}>{wallet.balance.toLocaleString()} OW</Text>
              <Text style={styles.balanceSub}>≈ {wallet.balance.toLocaleString()}₮</Text>

              <View style={styles.coinWrap}>
                <Image source={require("../../assets/images/owcoin.png")} style={styles.coin} resizeMode="contain" />
              </View>
            </LinearGradient>

            <View style={styles.summaryRow}>
              {summaryCards.map((item) => (
                <View key={item.label} style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <Text style={styles.summaryValue}>{item.value.toLocaleString()} OW</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity activeOpacity={0.92} style={styles.primaryAction} onPress={() => router.push("/wallet/add")}>
                <AppIconBadge name="add-card" theme="light" />
                <Text style={styles.primaryActionText}>Зоос цэнэглэх</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.92} style={styles.secondaryAction} onPress={() => router.push("/wallet/withdraw")}>
                <AppIconBadge name="payments" theme="accent" />
                <Text style={styles.secondaryActionText}>Таталт хийх</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Сүүлийн гүйлгээнүүд</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          </>
        }
        ListEmptyComponent={
          <IllustratedEmptyState
            icon={loading ? "hourglass-empty" : "account-balance-wallet"}
            eyebrow="Wallet Feed"
            title={loading ? "Уншиж байна..." : "Гүйлгээ одоогоор алга"}
            body="Цэнэглэлт, таталт, төлбөрийн хөдөлгөөн орж ирэх бүрт энэ хэсэг шинэчлэгдэнэ."
            tone="gold"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.transactionCard}>
            <View style={styles.transactionTextWrap}>
              <Text style={styles.transactionTitle}>{item.title}</Text>
              <Text style={styles.transactionDate}>
                {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
              </Text>
            </View>
            <Text
              style={[
                styles.transactionAmount,
                { color: item.amount > 0 ? AppTheme.colors.accentDeep : AppTheme.colors.danger },
              ]}
            >
              {item.amount > 0 ? "+" : ""}
              {item.amount.toLocaleString()} OW
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
  },
  listContent: {
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
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
    maxWidth: 240,
  },
  historyLink: {
    color: AppTheme.colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 13,
    marginTop: 18,
  },
  balanceValue: {
    color: AppTheme.colors.white,
    fontSize: 34,
    fontWeight: "700",
    marginTop: 6,
    fontFamily: AppFontFamily,
  },
  balanceSub: {
    color: "rgba(255,255,255,0.82)",
    marginTop: 4,
  },
  coinWrap: {
    position: "absolute",
    right: 18,
    bottom: 18,
  },
  coin: {
    width: 58,
    height: 58,
  },
  summaryRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
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
    fontSize: 16,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  primaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginRight: 10,
  },
  primaryActionText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  secondaryAction: {
    flex: 1,
    minHeight: 52,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.card,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  secondaryActionText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  sectionHeader: {
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  errorText: {
    color: AppTheme.colors.danger,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  emptyTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  emptyBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  transactionCard: {
    backgroundColor: AppTheme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: AppTheme.radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  transactionTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  transactionTitle: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  transactionDate: {
    color: AppTheme.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  transactionAmount: {
    fontWeight: "700",
    fontSize: 14,
  },
});
