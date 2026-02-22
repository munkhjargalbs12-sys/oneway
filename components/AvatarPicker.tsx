import { Image, StyleSheet, TouchableOpacity, View } from "react-native";

const avatars = [
  { id: "child", src: require("../assets/profile/avatars/child.png") },
  { id: "father", src: require("../assets/profile/avatars/father.png") },
  { id: "grandfa", src: require("../assets/profile/avatars/grandfa.png") },
  { id: "grandma", src: require("../assets/profile/avatars/grandma.png") },
  { id: "guy", src: require("../assets/profile/avatars/guy.png") },
  { id: "mother", src: require("../assets/profile/avatars/mother.png") },
  { id: "sister", src: require("../assets/profile/avatars/sister.png") },
  { id: "women", src: require("../assets/profile/avatars/women.png") },
];

export default function AvatarPicker({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  return (
    <View style={styles.grid}>
      {avatars.map((a) => (
        <TouchableOpacity
          key={a.id}
          style={styles.item}
          onPress={() => onSelect(a.id)}
        >
          <Image source={a.src} style={styles.avatar} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginTop: 12,
  },
  item: {
    width: "22%",
    aspectRatio: 1,
    marginBottom: 12,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
});
