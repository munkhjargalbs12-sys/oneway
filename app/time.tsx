import { AppFontFamily, AppTheme } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const TIMES = [
  { label: "Өглөө", range: "06:00-10:00", value: "morning" },
  { label: "Өдөр", range: "10:00-17:00", value: "day" },
  { label: "Орой", range: "17:00-22:00", value: "evening" },
];

export default function Time() {
  const { location, radius } = useLocalSearchParams();

  return (
    <View style={styles.safe}>
      <LinearGradient
        colors={[AppTheme.colors.text, AppTheme.colors.accentDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <Text style={styles.heroEyebrow}>Time Window</Text>
        <Text style={styles.heroTitle}>Явах цагийн бүсээ сонгоно уу</Text>
        <Text style={styles.heroBody}>
          Энэ нь дараагийн дэлгэц дээр илүү тохирох аяллыг урьдчилан шүүж харахад тусална.
        </Text>
      </LinearGradient>

      <View style={styles.listWrap}>
        {TIMES.map((item) => (
          <TouchableOpacity
            key={item.value}
            activeOpacity={0.92}
            onPress={() =>
              router.push(`/location?location=${location}&radius=${radius}&time=${item.value}`)
            }
            style={styles.optionCard}
          >
            <Text style={styles.optionTitle}>{item.label}</Text>
            <Text style={styles.optionBody}>{item.range}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  heroCard: {
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 22,
    paddingVertical: 24,
    ...AppTheme.shadow.floating,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 10,
    fontFamily: AppFontFamily,
  },
  heroTitle: {
    color: AppTheme.colors.white,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  heroBody: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  listWrap: {
    marginTop: 16,
  },
  optionCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  optionTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  optionBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
});
