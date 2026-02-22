import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiFetch } from "@/services/apiClient";

export default function RideHistory() {
  const [rides, setRides] = useState<any[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      const data = await apiFetch("/rides/mine");
      const completed = data.filter((r: any) => r.status === "completed");
      setRides(completed);
    };

    loadHistory();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={rides}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={{ textAlign: "center" }}>Түүх алга</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.end_location}</Text>
            <Text style={styles.sub}>
              {item.ride_date} · {item.start_time}
            </Text>
            <Text style={styles.price}>{item.price}₮</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6F5" },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  title: { fontWeight: "600", fontSize: 16 },
  sub: { color: "#6B7280", marginTop: 4 },
  price: { marginTop: 6, fontWeight: "700", color: "#22c55e" },
});
