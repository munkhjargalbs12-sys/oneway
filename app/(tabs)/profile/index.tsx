import AvatarPicker from "@/components/AvatarPicker";
import { apiFetch } from "@/services/apiClient";
import { clearAuth } from "@/services/authStorage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
// Safe area handled by root layout

const avatarMap: Record<string, any> = {
  child: require("../../../assets/profile/avatars/child.png"),
  father: require("../../../assets/profile/avatars/father.png"),
  grandfa: require("../../../assets/profile/avatars/grandfa.png"),
  grandma: require("../../../assets/profile/avatars/grandma.png"),
  guy: require("../../../assets/profile/avatars/guy.png"),
  mother: require("../../../assets/profile/avatars/mother.png"),
  sister: require("../../../assets/profile/avatars/sister.png"),
  women: require("../../../assets/profile/avatars/women.png"),
};

export default function ProfileScreen() {
  const [avatarId, setAvatarId] = useState("guy");
  const [showPicker, setShowPicker] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ rides: 0, cancel: 0 });
  const [vehicle, setVehicle] = useState<any>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const me = await apiFetch("/users/me");
        setUser(me);
        setAvatarId(me.avatar_id || "guy");

        const myRides = await apiFetch("/rides/mine");
        setStats({
          rides: myRides.length,
          cancel: myRides.filter((r: any) => r.status === "cancelled").length,
        });

        const myVehicle = await apiFetch("/vehicles/me");
        setVehicle(myVehicle);
      } catch (err) {
        console.log("Profile load error", err);
      }
    };

    loadProfile();
  }, []);

  const selectAvatar = async (id: string) => {
    setAvatarId(id);
    setShowPicker(false);

    try {
      await apiFetch("/users/avatar", {
        method: "PATCH",
        body: JSON.stringify({ avatar_id: id }),
      });
    } catch (err) {
      console.error("Avatar update failed", err);
    }
  };

  const logout = async () => {
    await clearAuth();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowPicker(!showPicker)}>
            <Image source={avatarMap[avatarId]} style={styles.avatar} />
          </TouchableOpacity>

          <Text style={styles.name}>{user?.name || "User"}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.rating}>⭐ {user?.rating ?? "—"}</Text>
            <Text style={styles.rideCount}>({stats.rides} rides)</Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {user?.role === "driver" ? "Driver" : "Passenger"}
            </Text>
          </View>
        </View>

        {showPicker && <AvatarPicker onSelect={selectAvatar} />}

        {/* STATS */}
        <View style={styles.statsRow}>
          <StatCard label="Rides" value={String(stats.rides)} />
          <StatCard label="Cancel" value={String(stats.cancel)} />
        </View>

        {/* 🚘 VEHICLE SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle</Text>

          {vehicle ? (
            <>
              <Text style={styles.info}>{vehicle.brand} {vehicle.model}</Text>
              <Text style={styles.info}>Color: {vehicle.color}</Text>
              <Text style={styles.info}>Plate: {vehicle.plate_number}</Text>
              <Text style={styles.info}>Seats: {vehicle.seats}</Text>
            </>
          ) : (
            <TouchableOpacity
              style={styles.addCarBtn}
              onPress={() => router.push("/vehicle/add")}
            >
              <Text style={styles.addCarText}>➕ Машин бүртгэх</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* MY RIDES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My rides</Text>
          <TouchableOpacity
            style={styles.historyLinkRow}
            onPress={() => router.push("/history")}
          >
            <Image
              source={require("../../../assets/icons/ways.png")}
              style={styles.historyLinkIcon}
            />
            <Text style={styles.link}>Миний унааны түүх</Text>
          </TouchableOpacity>
        </View>

        {/* ACTIONS */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logout} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------- COMPONENTS ---------- */

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  header: { alignItems: "center", padding: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 12 },
  name: { fontSize: 20, fontWeight: "600" },

  ratingRow: { flexDirection: "row", marginTop: 6 },
  rating: { fontWeight: "600" },
  rideCount: { marginLeft: 6, color: "#6B7280" },

  badge: {
    marginTop: 8,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: "#16A34A", fontSize: 12 },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
  },
  statCard: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "600" },
  statLabel: { color: "#6B7280", marginTop: 2 },

  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  info: { color: "#374151", marginTop: 4 },

  addCarBtn: {
    marginTop: 8,
    backgroundColor: "#E0F2FE",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  addCarText: {
    color: "#0284C7",
    fontWeight: "600",
  },

  historyLinkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyLinkIcon: {
    width: 14,
    height: 14,
    marginRight: 8,
    tintColor: "#2563eb",
  },
  link: { color: "#2563eb", fontWeight: "600" },

  logout: { marginTop: 16 },
  logoutText: { color: "#DC2626", fontWeight: "600" },
});
