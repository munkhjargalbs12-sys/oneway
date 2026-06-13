/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#4CAF8C';
const tintColorDark = '#fff';

export const AppFontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'sans-serif',
  web: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
});

export const LegacyAppTheme = {
  colors: {
    canvas: '#f4efe6',
    canvasMuted: '#ede5d8',
    card: '#fffdf8',
    cardSoft: '#f8f3ea',
    text: '#1d2b24',
    textMuted: '#5c6d61',
    accent: '#2f6b53',
    accentDeep: '#1f4f3e',
    accentSoft: '#d7e7dd',
    accentGlow: '#edf6f0',
    gold: '#c89b3c',
    warning: '#b77932',
    danger: '#b4533b',
    border: '#ded4c5',
    white: '#ffffff',
    badge: '#d85d48',
    shadow: '#18201c',
    tabBar: '#eef8f1',
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    pill: 999,
  },
  shadow: {
    card: {
      shadowColor: '#18201c',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 20,
      elevation: 5,
    },
    floating: {
      shadowColor: '#18201c',
      shadowOpacity: 0.14,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 28,
      elevation: 8,
    },
  },
} as const;

export const AppTheme = {
  colors: {
    canvas: '#F7FAF8',
    canvasMuted: '#EEF6F1',
    card: '#FFFFFF',
    cardSoft: '#F2FAF5',
    text: '#294D56',
    textMuted: '#7A8B8D',
    accent: '#4CAF8C',
    accentDeep: '#24786B',
    accentSoft: '#D9F0E6',
    accentGlow: '#EEF9F3',
    gold: '#E8B84B',
    warning: '#CF8A35',
    danger: '#D85D48',
    border: '#DFEAE5',
    white: '#FFFFFF',
    badge: '#F06A55',
    shadow: '#2D4C45',
    tabBar: '#FFFFFF',
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 24,
    pill: 999,
  },
  shadow: {
    card: {
      shadowColor: '#2D4C45',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 18,
      elevation: 4,
    },
    floating: {
      shadowColor: '#2D4C45',
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 12 },
      shadowRadius: 26,
      elevation: 7,
    },
  },
} as const;

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
