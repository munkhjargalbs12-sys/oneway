import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AVATARS } from "../../constants/avatars";
import { register } from "../../services/api";
import { saveToken, saveUser } from "../../services/authStorage"; // ⭐ saveUser нэмэгдсэн

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"passenger" | "driver">("passenger");
  const [avatar, setAvatar] = useState("guy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async () => {
    setError("");

    if (!name || !phone || !password) {
      return setError("Бүх талбарыг бөглөнө үү");
    }

    if (phone.length !== 8) {
      return setError("Утас 8 оронтой байх ёстой");
    }

    if (password.length < 6) {
      return setError("Нууц үг дор хаяж 6 тэмдэгт");
    }

    setLoading(true);

    try {
      const res = await register({ name, phone, password, role, avatar });

      if (res.message) {
        setError(res.message);
      } else if (res.token && res.user) {
        await saveToken(res.token);
        await saveUser(res.user); // ⭐ НЭВТЭРСЭН ХЭРЭГЛЭГЧИЙГ ХАДГАЛНА
        router.replace("/(tabs)/home");
      } else {
        setError("Серверээс буруу хариу ирлээ");
      }
    } catch {
      setError("Бүртгэл амжилтгүй");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Шинээр бүртгүүлэх</Text>

      <TextInput placeholder="Нэр" value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder="Утасны дугаар" keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={styles.input} />
      <TextInput placeholder="Нууц үг" secureTextEntry value={password} onChangeText={setPassword} style={styles.input} />

      <Text style={styles.label}>Та жолооч уу зорчигч уу?</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.roleBtn, role === "passenger" && styles.roleActive]}
          onPress={() => setRole("passenger")}
        >
          <Text style={styles.roleText}>Зорчигч</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleBtn, role === "driver" && styles.roleActive]}
          onPress={() => setRole("driver")}
        >
          <Text style={styles.roleText}>Жолооч</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Аватар сонгох</Text>
      <View style={styles.avatarGrid}>
        {AVATARS.map((a) => (
          <TouchableOpacity
            key={a.id}
            onPress={() => setAvatar(a.id)}
            style={[styles.avatarWrap, avatar === a.id && styles.avatarSelected]}
          >
            <Image source={a.source} style={styles.avatarImg} />
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Бүртгүүлэх</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.back}>Буцах</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 20, textAlign: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  label: { marginBottom: 6, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10, marginBottom: 14 },
  roleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  roleActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e",
  },
  roleText: { color: "#000" },

  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "transparent",
    marginBottom: 12,
    overflow: "hidden",
  },
  avatarSelected: {
    borderColor: "#22c55e",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },

  button: {
    backgroundColor: "#22c55e",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  back: { marginTop: 16, textAlign: "center", color: "#6b7280" },
  error: { color: "red", marginBottom: 10, textAlign: "center" },
});
