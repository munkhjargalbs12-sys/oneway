import * as NavigationBar from "expo-navigation-bar";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
// Safe area provided by root layout
import AuthModal from "../../components/AuthModal";
import { saveToken, saveUser, setGuestMode } from "../../services/authStorage";

import {
  Animated,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { height } = Dimensions.get("window");

export default function LoginScreen() {
  const [openAuth, setOpenAuth] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    NavigationBar.setBackgroundColorAsync("#5c5c5c");
    NavigationBar.setButtonStyleAsync("dark");
  }, []);

  return (
    <View style={styles.safe}>
      <StatusBar backgroundColor="#4e4e4e" barStyle="dark-content" />

      <View style={styles.container}>
        <View style={styles.main}>
          <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
          <Image source={require("../../assets/images/car3.png")} style={styles.hero} resizeMode="contain" />
          <Image source={require("../../assets/images/oneWay.png")} style={styles.titleImage} resizeMode="contain" />

          <Animated.Text
            style={[
              styles.subtitle,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            Хотын түгжирлийг хэн нэгэн биш та,{"\n"}
            би, бид хамтдаа бууруулж чадна
          </Animated.Text>

          {/* 🔐 LOGIN BUTTON */}
          <TouchableOpacity
            style={styles.button}
            onPress={() => setOpenAuth(true)}
          >
            <Text style={styles.buttonText}>Нэвтрэх</Text>
          </TouchableOpacity>

          {/* 👤 GUEST MODE */}
          <TouchableOpacity
            onPress={async () => {
              await setGuestMode();
              router.replace("/(tabs)/home");
            }}
          >
            <Text style={styles.guestText}>Зочин байдлаар үргэлжлүүлэх</Text>
          </TouchableOpacity>

          {/* 🆕 REGISTER */}
          <TouchableOpacity onPress={() => router.push("../(auth)/register")}>
            <Text style={styles.registerText}>Шинээр бүртгүүлэх</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Image
            source={require("../../assets/images/city1.png")}
            style={styles.bottomImage}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* 🔐 AUTH MODAL */}
      <AuthModal
        visible={openAuth}
        onClose={() => setOpenAuth(false)}
        onSuccess={async (token, user) => {
          await saveToken(token);
          await saveUser(user);
          setOpenAuth(false);
          router.replace("/(tabs)/home");
        }}
      />
    </View>
  );
}


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F6F8F7" },

  container: {
    flex: 1,
    backgroundColor: "#F6F8F7",
    paddingHorizontal: 24,
    paddingTop: 10,
  },

  main: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  logo: { width: "28%", height: 30, marginBottom: 12 },

  hero: {
    width: "100%",
    height: Math.min(height * 0.18, 180),
    marginBottom: 12,
  },

  titleImage: {
    width: "85%",
    maxWidth: 320,
    height: 70,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 15,
    color: "#4B7F73",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
  },

  button: {
    width: "100%",
    height: 54,
    backgroundColor: "#4CAF8C",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  guestText: {
    marginTop: 18,
    fontSize: 14,
    color: "#888",
  },

  registerText: {
    marginTop: 10,
    fontSize: 14,
    color: "#4CAF8C",
    fontWeight: "600",
  },

  footer: {
    width: "100%",
    alignItems: "center",
  },

  bottomImage: {
    width: "100%",
    height: Math.min(height * 0.16, 140),
    opacity: 0.9,
  },
});
