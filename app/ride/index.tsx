import { StyleSheet, Text, View, } from "react-native";

export default function RideIndex() {
  return (
    <View style={styles.test}>
      <Text>RTest</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  test: {
    flex: 1,
    backgroundColor: "#5f3838",
    paddingHorizontal: 12,
    
  },
}
)