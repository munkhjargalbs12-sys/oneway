import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppTheme } from "@/constants/theme";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Props = {
  message: string;
  storageKey: string;
  title?: string;
  subText?: string;
  maxWidth?: number;
  visible?: boolean;
  onDismiss?: () => void;
  persistOnDismiss?: boolean;
};

export default function FeatureHintBubble({
  message,
  storageKey,
  title = "Шинэ хэрэглэгчийн зөвлөмж",
  subText = "Энэ тайлбар удахгүй өөрөө арилна.",
  maxWidth = 220,
  visible,
  onDismiss,
  persistOnDismiss = true,
}: Props) {
  const [internalVisible, setInternalVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
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

  if (!shouldRender && !isVisible) return null;

  return (
    <Animated.View style={[styles.wrap, { opacity }]}>
      <TouchableOpacity activeOpacity={0.96} onPress={dismiss}>
        <View style={[styles.bubble, { maxWidth }]}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.text}>{message}</Text>
          <Text style={styles.subText}>{subText}</Text>
        </View>
        <View style={styles.tail} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    alignItems: "flex-start",
  },
  bubble: {
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
    color: AppTheme.colors.accentDeep,
    fontSize: 11,
    fontWeight: "700",
    marginBottom: 4,
  },
  text: {
    color: AppTheme.colors.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
  },
  subText: {
    color: AppTheme.colors.textMuted,
    fontSize: 10,
    marginTop: 5,
    fontWeight: "600",
  },
  tail: {
    position: "absolute",
    left: -7,
    top: 26,
    width: 14,
    height: 14,
    backgroundColor: "rgba(255,253,248,0.96)",
    transform: [{ rotate: "45deg" }],
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
