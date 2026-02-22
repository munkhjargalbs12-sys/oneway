import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { apiFetch } from "@/services/apiClient";

export default function NotificationsScreen() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    try {
      const data = await apiFetch("/notifications");
      setItems(data);
    } catch (err) {
      console.log("❌ notif load error", err);
    }
  };

  const markRead = async (id: number) => {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    load();
  };

  useEffect(() => {
    load();
  }, []);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.card, !item.is_read && styles.unread]}
      onPress={() => markRead(item.id)}
    >
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
      <Text style={styles.time}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={{ textAlign: "center", marginTop: 40 }}>Notification байхгүй</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F8FAFC" },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  unread: {
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  title: { fontWeight: "700", marginBottom: 4 },
  body: { color: "#475569" },
  time: { marginTop: 6, fontSize: 12, color: "#94A3B8" },
});
