import { AppTheme } from "@/constants/theme";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { login } from "../services/api";
import {
  clearRemembered,
  getRemembered,
  saveRemembered,
} from "../services/authStorage";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (token: string, user: any) => void;
};

export default function AuthModal({ visible, onClose, onSuccess }: Props) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const loadRemembered = async () => {
      const creds = await getRemembered();
      if (creds) {
        setPhone(creds.phone);
        setPassword(creds.password);
        setRememberMe(true);
      } else {
        setPhone("");
        setPassword("");
        setRememberMe(false);
      }
    };

    if (visible) loadRemembered();
  }, [visible]);

  const submit = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await login(phone, password);

      if (res.message) {
        setError(res.message);
      } else if (res.token && res.user) {
        if (rememberMe) {
          await saveRemembered(phone, password);
        } else {
          await clearRemembered();
        }

        onSuccess(res.token, res.user);
        onClose();
      } else {
        setError("Серверээс буруу хариу ирлээ");
      }
    } catch {
      setError("Сервертэй холбогдож чадсангүй");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.card}>
          <View style={styles.handle} />
          <Text style={styles.eyebrow}>One-Way</Text>
          <Text style={styles.title}>Тавтай морил</Text>
          <Text style={styles.subtitle}>
            Утасны дугаар болон нууц үгээ оруулаад аяллаа үргэлжлүүлээрэй.
          </Text>

          <TextInput
            placeholder="Утасны дугаар"
            placeholderTextColor={AppTheme.colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
          />

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Нууц үг"
              placeholderTextColor={AppTheme.colors.textMuted}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={styles.passwordInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? "Нууц үг нуух" : "Нууц үг харах"}
            >
              <MaterialIcons
                name={showPassword ? "visibility-off" : "visibility"}
                size={21}
                color={AppTheme.colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.optionRow}>
            <TouchableOpacity
              style={styles.rememberRow}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxActive]}>
                {rememberMe ? (
                  <MaterialIcons name="check" size={14} color={AppTheme.colors.white} />
                ) : null}
              </View>
              <Text style={styles.rememberText}>Намайг сана</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push("../(auth)/forget-password");
              }}
            >
              <Text style={styles.forgotText}>Нууц үг мартсан?</Text>
            </TouchableOpacity>
          </View>

          {__DEV__ ? (
            <TouchableOpacity
              onPress={() => {
                onClose();
                router.push("/api-check");
              }}
            >
              <Text style={styles.debugLink}>API шалгах</Text>
            </TouchableOpacity>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={AppTheme.colors.white} />
            ) : (
              <Text style={styles.buttonText}>Нэвтрэх</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.close}>Хаах</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(41, 77, 86, 0.24)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.floating,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 4,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accentSoft,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: AppTheme.colors.accent,
    marginBottom: 8,
    textAlign: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
    color: AppTheme.colors.text,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: AppTheme.colors.textMuted,
    textAlign: "center",
    marginBottom: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    color: AppTheme.colors.text,
    backgroundColor: AppTheme.colors.cardSoft,
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 18,
    marginBottom: 12,
    backgroundColor: AppTheme.colors.cardSoft,
  },
  passwordInput: {
    flex: 1,
    padding: 14,
    color: AppTheme.colors.text,
  },
  eyeButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: AppTheme.colors.accent,
    marginRight: 8,
    backgroundColor: AppTheme.colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: AppTheme.colors.accent,
  },
  rememberText: {
    fontSize: 14,
    color: AppTheme.colors.textMuted,
  },
  forgotText: {
    color: AppTheme.colors.accentDeep,
    fontSize: 14,
    fontWeight: "700",
  },
  debugLink: {
    marginBottom: 10,
    textAlign: "right",
    color: AppTheme.colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  errorCard: {
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: "#FFF0EC",
    borderWidth: 1,
    borderColor: "#F3CFC5",
  },
  error: {
    color: AppTheme.colors.danger,
    textAlign: "center",
  },
  button: {
    backgroundColor: AppTheme.colors.accent,
    padding: 15,
    borderRadius: AppTheme.radius.pill,
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
  closeButton: {
    paddingTop: 12,
  },
  close: {
    textAlign: "center",
    color: AppTheme.colors.textMuted,
    fontWeight: "600",
  },
});
