import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert } from "react-native";
import { apiFetch } from "@/services/apiClient";

export default function RateRide() {
  const { id, rideId, toUserId } = useLocalSearchParams<{
    id?: string;
    rideId?: string;
    toUserId: string;
  }>();
  const effectiveRideId = rideId ?? id;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submitRating = async () => {
    if (!effectiveRideId || !toUserId) {
      Alert.alert("Алдаа", "Ride эсвэл хэрэглэгчийн мэдээлэл дутуу байна");
      return;
    }

    try {
      await apiFetch("/ratings", {
        method: "POST",
        body: JSON.stringify({
          ride_id: effectiveRideId,
          to_user_id: toUserId,
          rating,
          comment,
        }),
      });

      Alert.alert("Баярлалаа!", "Таны үнэлгээ хадгалагдлаа");
      router.replace("/(tabs)/home");
    } catch {
      Alert.alert("Алдаа", "Үнэлгээ хадгалахад алдаа гарлаа");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Жолоочийг үнэлнэ үү</Text>

      <View style={styles.stars}>
        {[1,2,3,4,5].map(n => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Text style={[styles.star, rating >= n && styles.starActive]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        placeholder="Сэтгэгдэл бичих..."
        style={styles.input}
        multiline
        value={comment}
        onChangeText={setComment}
      />

      <TouchableOpacity style={styles.button} onPress={submitRating}>
        <Text style={styles.buttonText}>Илгээх</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  stars: { flexDirection: "row", justifyContent: "center", marginBottom: 20 },
  star: { fontSize: 36, color: "#ccc", marginHorizontal: 6 },
  starActive: { color: "#facc15" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    height: 100,
    marginBottom: 20,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
