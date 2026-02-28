import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function AddCredit() {
  const router = useRouter();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(10000);
  const [customAmount, setCustomAmount] = useState("");

  const presets = [10000, 20000];

  const finalAmount =
    selectedAmount !== null ? selectedAmount : Number(customAmount);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Зоос цэнэглэх</Text>

      {/* Preset Buttons */}
      <View style={styles.presetRow}>
        {presets.map((amount) => (
          <TouchableOpacity
            key={amount}
            onPress={() => {
              setSelectedAmount(amount);
              setCustomAmount("");
            }}
            style={[
              styles.presetCard,
              selectedAmount === amount && styles.activePreset,
            ]}
          >
            <Text style={styles.presetAmount}>
              {amount.toLocaleString()} OW
            </Text>
            <Text style={styles.presetSub}>
              Төлөх: {amount.toLocaleString()}₮
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Custom Input */}
      <View style={styles.customCard}>
        <Text style={styles.customLabel}>Бусад</Text>
        <TextInput
          placeholder="0"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          value={customAmount}
          onChangeText={(text) => {
            setSelectedAmount(null);
            setCustomAmount(text);
          }}
          style={styles.input}
        />
        <Text style={styles.customSub}>
          Төлөх: {Number(customAmount || 0).toLocaleString()}₮
        </Text>
      </View>

      {/* Info */}
      <Text style={styles.infoText}>
        1 OW = 1₮ • QPay үйлчилгээний шимтгэл нэг удаа
      </Text>

      {/* Continue Button */}
      <TouchableOpacity
        disabled={!finalAmount}
        style={{ marginTop: 20 }}
        onPress={() => {
          // TODO: Backend payment integration
          console.log("Proceed payment:", finalAmount);
        }}
      >
        <LinearGradient
          colors={["#1E5BFF", "#0B3B8C"]}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Үргэлжлүүлэх</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
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
  presetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  presetCard: {
    width: "48%",
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 16,
  },
  activePreset: {
    backgroundColor: "#FACC15",
  },
  presetAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  presetSub: {
    marginTop: 5,
    color: "#CBD5E1",
  },
  customCard: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 16,
  },
  customLabel: {
    color: "white",
    marginBottom: 10,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#0F172A",
    color: "white",
    padding: 15,
    borderRadius: 10,
    fontSize: 18,
  },
  customSub: {
    marginTop: 10,
    color: "#CBD5E1",
  },
  infoText: {
    marginTop: 20,
    color: "#94A3B8",
    fontSize: 12,
  },
  button: {
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16,
  },
});