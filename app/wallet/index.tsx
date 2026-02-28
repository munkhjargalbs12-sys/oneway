import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const mockTransactions = [
  { id: "1", type: "income", title: "Ride income", amount: 1800 },
  { id: "2", type: "commission", title: "Commission", amount: -200 },
  { id: "3", type: "topup", title: "Top up", amount: 10000 },
];

export default function Wallet() {
  const router = useRouter(); // ✅ Hook component дотор

  const balance = 45000;
  const locked = 8000;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Wallet</Text>

        <TouchableOpacity onPress={() => router.push("/wallet/history")}>
          <Text style={styles.historyLink}>Түүх</Text>
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <LinearGradient
        colors={["#0B3B8C", "#1E5BFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.balanceLabel}>Байгаа зоос</Text>
        <Text style={styles.balance}>{balance.toLocaleString()} OW</Text>
        <Text style={styles.convert}>≈ {balance.toLocaleString()}₮</Text>

        {locked > 0 && (
          <Text style={styles.locked}>
            {locked.toLocaleString()} OW Захиалга хийгдсэн
          </Text>
        )}

        <View style={styles.coinWrapper}>
          <Image
            source={require("../../assets/images/owcoin.png")}
            style={styles.coin}
            resizeMode="contain"
          />
        </View>
      </LinearGradient>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/wallet/add")}
        >
          <Text style={styles.actionText}>🪙 Зоос цэнэглэх</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/wallet/withdraw")}
        >
          <Text style={styles.actionText}>💸 Таталт хийх</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions */}
      <Text style={styles.sectionTitle}>Суудал захиалсан </Text>

      <FlatList
        data={mockTransactions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.transactionItem}>
            <Text style={styles.transactionTitle}>{item.title}</Text>
            <Text
              style={[
                styles.transactionAmount,
                { color: item.amount > 0 ? "#22C55E" : "#EF4444" },
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
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },

  header: {
    fontSize: 26,
    fontWeight: "700",
    color: "white",
  },

  historyLink: {
    color: "#60A5FA",
    fontWeight: "600",
  },

  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
  },

  balanceLabel: {
    color: "#CBD5E1",
    fontSize: 14,
  },

  balance: {
    color: "white",
    fontSize: 32,
    fontWeight: "700",
    marginTop: 5,
  },

  convert: {
    color: "#E2E8F0",
    marginTop: 4,
  },

  locked: {
    marginTop: 10,
    color: "#FACC15",
    fontWeight: "600",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },

  actionButton: {
    backgroundColor: "#1E293B",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: "48%",
    alignItems: "center",
  },

  actionText: {
    color: "white",
    fontWeight: "600",
  },

  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 10,
  },

  transactionItem: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  transactionTitle: {
    color: "#E2E8F0",
  },

  transactionAmount: {
    fontWeight: "600",
  },

  coinWrapper: {
    position: "absolute",
    top: 15,
    right: 15,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },

  coin: {
    width: 50,
    height: 50,
  },
});