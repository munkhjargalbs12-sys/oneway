import { AppTheme } from "@/constants/theme";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.card}>
          <Text style={styles.eyebrow}>Нэвтрэх</Text>
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
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Text style={styles.eyeIcon}>{showPassword ? "🙈" : "👁"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.rememberRow}
            onPress={() => setRememberMe(!rememberMe)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.checkbox,
                rememberMe && styles.checkboxActive,
              ]}
            />
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

          <TouchableOpacity
            onPress={() => {
              onClose();
              router.push("/api-check");
            }}
          >
            <Text style={styles.debugLink}>API шалгах</Text>
          </TouchableOpacity>

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

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>Хаах</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(18, 28, 24, 0.48)",
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
    fontSize: 24,
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
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 16,
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
    borderRadius: 16,
    marginBottom: 12,
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
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: AppTheme.colors.accent,
    marginRight: 8,
    backgroundColor: AppTheme.colors.card,
  },
  checkboxActive: {
    backgroundColor: AppTheme.colors.accent,
  },
  rememberText: {
    fontSize: 14,
    color: AppTheme.colors.textMuted,
  },
  forgotText: {
    marginBottom: 8,
    textAlign: "right",
    color: AppTheme.colors.accentDeep,
    fontSize: 14,
    fontWeight: "600",
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
    backgroundColor: "#f7e2dc",
    borderWidth: 1,
    borderColor: "#ebc7bc",
  },
  error: {
    color: AppTheme.colors.danger,
    textAlign: "center",
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
  close: {
    marginTop: 12,
    textAlign: "center",
    color: AppTheme.colors.textMuted,
  },
});
