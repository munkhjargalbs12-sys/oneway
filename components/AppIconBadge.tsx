import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import type { ComponentProps } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppTheme } from "@/constants/theme";

type IconName = ComponentProps<typeof MaterialIcons>["name"];
type BadgeTheme = "accent" | "gold" | "light" | "dark";

type Props = {
  name: IconName;
  size?: number;
  theme?: BadgeTheme;
  style?: StyleProp<ViewStyle>;
};

function getThemeColors(theme: BadgeTheme) {
  switch (theme) {
    case "gold":
      return {
        backgroundColor: "#f5ead0",
        borderColor: "#e8d2a4",
        iconColor: AppTheme.colors.gold,
      };
    case "light":
      return {
        backgroundColor: "rgba(255,255,255,0.16)",
        borderColor: "rgba(255,255,255,0.18)",
        iconColor: AppTheme.colors.white,
      };
    case "dark":
      return {
        backgroundColor: AppTheme.colors.cardSoft,
        borderColor: AppTheme.colors.border,
        iconColor: AppTheme.colors.text,
      };
    case "accent":
    default:
      return {
        backgroundColor: AppTheme.colors.accentGlow,
        borderColor: AppTheme.colors.accentSoft,
        iconColor: AppTheme.colors.accentDeep,
      };
  }
}

export default function AppIconBadge({
  name,
  size = 18,
  theme = "accent",
  style,
}: Props) {
  const palette = getThemeColors(theme);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
        },
        style,
      ]}
    >
      <MaterialIcons name={name} size={size} color={palette.iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 38,
    height: 38,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
