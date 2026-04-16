import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type MapTypeOption = "standard" | "satellite";

type Props = {
  value: MapTypeOption;
  onChange: (value: MapTypeOption) => void;
};

const options: { key: MapTypeOption; label: string }[] = [
  { key: "standard", label: "Google" },
  { key: "satellite", label: "Satellite" },
];

export default function MapTypeToggle({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = value === option.key;

        return (
          <TouchableOpacity
            key={option.key}
            activeOpacity={0.85}
            onPress={() => onChange(option.key)}
            style={[styles.button, active && styles.buttonActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignSelf: "flex-start",
    backgroundColor: "rgba(15, 23, 42, 0.8)",
    borderRadius: 18,
    padding: 4,
    gap: 4,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  buttonActive: {
    backgroundColor: "#ffffff",
  },
  label: {
    color: "#e5e7eb",
    fontSize: 12,
    fontWeight: "700",
  },
  labelActive: {
    color: "#0f172a",
  },
});
