import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export default function Slide1() {
  // opacity values
  const titleFade = useRef(new Animated.Value(0)).current;
  const descFade = useRef(new Animated.Value(0)).current;
  const bulletsFade = useRef(new Animated.Value(0)).current;
  const highlightFade = useRef(new Animated.Value(0)).current;
  const imageFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(200, [
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(descFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(bulletsFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(highlightFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(imageFade, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>

        {/* TITLE */}
        <Animated.Text style={[styles.title, { opacity: titleFade }]}>
          Хотын түгжрэл бидний цагийг {"\n"} үрж байна
        </Animated.Text>

        {/* DESC */}
        <Animated.Text style={[styles.desc, { opacity: descFade }]}>
          Өдөр бүр мянга мянган машин
          ганц хүн {"\n"}тээвэрлэн зам дээр гарч байна.
        </Animated.Text>

        {/* BULLETS */}
        <Animated.View style={{ opacity: bulletsFade }}>
          <View style={styles.bullets}>
            <Text style={styles.bullet}>• зам түгжинэ</Text>
            <Text style={styles.bullet}>• цаг үрэгдэнэ</Text>
            <Text style={styles.bullet}>• агаар бохирдоно</Text>
          </View>
        </Animated.View>

        {/* HIGHLIGHT */}
        <Animated.Text style={[styles.highlight, { opacity: highlightFade }]}>
          Гэтэл хэн нэг машины{"\n"}
          сул суудал бий...
        </Animated.Text>

        {/* IMAGE */}
        <Animated.Image
          source={require("../../../assets/slide/slide1.png")}
          style={[styles.image, { opacity: imageFade }]}
          resizeMode="contain"
        />
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
  },

  content: {
    flex: 1,
    alignItems: "center",
  },

  title: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "700",
    color: "#2F6B57",
    textAlign: "center",
    lineHeight: 30,
  },

  desc: {
    marginTop: 12,
    fontSize: 14,
    color: "#6E8F85",
    textAlign: "center",
    lineHeight: 22,
  },

  bullets: {
    marginTop: 14,
    alignItems: "center",
  },

  bullet: {
    fontSize: 14,
    color: "#6E8F85",
    lineHeight: 22,
  },

  highlight: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "600",
    color: "#4CAF8C",
    textAlign: "center",
  },

  image: {
    width: "100%",
    height: 320,
    marginTop: 8,
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 5,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D9E5E1",
    marginHorizontal: 4,
  },

  dotActive: {
    backgroundColor: "#4CAF8C",
    width: 16,
  },

  footer: {
    paddingVertical: 12,
    alignItems: "center",
  },
});
