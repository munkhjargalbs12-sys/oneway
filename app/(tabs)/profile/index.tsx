import AvatarPicker from "@/components/AvatarPicker";
import { AppTheme } from "@/constants/theme";
import {
  checkAndFetchAppUpdate,
  getAppUpdateMetadata,
  reloadToApplyUpdate,
} from "@/services/appUpdate";
import { apiFetch } from "@/services/apiClient";
import { clearAuth } from "@/services/authStorage";
import { emitProfileBadgeRefresh } from "@/services/profileBadge";
import { removePushTokenFromBackend } from "@/services/pushNotifications";
import { stopRideMeetupTracking } from "@/services/rideMeetupTracking";
import { clearRideReminderNotifications } from "@/services/rideReminders";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
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
  const [emailCodeInput, setEmailCodeInput] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [paymentInput, setPaymentInput] = useState("");
  const [licenseInput, setLicenseInput] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const hasVehicle = Boolean(
    vehicle?.id || vehicle?.brand || vehicle?.model || vehicle?.plate_number
  );
  const vehicleVerified = Boolean(vehicle?.vehicle_verified);
  const driverLicenseVerified = Boolean(
    user?.driver_verified || user?.driver_license_verified
  );
  const updateMeta = getAppUpdateMetadata();
  const pendingChecks = [
    !user?.email_verified,
    !user?.phone_verified,
    !user?.payment_linked,
    user?.role === "driver" ? !vehicleVerified : false,
    user?.role === "driver" ? !driverLicenseVerified : false,
  ].filter(Boolean).length;
  const normalizedCurrentEmail = String(user?.email || "").trim().toLowerCase();
  const normalizedDraftEmail = emailInput.trim().toLowerCase();
  const hasEmailChanged = normalizedDraftEmail !== normalizedCurrentEmail;

  const loadProfile = useCallback(async () => {
    try {
      const me = await apiFetch("/users/me");
      setUser(me);
      setAvatarId(me.avatar_id || "guy");
      setEmailInput(me?.email || "");
      setEmailCodeInput("");
      setEmailCodeSent(false);
      setEmailEditMode(!(me?.email_verified && me?.email));
      setPhoneInput(me?.phone || "");
      setPaymentInput(me?.payment_account || "");
      setLicenseInput(me?.driver_license_number || "");

      const myRides = await apiFetch("/rides/mine/all");
      setStats({
        rides: myRides.length,
        cancel: myRides.filter((r: any) => r.status === "cancelled").length,
      });

      const myVehicle = await apiFetch("/vehicles/me");
      setVehicle(myVehicle);
      emitProfileBadgeRefresh();
    } catch (err) {
      console.log("Profile load error", err);
    }
  }, []);

  const getVerifiedLabel = (verified?: boolean) => {
    if (verified) return "Баталгаажсан";
    return "Баталгаажаагүй";
  };

  const getVerifiedStatusStyle = (verified?: boolean) =>
    verified ? styles.statusVerified : styles.statusUnverified;

  const getDocumentStatusLabel = (verified?: boolean, status?: string) => {
    if (verified) return "Баталгаажсан";
    if (status === "pending") return "Хянагдаж байна";
    if (status === "rejected") return "Татгалзсан";
    return "Баталгаажаагүй";
  };

  const getDocumentStatusStyle = (verified?: boolean, status?: string) => {
    if (verified) return styles.statusVerified;
    if (status === "pending") return styles.statusPending;
    return styles.statusUnverified;
  };

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

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
    if (!value) {
      Alert.alert("Алдаа", "И-мэйл хаягаа оруулна уу.");
      return;
    }
    setBusy("email", true);
    try {
      const response = await apiFetch("/users/verify/email", {
        method: "POST",
        body: JSON.stringify({ email: value }),
      });

      if (response?.already_verified) {
        await loadProfile();
        Alert.alert("Баталгаажсан", "Энэ и-мэйл аль хэдийн баталгаажсан байна.");
        return;
      }

      setEmailCodeSent(true);
      setEmailCodeInput("");
      Alert.alert("Код илгээлээ", `${value} хаяг руу 6 оронтой код илгээлээ.`);
    } catch (err) {
      console.log("verifyEmail error", err);
      Alert.alert(
        "Алдаа",
        err instanceof Error ? err.message : "И-мэйл баталгаажуулах код илгээж чадсангүй."
      );
    } finally {
      setBusy("email", false);
    }
  };

  const confirmEmailVerification = async () => {
    const email = emailInput.trim();
    const code = emailCodeInput.trim();

    if (!email) {
      Alert.alert("Алдаа", "И-мэйл хаягаа оруулна уу.");
      return;
    }

    if (!code) {
      Alert.alert("Алдаа", "6 оронтой баталгаажуулах кодоо оруулна уу.");
      return;
    }

    setBusy("emailConfirm", true);
    try {
      await apiFetch("/users/verify/email/confirm", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      await loadProfile();
      Alert.alert("Амжилттай", "И-мэйл амжилттай баталгаажлаа.");
    } catch (err) {
      console.log("confirmEmailVerification error", err);
      Alert.alert(
        "Алдаа",
        err instanceof Error ? err.message : "И-мэйл код баталгаажуулж чадсангүй."
      );
    } finally {
      setBusy("emailConfirm", false);
    }
  };

  const startEmailEdit = () => {
    setEmailEditMode(true);
    setEmailCodeInput("");
    setEmailCodeSent(false);
  };

  const handleEmailPrimaryAction = () => {
    if (user?.email_verified && !emailEditMode) {
      startEmailEdit();
      return;
    }

    void verifyEmail();
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

  const handleVehicleVerification = async () => {
    if (!hasVehicle) {
      router.push("/vehicle/add");
      return;
    }

    setBusy("vehicle", true);
    try {
      await apiFetch("/vehicles/verify", {
        method: "POST",
      });
      await loadProfile();
    } catch (err) {
      console.log("handleVehicleVerification error", err);
      Alert.alert("Алдаа", "Тээврийн хэрэгслийг баталгаажуулалтад илгээж чадсангүй.");
    } finally {
      setBusy("vehicle", false);
    }
  };

  const editVehicle = () => {
    router.push({
      pathname: "/vehicle/add",
      params: { mode: "edit" },
    });
  };

  const logout = async () => {
    await removePushTokenFromBackend();
    await stopRideMeetupTracking();
    await clearRideReminderNotifications();
    await clearAuth();
    router.replace("/(auth)/login");
  };

  const handleAppUpdate = async () => {
    setBusy("appUpdate", true);
    try {
      const result = await checkAndFetchAppUpdate();
      setUpdateMessage(result.message);

      if (result.status === "downloaded") {
        Alert.alert("Шинэчлэлт бэлэн", result.message, [
          { text: "Дараа" },
          {
            text: "Одоо шинэчлэх",
            onPress: () => {
              void reloadToApplyUpdate();
            },
          },
        ]);
        return;
      }

      Alert.alert("Апп шинэчлэлт", result.message);
    } catch (err) {
      console.log("handleAppUpdate error", err);
      const message =
        err instanceof Error
          ? err.message
          : "Шинэчлэлт шалгах үед алдаа гарлаа.";
      setUpdateMessage(message);
      Alert.alert("Алдаа", message);
    } finally {
      setBusy("appUpdate", false);
    }
  };

  return (
    <View style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient
          colors={[
            AppTheme.colors.accentDeep,
            AppTheme.colors.accent,
            "#6f927c",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => setShowPicker(!showPicker)}
            activeOpacity={0.85}
            style={styles.avatarButton}
          >
            <Image source={avatarMap[avatarId]} style={styles.avatar} />
            <View style={styles.avatarEditPill}>
              <Text style={styles.avatarEditText}>Солих</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.headerEyebrow}>Профайл</Text>

          <Text style={styles.name}>{user?.name || "Хэрэглэгч"}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.rating}>
              Итгэлийн түвшин: {user?.trust_level ?? user?.rating ?? "-"}
            </Text>
            <Text style={styles.rideCount}>({stats.rides} унаа)</Text>
          </View>

          <View style={styles.headerBadgeRow}>
            <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {user?.role === "driver" ? "Жолооч" : "Зорчигч"}
            </Text>
            </View>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingChecks} дутуу</Text>
            </View>
          </View>
        </LinearGradient>

        {showPicker && (
          <View style={styles.avatarPickerWrap}>
            <AvatarPicker onSelect={selectAvatar} />
          </View>
        )}

        <View style={styles.statsRow}>
          <StatCard label="Унаа" value={String(stats.rides)} />
          <StatCard label="Цуцалсан" value={String(stats.cancel)} />
          <StatCard label="Дутуу" value={String(pendingChecks)} />
        </View>

        {user?.role === "driver" && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Таны машин</Text>
              {vehicle ? (
                <TouchableOpacity style={styles.inlineAction} onPress={editVehicle}>
                  <Text style={styles.inlineActionText}>Засах</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {vehicle ? (
              <>
                <Text style={styles.info}>{vehicle.brand} {vehicle.model}</Text>
                <Text style={styles.info}>Өнгө: {vehicle.color}</Text>
                <Text style={styles.info}>Улсын дугаар: {vehicle.plate_number}</Text>
                <Text style={styles.info}>Суудал: {vehicle.seats}</Text>
                <Text style={styles.helperText}>
                  Улсын дугаар буруу орсон бол `Засах` товчоор шинэчилнэ.
                </Text>
              </>
            ) : (
              <TouchableOpacity
                style={styles.addCarBtn}
                onPress={() => router.push("/vehicle/add")}
              >
                <Text style={styles.addCarText}>+ Машин нэмэх</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Миний түүх</Text>
          <TouchableOpacity
            style={styles.historyLinkRow}
            onPress={() => router.push("/history")}
          >
            <Image
              source={require("../../../assets/icons/ways.png")}
              style={styles.historyLinkIcon}
            />
            <Text style={styles.link}>Түүх харах</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Апп шинэчлэлт</Text>
          <Text style={styles.info}>Хувилбар: {updateMeta.appVersion}</Text>
          <Text style={styles.info}>Runtime: {updateMeta.runtimeVersion}</Text>
          <Text style={styles.info}>Суваг: {updateMeta.channel}</Text>
          <Text style={styles.info}>
            Төлөв: {updateMeta.isEnabled ? "Шинэчлэлт идэвхтэй" : "Энэ build дээр идэвхгүй"}
          </Text>
          {!updateMeta.isEnabled && (
            <Text style={styles.helperText}>
              OTA update ашиглахын тулд EAS project id-тай build суулгасан байх хэрэгтэй.
            </Text>
          )}
          <TouchableOpacity
            style={[styles.updateBtn, loading.appUpdate && styles.smallBtnDisabled]}
            onPress={handleAppUpdate}
            disabled={Boolean(loading.appUpdate)}
          >
            <Text style={styles.updateBtnText}>
              {loading.appUpdate ? "Шалгаж байна..." : "Update шалгах"}
            </Text>
          </TouchableOpacity>
          {!!updateMessage && <Text style={styles.noteText}>{updateMessage}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Баталгаажуулалт</Text>

          <Text style={styles.verifyTitle}>И-мэйл</Text>
          <View style={styles.rowInput}>
            <TextInput
              value={emailInput}
              onChangeText={(value) => {
                setEmailInput(value);
                setEmailCodeInput("");
                setEmailCodeSent(false);
                setEmailEditMode(true);
              }}
              placeholder="И-мэйл хаягаа оруулна уу"
              style={[
                styles.input,
                user?.email_verified && !emailEditMode && styles.readOnlyInput,
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              importantForAutofill="yes"
              editable={!user?.email_verified || emailEditMode}
            />
            <TouchableOpacity
              style={[
                styles.smallBtn,
                (loading.email ||
                  (user?.email_verified && emailEditMode && !hasEmailChanged)) &&
                  styles.smallBtnDisabled,
              ]}
              disabled={
                loading.email ||
                Boolean(user?.email_verified && emailEditMode && !hasEmailChanged)
              }
              onPress={handleEmailPrimaryAction}
            >
              <Text style={styles.smallBtnText}>
                {loading.email
                  ? "Илгээж байна..."
                  : user?.email_verified && !emailEditMode
                    ? "Засах"
                    : user?.email_verified && emailEditMode && !hasEmailChanged
                      ? "Шинэ и-мэйл"
                      : emailCodeSent
                        ? "Код дахин илгээх"
                        : "Код илгээх"}
              </Text>
            </TouchableOpacity>
          </View>
          {user?.email_verified && !emailEditMode && (
            <Text style={styles.helperText}>
              Одоогийн и-мэйл баталгаажсан. Солих бол `Засах` дээр дарна уу.
            </Text>
          )}
          {user?.email_verified && emailEditMode && (
            <Text style={styles.helperText}>
              Шинэ и-мэйлээ оруулаад код илгээж баталгаажуулна уу.
            </Text>
          )}
          {!user?.email_verified && (
            <Text style={styles.helperText}>
              Төхөөрөмж дээр хадгалагдсан Google/Gmail хаягууд санал болж ирнэ.
            </Text>
          )}
          {emailCodeSent && (!user?.email_verified || emailEditMode) && (
            <>
              <View style={styles.rowInput}>
                <TextInput
                  value={emailCodeInput}
                  onChangeText={setEmailCodeInput}
                  placeholder="6 оронтой код"
                  style={styles.input}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                />
                <TouchableOpacity
                  style={[
                    styles.smallBtn,
                    (!emailCodeInput.trim() || loading.emailConfirm) &&
                      styles.smallBtnDisabled,
                  ]}
                  disabled={loading.emailConfirm || !emailCodeInput.trim()}
                  onPress={confirmEmailVerification}
                >
                  <Text style={styles.smallBtnText}>
                    {loading.emailConfirm ? "Шалгаж байна..." : "Код баталгаажуулах"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.noteText}>
                Баталгаажуулах код 10 минутын хугацаатай.
              </Text>
            </>
          )}
          <Text style={styles.statusText}>
            Төлөв:{" "}
            <Text
              style={
                user?.email_verified && emailEditMode
                  ? styles.statusPending
                  : getVerifiedStatusStyle(user?.email_verified)
              }
            >
              {user?.email_verified && emailEditMode
                ? "Шинэ и-мэйл баталгаажаагүй"
                : getVerifiedLabel(user?.email_verified)}
            </Text>
          </Text>
          <Text style={styles.verifyTitle}>Утасны дугаар</Text>
          <View style={styles.rowInput}>
            <TextInput
              value={phoneInput}
              onChangeText={setPhoneInput}
              placeholder="Утасны дугаараа оруулна уу"
              style={styles.input}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={[styles.smallBtn, (user?.phone_verified || loading.phone) && styles.smallBtnDisabled]}
              disabled={loading.phone || Boolean(user?.phone_verified)}
              onPress={verifyPhone}
            >
              <Text style={styles.smallBtnText}>
                {loading.phone ? "Хадгалж байна..." : user?.phone_verified ? "Баталгаажсан" : "Баталгаажуулах"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.statusText}>
            Төлөв:{" "}
            <Text style={getVerifiedStatusStyle(user?.phone_verified)}>
              {getVerifiedLabel(user?.phone_verified)}
            </Text>
          </Text>

          <Text style={styles.verifyTitle}>Төлбөрийн данс</Text>
          <View style={styles.rowInput}>
            <TextInput
              value={paymentInput}
              onChangeText={setPaymentInput}
              placeholder="Төлбөр авах дансаа оруулна уу"
              style={styles.input}
            />
            <TouchableOpacity
              style={[styles.smallBtn, (user?.payment_linked || loading.payment) && styles.smallBtnDisabled]}
              disabled={loading.payment || Boolean(user?.payment_linked)}
              onPress={verifyPayment}
            >
              <Text style={styles.smallBtnText}>
                {loading.payment ? "Хадгалж байна..." : user?.payment_linked ? "Баталгаажсан" : "Баталгаажуулах"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.statusText}>
            Төлөв:{" "}
            <Text style={getVerifiedStatusStyle(user?.payment_linked)}>
              {getVerifiedLabel(user?.payment_linked)}
            </Text>
          </Text>

          {user?.role === "driver" && (
            <>
              <Text style={styles.verifyTitle}>Тээврийн хэрэгсэл</Text>
              <View style={styles.rowInput}>
                <View style={[styles.input, styles.readOnlyField]}>
                  <Text
                    style={[
                      styles.readOnlyText,
                      !hasVehicle && styles.readOnlyTextMuted,
                    ]}
                    numberOfLines={1}
                  >
                    {hasVehicle
                      ? `${vehicle.brand} ${vehicle.model} - ${vehicle.plate_number}`
                      : "Тээврийн хэрэгсэл бүртгэгдээгүй"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.smallBtn,
                    (vehicleVerified || loading.vehicle) && styles.smallBtnDisabled,
                  ]}
                  disabled={loading.vehicle || vehicleVerified}
                  onPress={handleVehicleVerification}
                >
                  <Text style={styles.smallBtnText}>
                    {!hasVehicle
                      ? "Нэмэх"
                      : loading.vehicle
                        ? "Хадгалж байна..."
                        : vehicleVerified
                          ? "Баталгаажсан"
                          : "Баталгаажуулах"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.statusText}>
                Төлөв:{" "}
                <Text
                  style={
                    hasVehicle
                      ? getVerifiedStatusStyle(vehicleVerified)
                      : styles.statusUnverified
                  }
                >
                  {hasVehicle ? getVerifiedLabel(vehicleVerified) : "Нэмэгдээгүй"}
                </Text>
              </Text>

              <Text style={styles.verifyTitle}>Жолооны үнэмлэх</Text>
              <View style={styles.rowInput}>
                <TextInput
                  value={licenseInput}
                  onChangeText={setLicenseInput}
                  placeholder="Жолооны үнэмлэхний дугаараа оруулна уу"
                  style={styles.input}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[styles.smallBtn, (driverLicenseVerified || loading.driver) && styles.smallBtnDisabled]}
                  disabled={loading.driver || driverLicenseVerified}
                  onPress={verifyDriverLicense}
                >
                  <Text style={styles.smallBtnText}>
                    {loading.driver ? "Хадгалж байна..." : user?.driver_verified ? "Баталгаажсан" : "Баталгаажуулах"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.statusText}>
                Төлөв:{" "}
                <Text
                  style={getDocumentStatusStyle(
                    user?.driver_license_verified,
                    user?.verification_status
                  )}
                >
                  {getDocumentStatusLabel(
                    user?.driver_license_verified,
                    user?.verification_status
                  )}
                </Text>
              </Text>
              {!!user?.verification_note && (
                <Text style={styles.noteText}>Тайлбар: {user.verification_note}</Text>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.logout} onPress={logout}>
            <Text style={styles.logoutText}>Гарах</Text>
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
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 132,
  },
  header: {
    alignItems: "center",
    padding: 22,
    borderRadius: 28,
    marginBottom: 16,
    ...AppTheme.shadow.floating,
  },
  avatarButton: {
    position: "relative",
    marginBottom: 10,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.76)",
  },
  avatarEditPill: {
    position: "absolute",
    right: -4,
    bottom: -4,
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  avatarEditText: {
    color: AppTheme.colors.accentDeep,
    fontSize: 11,
    fontWeight: "700",
  },
  headerEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: "700",
    color: AppTheme.colors.white,
  },
  ratingRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 10,
  },
  rating: {
    fontWeight: "600",
    color: "rgba(255,255,255,0.88)",
  },
  rideCount: {
    marginLeft: 6,
    color: "rgba(255,255,255,0.68)",
  },
  headerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: {
    color: AppTheme.colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  pendingBadge: {
    backgroundColor: "rgba(255,244,214,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  pendingBadgeText: {
    color: "#fff7de",
    fontSize: 12,
    fontWeight: "700",
  },
  avatarPickerWrap: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 22,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: AppTheme.colors.card,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: AppTheme.colors.text,
  },
  statLabel: {
    color: AppTheme.colors.textMuted,
    marginTop: 4,
    fontSize: 12,
  },
  section: {
    backgroundColor: AppTheme.colors.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    marginBottom: 16,
    ...AppTheme.shadow.card,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
    color: AppTheme.colors.text,
  },
  inlineAction: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.accentSoft,
  },
  inlineActionText: {
    color: AppTheme.colors.accentDeep,
    fontSize: 12,
    fontWeight: "700",
  },
  info: {
    color: AppTheme.colors.textMuted,
    marginTop: 5,
    lineHeight: 18,
  },
  addCarBtn: {
    marginTop: 8,
    backgroundColor: AppTheme.colors.accentSoft,
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  addCarText: {
    color: AppTheme.colors.accentDeep,
    fontWeight: "700",
  },
  historyLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.cardSoft,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  historyLinkIcon: {
    width: 18,
    height: 18,
    marginRight: 10,
    tintColor: AppTheme.colors.accent,
  },
  link: {
    color: AppTheme.colors.accentDeep,
    fontWeight: "700",
  },
  verifyTitle: {
    color: AppTheme.colors.text,
    marginTop: 12,
    marginBottom: 6,
    fontWeight: "700",
  },
  statusText: {
    color: AppTheme.colors.textMuted,
    marginBottom: 8,
    marginLeft: 2,
  },
  statusVerified: {
    color: AppTheme.colors.accentDeep,
    fontWeight: "700",
  },
  statusUnverified: {
    color: AppTheme.colors.danger,
    fontWeight: "700",
  },
  statusPending: {
    color: AppTheme.colors.warning,
    fontWeight: "700",
  },
  helperText: {
    color: AppTheme.colors.warning,
    marginTop: 8,
    marginBottom: 4,
    lineHeight: 18,
  },
  noteText: {
    color: AppTheme.colors.warning,
    marginBottom: 8,
    marginLeft: 2,
    lineHeight: 18,
  },
  rowInput: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 8,
    backgroundColor: AppTheme.colors.cardSoft,
    color: AppTheme.colors.text,
  },
  readOnlyInput: {
    opacity: 0.72,
  },
  readOnlyField: {
    justifyContent: "center",
  },
  readOnlyText: {
    color: AppTheme.colors.text,
  },
  readOnlyTextMuted: {
    color: AppTheme.colors.textMuted,
  },
  smallBtn: {
    backgroundColor: AppTheme.colors.accentSoft,
    borderWidth: 1,
    borderColor: AppTheme.colors.accentSoft,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
  },
  smallBtnDisabled: {
    backgroundColor: AppTheme.colors.canvasMuted,
    borderColor: AppTheme.colors.canvasMuted,
  },
  smallBtnText: {
    color: AppTheme.colors.accentDeep,
    fontWeight: "700",
  },
  updateBtn: {
    marginTop: 10,
    backgroundColor: AppTheme.colors.accent,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  updateBtnText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
  },
  logout: {
    marginTop: 0,
    backgroundColor: "#f6e7e3",
    borderWidth: 1,
    borderColor: "#e6c5bd",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  logoutText: {
    color: AppTheme.colors.danger,
    fontWeight: "700",
  },
});
