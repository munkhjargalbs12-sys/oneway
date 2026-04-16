import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const STORAGE_KEY = "oneway_seen_map_type_hint_v2";

type Props = {
  message?: string;
  visible?: boolean;
  onDismiss?: () => void;
  persistOnDismiss?: boolean;
  storageKey?: string;
};

export default function MapTypeHint({
  message = "Газрын зургийг бодитоор харах бол Satellite товчийг дараарай.",
  visible,
  onDismiss,
  persistOnDismiss = true,
  storageKey = STORAGE_KEY,
}: Props) {
  const [internalVisible, setInternalVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const motion = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const isControlled = typeof visible === "boolean";
  const isVisible = isControlled ? visible : internalVisible;

  useEffect(() => {
    if (isControlled) return;

    let active = true;

    AsyncStorage.getItem(storageKey)
      .then((seen) => {
        if (active && seen !== "true") {
          setInternalVisible(true);
        }
      })
      .catch(() => null);

    return () => {
      active = false;
    };
  }, [isControlled, storageKey]);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(opacity, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setShouldRender(false);
      }
    });
  }, [isVisible, opacity]);

  const dismiss = useCallback(async () => {
    if (!isControlled) {
      setInternalVisible(false);
    }

    if (persistOnDismiss) {
      await AsyncStorage.setItem(storageKey, "true").catch(() => null);
    }

    onDismiss?.();
  }, [isControlled, onDismiss, persistOnDismiss, storageKey]);

  useEffect(() => {
    if (!isVisible) return;

    const timeout = setTimeout(() => {
      dismiss();
    }, 3000);

    return () => clearTimeout(timeout);
  }, [dismiss, isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(motion, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(motion, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [isVisible, motion]);

  if (!shouldRender && !isVisible) return null;

  const handStyle = {
    transform: [
      {
        translateY: motion.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -6],
        }),
      },
      {
        translateX: motion.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 2],
        }),
      },
    ],
  };

  return (
    <Animated.View style={[styles.wrap, { opacity }]}>
      <TouchableOpacity activeOpacity={0.95} onPress={dismiss}>
        <View style={styles.bubble}>
          <Text style={styles.title}>Шинэ хэрэглэгчийн зөвлөмж</Text>
          <Text style={styles.text}>{message}</Text>
          <Text style={styles.subText}>Энэ тайлбар удахгүй өөрөө арилна.</Text>
        </View>

        <Animated.View style={[styles.handRow, handStyle]}>
          <Text style={styles.arrow}>↑</Text>
          <Text style={styles.hand}>👆</Text>
        </Animated.View>

        <View style={styles.tail} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 56,
    right: 0,
    alignItems: "flex-end",
    paddingTop: 24,
    zIndex: 30,
  },
  bubble: {
    maxWidth: 220,
    backgroundColor: "rgba(255,253,248,0.96)",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(222,212,197,0.92)",
    shadowColor: "#7c6f64",
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 18,
    elevation: 7,
  },
  title: {
    color: "#2f6b53",
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  text: {
    color: "#1f2937",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  subText: {
    color: "#6b7280",
    fontSize: 10,
    marginTop: 5,
    fontWeight: "600",
  },
  handRow: {
    position: "absolute",
    top: 0,
    right: 14,
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    zIndex: 2,
  },
  arrow: {
    color: "#2f6b53",
    fontSize: 15,
    fontWeight: "800",
    textShadowColor: "rgba(124, 111, 100, 0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  hand: {
    fontSize: 20,
  },
  tail: {
    width: 14,
    height: 14,
    backgroundColor: "rgba(255,253,248,0.96)",
    transform: [{ rotate: "45deg" }],
    marginTop: -7,
    marginRight: 24,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "rgba(222,212,197,0.92)",
    shadowColor: "#7c6f64",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
});
