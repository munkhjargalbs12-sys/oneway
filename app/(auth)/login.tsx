import { AppTheme } from "@/constants/theme";
import * as NavigationBar from "expo-navigation-bar";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import AuthModal from "../../components/AuthModal";
import { saveToken, saveUser, setGuestMode } from "../../services/authStorage";

import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { height, width } = Dimensions.get("window");
const SYSTEM_BAR_BACKGROUND = AppTheme.colors.canvas;

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
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setButtonStyleAsync("dark").catch(() => null);
    NavigationBar.setBackgroundColorAsync(SYSTEM_BAR_BACKGROUND).catch(() => null);
  }, []);

  return (
    <View style={styles.safe}>
      <StatusBar backgroundColor={SYSTEM_BAR_BACKGROUND} barStyle="dark-content" />

      <View style={styles.container}>
        <Animated.View
          style={[
            styles.heroArea,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logoMark}
            resizeMode="contain"
          />

          <View style={styles.heroIllustration}>
            <Image
              source={require("../../assets/images/city1.png")}
              style={styles.heroCity}
              resizeMode="contain"
            />
            <Image
              source={require("../../assets/images/car3.png")}
              style={styles.heroCar}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.copyBlock,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Image
            source={require("../../assets/images/oneWay.png")}
            style={styles.titleImage}
            resizeMode="contain"
          />
          <Text style={styles.subtitle}>Итгэлцэл биднийг холбодог</Text>
        </Animated.View>

        <View style={styles.actionStack}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setOpenAuth(true)}>
            <Text style={styles.primaryButtonText}>Start</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push("../(auth)/register")}
          >
            <Text style={styles.secondaryButtonText}>Шинээр бүртгүүлэх</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostAction}
            onPress={async () => {
              await setGuestMode();
              router.replace("/(tabs)/home");
            }}
          >
            <Text style={styles.guestText}>Зочин байдлаар үргэлжлүүлэх</Text>
          </TouchableOpacity>

          {__DEV__ ? (
            <TouchableOpacity onPress={() => router.push("/api-check")}>
              <Text style={styles.debugText}>API шалгах</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Image
          source={require("../../assets/images/city1.png")}
          style={styles.bottomImage}
          resizeMode="contain"
        />
      </View>

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
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
  },
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 22,
    alignItems: "center",
    overflow: "hidden",
  },
  heroArea: {
    width: "100%",
    minHeight: Math.min(height * 0.46, 410),
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 10,
    zIndex: 1,
  },
  logoMark: {
    width: 74,
    height: 94,
    marginBottom: 10,
  },
  heroIllustration: {
    width: "100%",
    height: Math.min(height * 0.28, 250),
    alignItems: "center",
    justifyContent: "flex-end",
  },
  heroCity: {
    position: "absolute",
    bottom: Math.min(height * 0.06, 48),
    width: Math.min(width * 0.96, 380),
    height: Math.min(height * 0.13, 112),
    opacity: 0.72,
  },
  heroCar: {
    width: Math.min(width * 1.06, 410),
    height: Math.min(height * 0.22, 206),
  },
  copyBlock: {
    width: "100%",
    alignItems: "center",
    marginTop: 2,
    marginBottom: 24,
    zIndex: 1,
  },
  titleImage: {
    width: Math.min(width * 0.7, 286),
    height: 66,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 18,
    color: AppTheme.colors.text,
    lineHeight: 26,
    textAlign: "center",
    maxWidth: 250,
  },
  actionStack: {
    width: "100%",
    marginTop: "auto",
    marginBottom: Math.min(height * 0.08, 70),
    zIndex: 1,
  },
  primaryButton: {
    height: 56,
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    ...AppTheme.shadow.card,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 54,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.card,
    marginTop: 12,
  },
  secondaryButtonText: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  ghostAction: {
    marginTop: 16,
    alignItems: "center",
  },
  guestText: {
    fontSize: 14,
    color: AppTheme.colors.textMuted,
  },
  debugText: {
    marginTop: 12,
    fontSize: 13,
    color: AppTheme.colors.accentDeep,
    fontWeight: "600",
    textAlign: "center",
  },
  bottomImage: {
    position: "absolute",
    bottom: -12,
    width: Math.min(width * 1.2, 470),
    height: Math.min(height * 0.15, 132),
    opacity: 0.78,
  },
});
