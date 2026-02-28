import { router, useLocalSearchParams } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

const TIMES = [
  { label: "🌅 Өглөө (06–10)", value: "morning" },
  { label: "☀️ Өдөр (10–17)", value: "day" },
  { label: "🌙 Орой (17–22)", value: "evening" },
];

export default function Time() {
  const { location, radius } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 20 }}>
        ⏰ Аль цагт?
      </Text>

      {TIMES.map((t) => (
        <TouchableOpacity
          key={t.value}
          onPress={() =>
            router.push(
              `/location?location=${location}&radius=${radius}&time=${t.value}`
            )
          }
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#dcfce7",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16 }}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
