import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { AppTheme } from "@/constants/theme";
import { router } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";

type MapOverlayBackButtonProps = {
  top?: number;
  left?: number;
};

export default function MapOverlayBackButton({
  top = 16,
  left = 16,
}: MapOverlayBackButtonProps) {
  return (
    <View style={[styles.wrap, { top, left }]}>
      <TouchableOpacity
        accessibilityLabel="Буцах"
        accessibilityRole="button"
        activeOpacity={0.9}
        onPress={() => router.back()}
        style={styles.button}
      >
        <MaterialIcons name="arrow-back" size={22} color={AppTheme.colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    zIndex: 30,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,253,248,0.96)",
    borderWidth: 1,
    borderColor: "rgba(222,212,197,0.92)",
    ...AppTheme.shadow.card,
  },
});
