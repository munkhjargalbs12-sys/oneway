import { router, useLocalSearchParams } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

const RADII = [
  { label: "500 м", value: 500 },
  { label: "1 км", value: 1000 },
  { label: "2 км", value: 2000 },
];

export default function Radius() {
  const { location } = useLocalSearchParams();

  return (
    <View style={{ flex: 1, padding: 24, backgroundColor: "#fff" }}>
      <Text style={{ fontSize: 22, fontWeight: "600", marginBottom: 20 }}>
        📏 Ойр зай сонгох
      </Text>

      {RADII.map((r) => (
        <TouchableOpacity
          key={r.value}
          onPress={() =>
            router.push(
              `/time?location=${location}&radius=${r.value}`
            )
          }
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: "#e0f2fe",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16 }}>{r.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}
