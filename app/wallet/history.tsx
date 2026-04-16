import IllustratedEmptyState from "@/components/IllustratedEmptyState";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

type WalletTransaction = {
  id: string;
  title: string;
  amount: number;
  created_at?: string;
};

export default function History() {
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch("/wallet/transactions");
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setItems([]);
      setError(err?.message || "Түүх ачаалж чадсангүй");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory])
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <LinearGradient
              colors={[AppTheme.colors.accentDeep, AppTheme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={styles.heroEyebrow}>Wallet History</Text>
              <Text style={styles.heroTitle}>Бүх гүйлгээгээ нэг дор хар</Text>
              <Text style={styles.heroBody}>
                Цэнэглэлт, таталт, шилжүүлэг бүр timestamp-тэйгээр энд хадгалагдана.
              </Text>
            </LinearGradient>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </>
        }
        ListEmptyComponent={
          <IllustratedEmptyState
            icon={loading ? "hourglass-empty" : "receipt-long"}
            eyebrow="Wallet History"
            title={loading ? "Уншиж байна..." : "Гүйлгээний түүх алга"}
            body="Wallet дээр хөдөлгөөн үүсэх үед энд шинэ мөрүүдээр нэмэгдэнэ."
            tone="gold"
            style={styles.emptyCard}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.itemCard}>
            <View style={styles.textWrap}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDate}>
                {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
              </Text>
            </View>
            <Text
              style={[
                styles.itemAmount,
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
  errorText: {
    color: AppTheme.colors.danger,
    marginTop: 14,
  },
  emptyCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 16,
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
  itemCard: {
    backgroundColor: AppTheme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: AppTheme.radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  textWrap: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  itemDate: {
    color: AppTheme.colors.textMuted,
    marginTop: 4,
    fontSize: 11,
  },
  itemAmount: {
    fontWeight: "700",
  },
});
