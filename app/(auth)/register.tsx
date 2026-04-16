import { AppTheme } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AVATARS } from "../../constants/avatars";
import { register } from "../../services/api";
import { saveToken, saveUser } from "../../services/authStorage";

const PLACEHOLDER_COLOR = AppTheme.colors.textMuted;

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [avatar, setAvatar] = useState("guy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");

    if (!name || !phone || !password || !confirmPassword) {
      return setError("Бүх талбаруудыг бөглөнө үү");
    }

    if (phone.length !== 8) {
      return setError("Утас 8 оронтой байх ёстой");
    }

    if (password.length < 6) {
      return setError("Нууц үг дор хаяж 6 тэмдэгттэй байх ёстой");
    }

    if (password !== confirmPassword) {
      return setError("Нууц үг таарахгүй байна");
    }

    setLoading(true);

    try {
      const res = await register({
        name,
        phone,
        password,
        confirmPassword,
        role,
        avatar_id: avatar,
      });

      if (res.message) {
        setError(res.message);
      } else if (res.token && res.user) {
        await saveToken(res.token);
        await saveUser(res.user);
        router.replace("/(tabs)/home");
      } else {
        setError("Серверт бүртгэл хийгдлээ ирлээ");
      }
    } catch {
      setError("Бүртгэл амжилтгүй боллоо");
    } finally {
      setLoading(false);
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
            "#7b9b87",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <TouchableOpacity style={styles.backPill} onPress={() => router.back()}>
            <Text style={styles.backPillText}>Буцах</Text>
          </TouchableOpacity>

          <Text style={styles.heroEyebrow}>Шинэ бүртгэл</Text>
          <Text style={styles.heroTitle}>One Way-д тавтай морил</Text>
          <Text style={styles.heroText}>
            Өөрт тохирох дүрээ сонгоод профайлаа бүрдүүлснээр аяллаа шууд
            эхлүүлж болно.
          </Text>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Үндсэн мэдээлэл</Text>

          <Text style={styles.label}>Нэр</Text>
          <TextInput
            placeholder="Нэрээ оруулна уу"
            placeholderTextColor={PLACEHOLDER_COLOR}
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <Text style={styles.label}>Утасны дугаар</Text>
          <TextInput
            placeholder="8 оронтой дугаараа оруулна уу"
            placeholderTextColor={PLACEHOLDER_COLOR}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
          />

          <Text style={styles.label}>Нууц үг</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Нууц үгээ оруулна уу"
              placeholderTextColor={PLACEHOLDER_COLOR}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={styles.passwordInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword((prev) => !prev)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁️"}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Нууц үг давтах</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Нууц үгээ дахин оруулна уу"
              placeholderTextColor={PLACEHOLDER_COLOR}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.passwordInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword((prev) => !prev)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeIcon}>
                {showConfirmPassword ? "🙈" : "👁️"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.subsection}>
            <Text style={styles.sectionTitle}>Таны дүр</Text>
            <Text style={styles.sectionText}>
              Аяллын үеийн туршлагаа тааруулахын тулд жолооч эсвэл зорчигчоо
              сонгоорой.
            </Text>

            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[
                  styles.roleBtn,
                  role === "passenger" && styles.roleActive,
                ]}
                onPress={() => setRole("passenger")}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === "passenger" && styles.roleTextActive,
                  ]}
                >
                  Зорчигч
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === "driver" && styles.roleActive]}
                onPress={() => setRole("driver")}
              >
                <Text
                  style={[
                    styles.roleText,
                    role === "driver" && styles.roleTextActive,
                  ]}
                >
                  Жолооч
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.subsection}>
            <Text style={styles.sectionTitle}>Аватар сонгох</Text>
            <Text style={styles.sectionText}>
              Танигдахуйц профайлтай байхад илүү итгэлтэй харагдана.
            </Text>

            <View style={styles.avatarGrid}>
              {AVATARS.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => setAvatar(a.id)}
                  style={[
                    styles.avatarWrap,
                    avatar === a.id && styles.avatarSelected,
                  ]}
                >
                  <Image source={a.source} style={styles.avatarImg} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={AppTheme.colors.white} />
            ) : (
              <Text style={styles.buttonText}>Бүртгүүлэх</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push("/api-check")}>
            <Text style={styles.debugLink}>API шалгах</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingBottom: 44,
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 16,
    ...AppTheme.shadow.floating,
  },
  backPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: "rgba(255,255,255,0.14)",
    marginBottom: 18,
  },
  backPillText: {
    color: AppTheme.colors.white,
    fontSize: 13,
    fontWeight: "700",
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.68)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroTitle: {
    color: AppTheme.colors.white,
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  heroText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 320,
  },
  formCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppTheme.colors.text,
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 13,
    lineHeight: 19,
    color: AppTheme.colors.textMuted,
    marginBottom: 12,
  },
  subsection: {
    marginTop: 8,
    paddingTop: 10,
  },
  label: {
    marginBottom: 6,
    fontWeight: "600",
    color: AppTheme.colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    backgroundColor: AppTheme.colors.cardSoft,
    color: AppTheme.colors.text,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: AppTheme.colors.cardSoft,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    color: AppTheme.colors.text,
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  eyeIcon: {
    fontSize: 18,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    backgroundColor: AppTheme.colors.cardSoft,
  },
  roleActive: {
    backgroundColor: AppTheme.colors.accent,
    borderColor: AppTheme.colors.accent,
  },
  roleText: {
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  roleTextActive: {
    color: AppTheme.colors.white,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  avatarWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 6,
    overflow: "hidden",
    backgroundColor: AppTheme.colors.cardSoft,
  },
  avatarSelected: {
    borderColor: AppTheme.colors.accent,
    transform: [{ scale: 1.04 }],
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  errorCard: {
    marginTop: 10,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#f7e2dc",
    borderWidth: 1,
    borderColor: "#ebc7bc",
  },
  error: {
    color: AppTheme.colors.danger,
    textAlign: "center",
    lineHeight: 18,
  },
  button: {
    backgroundColor: AppTheme.colors.accent,
    padding: 15,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: AppTheme.colors.white,
    fontWeight: "700",
    fontSize: 15,
  },
  debugLink: {
    marginTop: 14,
    textAlign: "center",
    color: AppTheme.colors.accentDeep,
    fontWeight: "600",
  },
});
