import { useRouter } from "expo-router";
import React from "react";
import {
    FlatList,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from "react-native";

const mockHistory = [
  { id: "1", title: "Ride Income", amount: 1800 },
  { id: "2", title: "Commission", amount: -200 },
  { id: "3", title: "Top Up", amount: 10000 },
  { id: "4", title: "Withdrawal", amount: -5000 },
];

export default function History() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Transaction History</Text>

      <FlatList
        data={mockHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.title}>{item.title}</Text>
            <Text
              style={[
                styles.amount,
                { color: item.amount > 0 ? "#22C55E" : "#EF4444" },
              ]}
            >
              {item.amount > 0 ? "+" : ""}
              {item.amount.toLocaleString()} OW
            </Text>
          </View>
        )}
      />

      <Text
        style={styles.back}
        onPress={() => router.back()}
      >
        ← Back
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "white",
    marginBottom: 20,
  },
  item: {
    backgroundColor: "#1E293B",
    padding: 18,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  title: {
    color: "#E2E8F0",
  },
  amount: {
    fontWeight: "700",
  },
  back: {
    marginTop: 20,
    color: "#60A5FA",
    textAlign: "center",
  },
});