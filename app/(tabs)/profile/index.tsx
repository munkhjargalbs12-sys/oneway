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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

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
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [paymentInput, setPaymentInput] = useState("");
  const [licenseInput, setLicenseInput] = useState("");
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const loadProfile = async () => {
    try {
      const me = await apiFetch("/users/me");
      setUser(me);
      setAvatarId(me.avatar_id || "guy");
      setEmailInput(me?.email || "");
      setPhoneInput(me?.phone || "");
      setPaymentInput(me?.payment_account || "");
      setLicenseInput(me?.driver_license_number || "");

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

  const getVerifiedLabel = (verified?: boolean) => {
    if (verified) return "????????????";
    return "??????????????";
  };

  const getDocumentStatusLabel = (
    verified?: boolean,
    status?: string
  ) => {
    if (verified) return "????????????";
    if (status === "pending") return "????????? ?????";
    if (status === "rejected") return "??????????";
    return "??????????????";
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const setBusy = (key: string, value: boolean) => {
    setLoading((prev) => ({ ...prev, [key]: value }));
  };

  const selectAvatar = async (id: string) => {
    setAvatarId(id);
    setShowPicker(false);

    try {
      await apiFetch("/users/avatar", {
        method: "PATCH",
        body: JSON.stringify({ avatar_id: id, confirm: true }),
      });
    } catch (err) {
      console.error("Avatar update failed", err);
    }
  };

  const verifyEmail = async () => {
    const value = emailInput.trim();
    if (!value) return;
    setBusy("email", true);
    try {
      await apiFetch("/users/verify/email", {
        method: "POST",
        body: JSON.stringify({ email: value }),
      });
      await loadProfile();
    } catch (err) {
      console.log("verifyEmail error", err);
    } finally {
      setBusy("email", false);
    }
  };

  const verifyPhone = async () => {
    const value = (phoneInput || user?.phone || "").trim();
    if (!value) return;
    setBusy("phone", true);
    try {
      await apiFetch("/users/verify/phone", {
        method: "POST",
        body: JSON.stringify({ phone: value }),
      });
      await loadProfile();
    } catch (err) {
      console.log("verifyPhone error", err);
    } finally {
      setBusy("phone", false);
    }
  };

  const verifyPayment = async () => {
    const value = paymentInput.trim();
    if (!value) return;
    setBusy("payment", true);
    try {
      await apiFetch("/users/verify/payment", {
        method: "POST",
        body: JSON.stringify({ payment_account: value }),
      });
      await loadProfile();
    } catch (err) {
      console.log("verifyPayment error", err);
    } finally {
      setBusy("payment", false);
    }
  };

  const verifyDriverLicense = async () => {
    const value = licenseInput.trim();
    if (!value) return;
    setBusy("driver", true);
    try {
      await apiFetch("/users/verify/driver-license", {
        method: "POST",
        body: JSON.stringify({ driver_license_number: value }),
      });
      await loadProfile();
    } catch (err) {
      console.log("verifyDriverLicense error", err);
    } finally {
      setBusy("driver", false);
    }
  };

  const logout = async () => {
    await clearAuth();
    router.replace("/(auth)/login");
  };

  return (
    <View style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowPicker(!showPicker)}>
            <Image source={avatarMap[avatarId]} style={styles.avatar} />
          </TouchableOpacity>

          <Text style={styles.name}>{user?.name || "?????????"}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.rating}>?????????: {user?.trust_level ?? user?.rating ?? "—"}</Text>
            <Text style={styles.rideCount}>({stats.rides} ?????)</Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {user?.role === "driver" ? "??????" : "???????"}
            </Text>
          </View>
        </View>

        {showPicker && <AvatarPicker onSelect={selectAvatar} />}

        <View style={styles.statsRow}>
          <StatCard label="?????" value={String(stats.rides)} />
          <StatCard label="????????" value={String(stats.cancel)} />
        </View>

        {user?.role === "driver" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>???????? ?????????? ????????</Text>

            {vehicle ? (
              <>
                <Text style={styles.info}>{vehicle.brand} {vehicle.model}</Text>
                <Text style={styles.info}>????: {vehicle.color}</Text>
                <Text style={styles.info}>????? ??????: {vehicle.plate_number}</Text>
                <Text style={styles.info}>??????: {vehicle.seats}</Text>
              </>
            ) : (
              <TouchableOpacity
                style={styles.addCarBtn}
                onPress={() => router.push("/vehicle/add")}
              >
                <Text style={styles.addCarText}>+ ???????? ???????? ?????</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>????? ???????</Text>
          <TouchableOpacity
            style={styles.historyLinkRow}
            onPress={() => router.push("/history")}
          >
            <Image
              source={require("../../../assets/icons/ways.png")}
              style={styles.historyLinkIcon}
            />
            <Text style={styles.link}>????</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>???????????????</Text>

          <Text style={styles.verifyTitle}>?-????</Text>
          <View style={styles.rowInput}>
            <TextInput
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="?-?????? ??????? ??"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.smallBtn, (user?.email_verified || loading.email) && styles.smallBtnDisabled]}
              disabled={loading.email || Boolean(user?.email_verified)}
              onPress={verifyEmail}
            >
              <Text style={styles.smallBtnText}>
                {loading.email ? "??? ?????? ??..." : user?.email_verified ? "????????????" : "??????????????"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.statusText}>?????: {getVerifiedLabel(user?.email_verified)}</Text>

          <Text style={styles.verifyTitle}>?????? ??????</Text>
          <View style={styles.rowInput}>
            <TextInput
              value={phoneInput}
              onChangeText={setPhoneInput}
              placeholder="?????? ???????? ??????? ??"
              style={styles.input}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={[styles.smallBtn, (user?.phone_verified || loading.phone) && styles.smallBtnDisabled]}
              disabled={loading.phone || Boolean(user?.phone_verified)}
              onPress={verifyPhone}
            >
              <Text style={styles.smallBtnText}>
                {loading.phone ? "??? ?????? ??..." : user?.phone_verified ? "????????????" : "??????????????"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.statusText}>?????: {getVerifiedLabel(user?.phone_verified)}</Text>

          <Text style={styles.verifyTitle}>????????? ????</Text>
          <View style={styles.rowInput}>
            <TextInput
              value={paymentInput}
              onChangeText={setPaymentInput}
              placeholder="???? ????? ?????? ?????? ??????? ??"
              style={styles.input}
            />
            <TouchableOpacity
              style={[styles.smallBtn, (user?.payment_linked || loading.payment) && styles.smallBtnDisabled]}
              disabled={loading.payment || Boolean(user?.payment_linked)}
              onPress={verifyPayment}
            >
              <Text style={styles.smallBtnText}>
                {loading.payment ? "??? ?????? ??..." : user?.payment_linked ? "????????????" : "??????????????"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.statusText}>?????: {getVerifiedLabel(user?.payment_linked)}</Text>

          {user?.role === "driver" && (
            <>
              <Text style={styles.verifyTitle}>????????? ???????</Text>
              <View style={styles.rowInput}>
                <TextInput
                  value={licenseInput}
                  onChangeText={setLicenseInput}
                  placeholder="????????? ?????????? ???????? ??????? ??"
                  style={styles.input}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.smallBtn, (user?.driver_verified || loading.driver) && styles.smallBtnDisabled]}
                  disabled={loading.driver || Boolean(user?.driver_verified)}
                  onPress={verifyDriverLicense}
                >
                  <Text style={styles.smallBtnText}>
                    {loading.driver ? "??? ?????? ??..." : user?.driver_verified ? "????????????" : "??????????????"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.statusText}>
                ?????: {getDocumentStatusLabel(user?.driver_license_verified, user?.verification_status)}
              </Text>
              {!!user?.verification_note && (
                <Text style={styles.noteText}>?????????: {user.verification_note}</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logout} onPress={logout}>
            <Text style={styles.logoutText}>?????</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

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

  verifyTitle: { color: "#334155", marginTop: 10, marginBottom: 4 },
  statusText: { color: "#4B5563", marginBottom: 6, marginLeft: 2 },
  noteText: { color: "#B91C1C", marginBottom: 8, marginLeft: 2 },
  rowInput: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: "#fff",
  },
  smallBtn: {
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  smallBtnDisabled: {
    backgroundColor: "#F3F4F6",
    borderColor: "#9CA3AF",
  },
  smallBtnText: { color: "#2563eb", fontWeight: "600" },

  logout: { marginTop: 16 },
  logoutText: { color: "#DC2626", fontWeight: "600" },
});

