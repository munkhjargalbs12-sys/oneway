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

export default function Withdraw() {
  const router = useRouter();
  const [amount, setAmount] = useState("");

  const balance = 45000; // mock
  const withdrawAmount = Number(amount || 0);
  const fee = Math.floor(withdrawAmount * 0.01); // 1% fee
  const receive = withdrawAmount - fee;

  const isValid =
    withdrawAmount > 0 && withdrawAmount <= balance;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Withdraw</Text>

      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balance}>{balance.toLocaleString()} OW</Text>
      </View>

      <View style={styles.inputCard}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor="#94A3B8"
          style={styles.input}
        />

        {withdrawAmount > 0 && (
          <>
            <Text style={styles.feeText}>
              Bank Fee (1%): {fee.toLocaleString()} OW
            </Text>
            <Text style={styles.receiveText}>
              You will receive: {receive.toLocaleString()} OW
            </Text>
          </>
        )}
      </View>

      <TouchableOpacity
        disabled={!isValid}
        onPress={() => console.log("Withdraw:", withdrawAmount)}
      >
        <LinearGradient
          colors={isValid ? ["#1E5BFF", "#0B3B8C"] : ["#334155", "#334155"]}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Confirm Withdraw</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={{ marginTop: 15 }}
        onPress={() => router.back()}
      >
        <Text style={styles.back}>← Back</Text>
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
  balanceBox: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  balanceLabel: {
    color: "#CBD5E1",
  },
  balance: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
    marginTop: 5,
  },
  inputCard: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 16,
    marginBottom: 25,
  },
  label: {
    color: "white",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#0F172A",
    padding: 15,
    borderRadius: 12,
    color: "white",
    fontSize: 18,
  },
  feeText: {
    marginTop: 10,
    color: "#FACC15",
  },
  receiveText: {
    marginTop: 5,
    color: "#22C55E",
    fontWeight: "600",
  },
  button: {
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "700",
  },
  back: {
    color: "#60A5FA",
    textAlign: "center",
  },
});