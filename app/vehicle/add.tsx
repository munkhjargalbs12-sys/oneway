import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
// Safe area handled by root layout
import { apiFetch } from "@/services/apiClient";
import { router } from "expo-router";

export default function AddVehicleScreen() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [color, setColor] = useState("");
  const [plate, setPlate] = useState("");
  const [seats, setSeats] = useState("4");
  const [loading, setLoading] = useState(false);

  const submitVehicle = async () => {
    if (!brand || !model || !plate) {
      Alert.alert("Алдаа", "Бүх мэдээллийг бөглөнө үү");
      return;
    }

    try {
      setLoading(true);

      await apiFetch("/vehicles", {
        method: "POST",
        body: JSON.stringify({
          brand,
          model,
          color,
          plate_number: plate,
          seats: Number(seats),
        }),
      });

      Alert.alert("Амжилттай", "Машин бүртгэгдлээ");
      router.back();
    } catch (err) {
      Alert.alert("Алдаа", "Машин бүртгэхэд алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🚘 Машин бүртгэх</Text>

        <TextInput
          placeholder="Марка (Toyota, Prius...)"
          style={styles.input}
          value={brand}
          onChangeText={setBrand}
        />

        <TextInput
          placeholder="Модель"
          style={styles.input}
          value={model}
          onChangeText={setModel}
        />

        <TextInput
          placeholder="Өнгө"
          style={styles.input}
          value={color}
          onChangeText={setColor}
        />

        <TextInput
          placeholder="Дугаар (1234 УНН)"
          style={styles.input}
          value={plate}
          onChangeText={setPlate}
        />

        <TextInput
          placeholder="Суудлын тоо"
          style={styles.input}
          keyboardType="number-pad"
          value={seats}
          onChangeText={setSeats}
        />

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={submitVehicle}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Хадгалж байна..." : "Хадгалах"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 20 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    fontSize: 14,
  },
  button: {
    backgroundColor: "#22c55e",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
