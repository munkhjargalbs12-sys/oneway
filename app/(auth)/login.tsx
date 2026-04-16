import { AppTheme } from "@/constants/theme";
import * as NavigationBar from "expo-navigation-bar";
import { LinearGradient } from "expo-linear-gradient";
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
  }, [fadeAnim, slideAnim]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setButtonStyleAsync("dark").catch(() => null);
    NavigationBar.setBackgroundColorAsync(AppTheme.colors.canvas).catch(() => null);
  }, []);

  return (
    <View style={styles.safe}>
      <StatusBar backgroundColor={AppTheme.colors.canvas} barStyle="dark-content" />

      <View style={styles.container}>
        <LinearGradient
          colors={[
            AppTheme.colors.accentDeep,
            AppTheme.colors.accent,
            "#7c9c88",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.glowLarge} />
          <View style={styles.glowSmall} />

          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Text style={styles.eyebrow}>One Way</Text>
            <Image
              source={require("../../assets/images/oneWay.png")}
              style={styles.titleImage}
              resizeMode="contain"
            />
            <Text style={styles.subtitle}>
              Хотын түгжрэлийг хэн нэгэн биш та, би, бид хамтдаа бууруулж чадна
            </Text>
          </Animated.View>

          <Animated.Image
            source={require("../../assets/images/car3.png")}
            style={[
              styles.hero,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
            resizeMode="contain"
          />

          <View style={styles.heroFooterRow}>
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>Хурдан</Text>
              <Text style={styles.heroMetricLabel}>Нэвтрэх</Text>
            </View>
            <View style={styles.heroMetricDivider} />
            <View style={styles.heroMetric}>
              <Text style={styles.heroMetricValue}>Аюулгүй</Text>
              <Text style={styles.heroMetricLabel}>Аялал</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.actionCard}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => setOpenAuth(true)}>
            <Text style={styles.primaryButtonText}>Нэвтрэх</Text>
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

          <TouchableOpacity onPress={() => router.push("/api-check")}>
            <Text style={styles.debugText}>API шалгах</Text>
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
  },
  heroCard: {
    position: "relative",
    borderRadius: 32,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    minHeight: Math.min(height * 0.56, 470),
    overflow: "hidden",
    ...AppTheme.shadow.floating,
  },
  glowLarge: {
    position: "absolute",
    top: -60,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  glowSmall: {
    position: "absolute",
    bottom: -35,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  logo: {
    width: 92,
    height: 28,
    marginBottom: 18,
  },
  eyebrow: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  titleImage: {
    width: "88%",
    maxWidth: 320,
    height: 74,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.86)",
    lineHeight: 23,
    maxWidth: 310,
  },
  hero: {
    width: "100%",
    height: Math.min(height * 0.24, 220),
    marginTop: 18,
    marginBottom: 10,
  },
  heroFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginTop: "auto",
  },
  heroMetric: {
    flex: 1,
  },
  heroMetricDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginHorizontal: 14,
  },
  heroMetricValue: {
    color: AppTheme.colors.white,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  heroMetricLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
  },
  actionCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 28,
    padding: 18,
    marginTop: -24,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  primaryButton: {
    height: 56,
    backgroundColor: AppTheme.colors.accent,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.cardSoft,
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
  footer: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  bottomImage: {
    width: "100%",
    height: Math.min(height * 0.14, 124),
    opacity: 0.92,
  },
});
