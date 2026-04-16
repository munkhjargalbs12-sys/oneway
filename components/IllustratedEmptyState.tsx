import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppFontFamily, AppTheme } from "@/constants/theme";

import AppIconBadge from "./AppIconBadge";

type IconName = ComponentProps<typeof MaterialIcons>["name"];
type Tone = "accent" | "gold" | "ink";

type Props = {
  icon: IconName;
  title: string;
  body: string;
  eyebrow?: string;
  tone?: Tone;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

function getTonePalette(tone: Tone) {
  switch (tone) {
    case "gold":
      return {
        badgeTheme: "gold" as const,
        orb: "rgba(200, 155, 60, 0.16)",
        orbSoft: "rgba(200, 155, 60, 0.08)",
        panel: "#fbf4e3",
        line: "#edd8aa",
      };
    case "ink":
      return {
        badgeTheme: "dark" as const,
        orb: "rgba(31, 79, 62, 0.14)",
        orbSoft: "rgba(31, 79, 62, 0.07)",
        panel: "#f1eee8",
        line: "#d7d2c8",
      };
    case "accent":
    default:
      return {
        badgeTheme: "accent" as const,
        orb: "rgba(47, 107, 83, 0.16)",
        orbSoft: "rgba(47, 107, 83, 0.08)",
        panel: AppTheme.colors.accentGlow,
        line: AppTheme.colors.accentSoft,
      };
  }
}

export default function IllustratedEmptyState({
  icon,
  title,
  body,
  eyebrow,
  tone = "accent",
  compact = false,
  style,
}: Props) {
  const reveal = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const palette = useMemo(() => getTonePalette(tone), [tone]);

  useEffect(() => {
    reveal.setValue(0);
    float.setValue(0);
    pulse.setValue(0);

    const revealAnim = Animated.parallel([
      Animated.timing(reveal, {
        toValue: 1,
        duration: 460,
        useNativeDriver: true,
      }),
    ]);

    const floatAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2400,
          useNativeDriver: true,
        }),
      ])
    );

    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1700,
          useNativeDriver: true,
        }),
      ])
    );

    revealAnim.start();
    floatAnim.start();
    pulseAnim.start();

    return () => {
      revealAnim.stop();
      floatAnim.stop();
      pulseAnim.stop();
    };
  }, [float, pulse, reveal]);

  return (
    <Animated.View
      style={[
        styles.card,
        compact ? styles.cardCompact : null,
        style,
        {
          opacity: reveal,
          transform: [
            {
              translateY: reveal.interpolate({
                inputRange: [0, 1],
                outputRange: [18, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.illustration, { backgroundColor: palette.panel }]}>
        <Animated.View
          style={[
            styles.orbLarge,
            { backgroundColor: palette.orb },
            {
              transform: [
                {
                  translateY: float.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -8],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.orbSmallLeft,
            { backgroundColor: palette.orbSoft },
            {
              transform: [
                {
                  translateY: float.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 6],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.orbSmallRight,
            { backgroundColor: palette.orbSoft },
            {
              transform: [
                {
                  translateY: float.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={[
            styles.centerBadgeWrap,
            {
              transform: [
                {
                  translateY: float.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -5],
                  }),
                },
                {
                  scale: pulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.05],
                  }),
                },
              ],
            },
          ]}
        >
          <AppIconBadge
            name={icon}
            size={32}
            theme={palette.badgeTheme}
            style={styles.heroBadge}
          />
        </Animated.View>

        <View
          style={[
            styles.trailLine,
            {
              backgroundColor: palette.line,
            },
          ]}
        />
      </View>

      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    ...AppTheme.shadow.card,
  },
  cardCompact: {
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  illustration: {
    width: "100%",
    height: 132,
    borderRadius: 22,
    marginBottom: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  orbLarge: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 999,
    top: 14,
    left: "50%",
    marginLeft: -54,
  },
  orbSmallLeft: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 999,
    top: 34,
    left: 26,
  },
  orbSmallRight: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 999,
    bottom: 28,
    right: 34,
  },
  centerBadgeWrap: {
    zIndex: 2,
  },
  heroBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
  },
  trailLine: {
    position: "absolute",
    width: 88,
    height: 6,
    borderRadius: 999,
    bottom: 30,
    opacity: 0.8,
  },
  eyebrow: {
    color: AppTheme.colors.accentDeep,
    fontFamily: AppFontFamily,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 8,
    textAlign: "center",
  },
  title: {
    color: AppTheme.colors.text,
    fontFamily: AppFontFamily,
    fontSize: 20,
    lineHeight: 26,
    textAlign: "center",
  },
  body: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
  },
});
