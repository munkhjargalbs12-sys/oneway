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

export default function Slide2({ active }: Props) {
  const titleFade = useRef(new Animated.Value(0)).current;
  const descFade = useRef(new Animated.Value(0)).current;
  const bulletsFade = useRef(new Animated.Value(0)).current;
  const highlightFade = useRef(new Animated.Value(0)).current;
  const imageFade = useRef(new Animated.Value(0)).current;
  const dotsFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    // 🔁 RESET
    titleFade.setValue(0);
    descFade.setValue(0);
    bulletsFade.setValue(0);
    highlightFade.setValue(0);
    imageFade.setValue(0);
    dotsFade.setValue(0);

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
      Animated.timing(dotsFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active, bulletsFade, descFade, dotsFade, highlightFade, imageFade, titleFade]);

  return (
    <View style={styles.container}>
      {/* TITLE */}
      <Animated.Text style={[styles.title, { opacity: titleFade }]}>
        Нэг чиглэл олон хүний {"\n"} боломж
      </Animated.Text>

      {/* DESCRIPTION */}
      <Animated.Text style={[styles.desc, { opacity: descFade }]}>
        OneWay нь нэг чиглэлд яваа
        хүмүүсийг{"\n"} хооронд нь холбож өгнө.
      </Animated.Text>

      {/* BULLETS */}
      <Animated.View style={{ opacity: bulletsFade }}>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>
            • Жолооч та ажилдаа явах, гэртээ харихдаа
          </Text>
          <Text style={styles.bullet}>
            • Зорчигч та нэг чиглэлтэй бол
          </Text>
          <Text style={styles.bullet}>
            • Хоёулаа илүү ашигтайгаар зорчино
          </Text>
        </View>
      </Animated.View>

      {/* HIGHLIGHT */}
      <Animated.Text style={[styles.highlight, { opacity: highlightFade }]}>
        Магадгүй жолооч таны ажилдаа яваад ирэх {"\n"}
        чиглэлд хэн нэгэн бас явж л байгаа шүүдээ{"\n"}
        бидэнд илүү машин хэрэггүй
      </Animated.Text>

      {/* IMAGE */}
      <Animated.Image
        source={require("../../../assets/slide/slide2.png")}
        style={[styles.image, { opacity: imageFade }]}
        resizeMode="contain"
      />

      {/* DOTS */}
      <Animated.View style={[styles.dots, { opacity: dotsFade }]}>
        <Animated.View style={styles.dot} />
        <Animated.View style={[styles.dot, styles.dotActive]} />
        <Animated.View style={styles.dot} />
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
    textAlign: "center",
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
    marginTop: 5,
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
