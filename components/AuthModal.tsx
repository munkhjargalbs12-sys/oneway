import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { login } from "../services/api";
import {
  saveRemembered,
  getRemembered,
  clearRemembered,
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

  // ⭐ Modal нээгдэх бүрд санасан мэдээлэл байвал бөглөнө
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
        // ⭐ "Намайг сана" логик
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
    } catch (e) {
      setError("Сервертэй холбогдож чадсангүй");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Нэвтрэх</Text>

          <TextInput
            placeholder="Утасны дугаар"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            style={styles.input}
          />

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Нууц үг"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              style={styles.passwordInput}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
            >
              <Text style={{ fontSize: 18 }}>
                {showPassword ? "🙈" : "👁"}
              </Text>
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
              router.push("../(auth)/forgot-password");
            }}
          >
            <Text style={styles.forgotText}>Нууц үг мартсан?</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={submit}>
            {loading ? (
              <ActivityIndicator color="#fff" />
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#202020",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    color: "#111827",
    backgroundColor: "#fff",
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#202020",
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    color: "#111827",
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#22c55e",
    marginRight: 8,
  },
  checkboxActive: {
    backgroundColor: "#22c55e",
  },
  rememberText: {
    fontSize: 14,
    color: "#374151",
  },
  forgotText: {
    marginBottom: 8,
    textAlign: "right",
    color: "#22c55e",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
  },
  close: {
    marginTop: 10,
    textAlign: "center",
    color: "#6B7280",
  },
  error: {
    color: "#ef4444",
    marginBottom: 8,
    textAlign: "center",
  },
});
