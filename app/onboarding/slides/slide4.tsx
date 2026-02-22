import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";


type Props = {
  active: boolean;
};

export default function Slide4({ active }: Props) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // fade values
  const titleFade = useRef(new Animated.Value(0)).current;
  const descFade = useRef(new Animated.Value(0)).current;
  const bulletsFade = useRef(new Animated.Value(0)).current;
  const highlightFade = useRef(new Animated.Value(0)).current;
  const imageFade = useRef(new Animated.Value(0)).current;
  const dotsFade = useRef(new Animated.Value(0)).current;
  const bottomFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    // 🔁 RESET
    titleFade.setValue(0);
    descFade.setValue(0);
    bulletsFade.setValue(0);
    highlightFade.setValue(0);
    imageFade.setValue(0);
    dotsFade.setValue(0);
    bottomFade.setValue(0);

    Animated.stagger(200, [
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(descFade, {
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
      Animated.timing(bottomFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [active]);

  return (
    <View style={styles.container}>
      {/* TITLE */}
      <Animated.Text style={[styles.title, { opacity: titleFade }]}>
        Хотын түгжрэлийг хамтдаа {"\n"} бууруулъя
      </Animated.Text>

      {/* DESC */}
      <Animated.Text style={[styles.desc, { opacity: descFade }]}>
        Нэг машинд 3–5 хүн суувал
      </Animated.Text>

      {/* BULLETS */}
      <Animated.View style={{ opacity: bulletsFade }}>
        <View style={styles.bullets}>
          <Text style={styles.bullet}>• Түгжрэл багасна</Text>
          <Text style={styles.bullet}>• Агаар цэвэршинэ</Text>
          <Text style={styles.bullet}>• Хот амар тайван болно</Text>
        </View>
      </Animated.View>

      {/* HIGHLIGHT */}
      <Animated.Text style={[styles.highlight, { opacity: highlightFade }]}>
        OneWay таны амьдралд тусалж, хотод {"\n"}
        эерэг өөрчлөлт авчирна. {"\n"}Win & Win & Win
      </Animated.Text>

      {/* IMAGE */}
      <Animated.Image
        source={require("../../../assets/slide/slide4.png")}
        style={[styles.image, { opacity: imageFade }]}
        resizeMode="contain"
      />

      {/* DOTS */}
      <Animated.View style={[styles.dots, { opacity: dotsFade }]}>
        <Animated.View style={styles.dot} />
        <Animated.View style={styles.dot} />
        <Animated.View style={styles.dot} />
        <Animated.View style={[styles.dot, styles.dotActive]} />
      </Animated.View>

      {/* BOTTOM ACTION */}
      <Animated.View style={{ opacity: bottomFade }}>
        {/* CHECKBOX */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setDontShowAgain(!dontShowAgain)}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.checkbox,
              dontShowAgain && styles.checkboxActive,
            ]}
          >
            {dontShowAgain && <View style={styles.checkboxDot} />}
          </View>

          <Text style={styles.checkboxText}>
            ахин харуулахгүй байх
          </Text>
        </TouchableOpacity>

        {/* START */}
        <TouchableOpacity
          style={styles.startBtn}
         onPress={async () => {
            if (dontShowAgain) {
            await AsyncStorage.setItem("seenOnboarding", "true");
              }

            router.replace("/(auth)/login");
          }}

        >
          <Text style={styles.startText}>Эхлэх</Text>
        </TouchableOpacity>
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
    height: 300,
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

  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },

  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#4CAF8C",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  checkboxActive: {
    backgroundColor: "#4CAF8C",
  },

  checkboxDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },

  checkboxText: {
    fontSize: 14,
    color: "#4B7F73",
  },

  startBtn: {
    marginTop: 24,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#4CAF8C",
    justifyContent: "center",
    alignItems: "center",
  },

  startText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
