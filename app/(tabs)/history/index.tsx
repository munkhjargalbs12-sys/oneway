import { apiFetch } from "@/services/apiClient";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";


function extractBookedRideIds(payload: any): number[] {
  const raw =
    (Array.isArray(payload?.ride_ids) && payload.ride_ids) ||
    (Array.isArray(payload?.bookings) && payload.bookings) ||
    (Array.isArray(payload?.items) && payload.items) ||
    (Array.isArray(payload) && payload) ||
    [];

  const ids = raw
    .map((entry: any) => Number(entry?.ride_id ?? entry?.ride?.id ?? entry?.id ?? entry))
    .filter((id: number) => Number.isFinite(id));

  return Array.from(new Set(ids));
}
export default function RideHistory() {
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const [myBookings, allRides] = await Promise.all([
          apiFetch("/bookings/mine").catch(() => ({ ride_ids: [] })),
          apiFetch("/rides").catch(() => []),
        ]);

        const bookedIds = extractBookedRideIds(myBookings);

        const matched = Array.isArray(allRides)
          ? allRides.filter((r: any) => bookedIds.includes(Number(r?.id)))
          : [];

        const sorted = matched.sort((a: any, b: any) => {
          const aTs = new Date(`${a?.ride_date || ""} ${a?.start_time || ""}`).getTime();
          const bTs = new Date(`${b?.ride_date || ""} ${b?.start_time || ""}`).getTime();
          return bTs - aTs;
        });

        setRides(sorted);
      } catch (err) {
        console.log("History load error", err);
        setRides([]);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  return (
    <View style={styles.safe}>
      <Text style={styles.headerTitle}>Таны түүх</Text>
      <FlatList
        data={rides}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center" }}>
            {loading ? "Уншиж байна..." : "Түүх алга"}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.month}>{getMonthLabel(item.ride_date)}</Text>
            <Text style={styles.title}>Очих газар: {item.end_location || "Тодорхойгүй"}</Text>
            <Text style={styles.sub}>
              Огноо: {item.ride_date || "-"} · Цаг: {item.start_time || "-"}
            </Text>
            <Text style={styles.price}>Суудал: {item.price ?? 0}₮</Text>
            <Text style={styles.booked}>✓ Суудал захиалсан</Text>
            <Text style={styles.pending}>⏳ Жолооч баталгаажуулаагүй</Text>
          </View>
        )}
      />
    </View>
  );
}

function getMonthLabel(dateValue?: string) {
  if (!dateValue) return "Огноо тодорхойгүй";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Огноо тодорхойгүй";

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year} оны ${month} сар`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6F5" },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  month: {
    fontSize: 11,
    color: "#64748b",
    marginBottom: 4,
  },
  title: { fontWeight: "600", fontSize: 16 },
  sub: { color: "#6B7280", marginTop: 4 },
  price: { marginTop: 6, fontWeight: "700", color: "#22c55e" },
  booked: { marginTop: 6, fontSize: 12, fontWeight: "700", color: "#16a34a" },
  pending: { marginTop: 2, fontSize: 12, color: "#64748b" },
});

