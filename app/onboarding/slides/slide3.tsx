import { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  active: boolean;
};

export default function Slide3({ active }: Props) {
  const titleFade = useRef(new Animated.Value(0)).current;
  const bulletsFade = useRef(new Animated.Value(0)).current;
  const highlightFade = useRef(new Animated.Value(0)).current;
  const imageFade = useRef(new Animated.Value(0)).current;
  const dotsFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    // 🔁 RESET
    titleFade.setValue(0);
    bulletsFade.setValue(0);
    highlightFade.setValue(0);
    imageFade.setValue(0);
    dotsFade.setValue(0);

    Animated.stagger(200, [
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(bulletsFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(highlightFade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(imageFade, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.timing(dotsFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, bulletsFade, dotsFade, highlightFade, imageFade, titleFade]);

  return (
    <View style={styles.container}>
      {/* TITLE */}
      <Animated.Text style={[styles.title, { opacity: titleFade }]}>
        Бүх талдаа ашигтай
      </Animated.Text>

      {/* DOUBLE BULLETS */}
      <Animated.View style={{ opacity: bulletsFade }}>
        <View style={styles.doubleBullets}>
          {/* LEFT */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Жолооч:</Text>
            <Text style={styles.bullet}>• Бензин</Text>
            <Text style={styles.bullet}>• Машин хожно</Text>
            <Text style={styles.bullet}>• Илүү зардалгүй</Text>
          </View>

          {/* RIGHT */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>Зорчигч:</Text>
            <Text style={styles.bullet}>• Таксинаас хямд</Text>
            <Text style={styles.bullet}>• Найдвартай</Text>
            <Text style={styles.bullet}>• Ойр, хурдан</Text>
          </View>
        </View>
      </Animated.View>

      {/* HIGHLIGHT */}
      <Animated.Text style={[styles.highlight, { opacity: highlightFade }]}>
        Хүн бүрт ашигтай байж чадвал{"\n"}
        систем тогтвортой байна.{"\n"} Win & Win
      </Animated.Text>

      {/* IMAGE */}
      <Animated.Image
        source={require("../../../assets/slide/slide3.png")}
        style={[styles.image, { opacity: imageFade }]}
        resizeMode="contain"
      />

      {/* DOTS */}
      <Animated.View style={[styles.dots, { opacity: dotsFade }]}>
        <Animated.View style={styles.dot} />
        <Animated.View style={styles.dot} />
        <Animated.View style={[styles.dot, styles.dotActive]} />
        <Animated.View style={styles.dot} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
  },

  title: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: "700",
    color: "#2F6B57",
    textAlign: "center",
    lineHeight: 30,
  },

  doubleBullets: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingHorizontal: 20,
  },

  column: {
    flex: 1,
  },

  columnTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2F6B57",
    marginBottom: 6,
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
    height: 400,
    marginTop: 25,
  },

  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
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
});
