import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { AppTheme } from "@/constants/theme";
import { useNavigation, useRouter } from "expo-router";
import { Pressable, StyleSheet } from "react-native";

type HeaderBackButtonProps = {
  tintColor?: string;
  fallbackPath?: "/home" | "/profile" | "/rides";
};

export default function HeaderBackButton({
  tintColor = AppTheme.colors.text,
  fallbackPath,
}: HeaderBackButtonProps) {
  const navigation = useNavigation();
  const router = useRouter();
  const canGoBack = navigation.canGoBack();

  if (!canGoBack && !fallbackPath) {
    return null;
  }

  return (
    <Pressable
      accessibilityLabel="Буцах"
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => {
        if (canGoBack) {
          navigation.goBack();
          return;
        }

        if (fallbackPath) {
          router.replace(fallbackPath);
        }
      }}
      style={styles.button}
    >
      <MaterialIcons name="arrow-back" size={22} color={tintColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.cardSoft,
  },
});
