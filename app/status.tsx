import { Text, View } from "react-native";

export default function Status() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24 }}>🟡 Жолоочийн зөвшөөрөл хүлээж байна</Text>
      <Text style={{ marginTop: 8, color: "#555" }}>
        Жолооч баталгаажуулна
      </Text>
    </View>
  );
}
