import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { apiFetch } from "../services/apiClient";
export default function Role() {
  const params = useLocalSearchParams();
  const [role, setRole] = useState<"driver" | "rider" | null>(null);

  return (
    <View style={styles.container}>
      {/* HEADER IMAGE */}
      <Image
        source={require("../assets/images/role-header.png")}
        style={styles.headerImage}
        resizeMode="contain"
      />

      {/* TITLE */}
      <Text style={styles.title}>Та аль нь вэ?</Text>
      <Text style={styles.subtitle}>
        Та одоохондоо аль байдлаар ашиглах вэ
      </Text>

      {/* ROLE CARDS */}
      <View style={styles.cardRow}>
        {/* DRIVER */}
        <TouchableOpacity
          style={[styles.card, role === "driver" && styles.selected]}
          onPress={() => setRole("driver")}
          activeOpacity={0.9}
        >
          <Image
            source={require("../assets/images/driver.png")}
            style={styles.cardImage}
            resizeMode="contain"
          />
          <Text style={styles.cardTitle}>Машинтай</Text>
          <Text style={styles.cardDesc}>
            Би бусдыг хамт авч явна
          </Text>
        </TouchableOpacity>

        {/* RIDER */}
        <TouchableOpacity
          style={[styles.card, role === "rider" && styles.selected]}
          onPress={() => setRole("rider")}
          activeOpacity={0.9}
        >
          <Image
            source={require("../assets/images/rider.png")}
            style={styles.cardImage}
            resizeMode="contain"
          />
          <Text style={styles.cardTitle}>Машингүй</Text>
          <Text style={styles.cardDesc}>
            Би хамт явах хүн хайж байна
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTINUE */}
      <TouchableOpacity
        style={[styles.button, !role && { opacity: 0.4 }]}
        disabled={!role}
        onPress={() =>
          router.push({
          pathname: "/location",
          params: { ...params, role },
          })
        }
      >
        <Text style={styles.buttonText}>Үргэлжлүүлэх</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8F7",
    padding: 24,
  },

  headerImage: {
    width: "100%",
    height: 180,
    marginBottom: 12,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },

  cardRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 32,
  },

  card: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
  },

  selected: {
    borderWidth: 2,
    borderColor: "#4CAF8C",
  },

  cardImage: {
    width: 90,
    height: 90,
    marginBottom: 8,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },

  cardDesc: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },

  button: {
    height: 54,
    backgroundColor: "#4CAF8C",
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
