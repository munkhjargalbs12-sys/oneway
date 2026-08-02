import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { confirmPasswordReset, requestPasswordReset } from "@/services/api";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState<"send" | "reset" | null>(null);

  const normalizedEmail = email.trim().toLowerCase();

  const handleSend = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      Alert.alert("Мэдэгдэл", "Бүртгэлтэй и-мэйл хаягаа зөв оруулна уу.");
      return;
    }

    setLoading("send");
    const response = await requestPasswordReset(normalizedEmail);
    setLoading(null);

    if (response.message) {
      Alert.alert("Алдаа", response.message);
      return;
    }

    setMaskedEmail(response.masked_email || "");
    setCodeSent(true);
    Alert.alert(
      "Хүсэлт хүлээн авлаа",
      response.masked_email
        ? `${response.masked_email} хаяг бүртгэлтэй бөгөөд баталгаажсан бол сэргээх код илгээгдсэн.`
        : "Хэрэв энэ и-мэйл бүртгэлтэй бөгөөд баталгаажсан бол сэргээх код илгээгдсэн."
    );
  };

  const handleReset = async () => {
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      !code.trim() ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert("Мэдэгдэл", "И-мэйл, код болон шинэ нууц үгээ бүрэн оруулна уу.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Мэдэгдэл", "Нууц үг хамгийн багадаа 6 тэмдэгт байх ёстой.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Мэдэгдэл", "Шинэ нууц үг хоорондоо таарахгүй байна.");
      return;
    }

    setLoading("reset");
    const response = await confirmPasswordReset(
      normalizedEmail,
      code.trim(),
      password,
      confirmPassword
    );
    setLoading(null);

    if (response.message) {
      Alert.alert("Алдаа", response.message);
      return;
    }

    Alert.alert("Амжилттай", "Нууц үг шинэчлэгдлээ. Одоо шинэ нууц үгээрээ нэвтэрнэ үү.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <LinearGradient
          colors={[AppTheme.colors.accentDeep, AppTheme.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroEyebrow}>Recovery</Text>
          <Text style={styles.heroTitle}>Нууц үгээ сэргээх</Text>
          <Text style={styles.heroBody}>
            Бүртгэл дээрээ баталгаажуулсан и-мэйл хаягаар сэргээх код авна.
          </Text>
        </LinearGradient>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>И-мэйл хаяг</Text>
          <Text style={styles.sectionBody}>
            Одоогоор нууц үг сэргээхийг зөвхөн баталгаажсан и-мэйлээр илгээнэ.
          </Text>

          <TextInput
            placeholder="И-мэйл хаяг"
            keyboardType="email-address"
            value={email}
            onChangeText={(value) => {
              setEmail(value.trim());
              setMaskedEmail("");
              setCodeSent(false);
              setCode("");
            }}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            placeholderTextColor={AppTheme.colors.textMuted}
            style={styles.input}
          />

          <TouchableOpacity
            activeOpacity={0.92}
            style={[styles.primaryButton, loading === "send" && styles.disabledButton]}
            onPress={handleSend}
            disabled={loading === "send"}
          >
            {loading === "send" ? (
              <ActivityIndicator color={AppTheme.colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>{codeSent ? "Код дахин илгээх" : "Код илгээх"}</Text>
            )}
          </TouchableOpacity>

          {codeSent && (
            <View style={styles.resetBlock}>
              {!!maskedEmail && (
                <Text style={styles.sentHint}>
                  {maskedEmail} хаягаар код ирсэн бол доор оруулна уу.
                </Text>
              )}

              <TextInput
                placeholder="6 оронтой код"
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                maxLength={6}
                placeholderTextColor={AppTheme.colors.textMuted}
                style={styles.input}
              />

              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="Шинэ нууц үг"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor={AppTheme.colors.textMuted}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
                  activeOpacity={0.75}
                  onPress={() => setShowPassword((value) => !value)}
                  style={styles.eyeButton}
                >
                  <MaterialIcons
                    name={showPassword ? "visibility-off" : "visibility"}
                    size={22}
                    color={AppTheme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordWrapper}>
                <TextInput
                  placeholder="Шинэ нууц үг давтах"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholderTextColor={AppTheme.colors.textMuted}
                  style={styles.passwordInput}
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? "Нууц үг нуух" : "Нууц үг харах"}
                  activeOpacity={0.75}
                  onPress={() => setShowConfirmPassword((value) => !value)}
                  style={styles.eyeButton}
                >
                  <MaterialIcons
                    name={showConfirmPassword ? "visibility-off" : "visibility"}
                    size={22}
                    color={AppTheme.colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.primaryButton, loading === "reset" && styles.disabledButton]}
                onPress={handleReset}
                disabled={loading === "reset"}
              >
                {loading === "reset" ? (
                  <ActivityIndicator color={AppTheme.colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Нууц үг шинэчлэх</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity activeOpacity={0.92} style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Буцах</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 28,
  },
  heroCard: {
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 22,
    paddingVertical: 24,
    ...AppTheme.shadow.floating,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 10,
    fontFamily: AppFontFamily,
  },
  heroTitle: {
    color: AppTheme.colors.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  heroBody: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  formCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  sectionTitle: {
    color: AppTheme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  sectionBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: AppTheme.colors.white,
    color: AppTheme.colors.text,
  },
  passwordWrapper: {
    marginTop: 16,
    minHeight: 52,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.md,
    backgroundColor: AppTheme.colors.white,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    paddingRight: 8,
    color: AppTheme.colors.text,
  },
  eyeButton: {
    width: 48,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  sentHint: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
  },
  resetBlock: {
    marginTop: 4,
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 56,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.accent,
  },
  disabledButton: {
    opacity: 0.68,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.cardSoft,
  },
  secondaryButtonText: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
