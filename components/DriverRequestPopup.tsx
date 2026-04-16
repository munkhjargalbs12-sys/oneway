import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

type DecisionAction = "approve" | "reject" | null;

type Props = {
  visible: boolean;
  title?: string | null;
  body?: string | null;
  requesterName?: string | null;
  busyAction?: DecisionAction;
  onApprove: () => void;
  onReject: () => void;
};

export default function DriverRequestPopup({
  visible,
  title,
  body,
  requesterName,
  busyAction = null,
  onApprove,
  onReject,
}: Props) {
  if (!visible) return null;

  const headline =
    requesterName && requesterName !== "Хэрэглэгч"
      ? `${requesterName} суудал захиалах хүсэлт илгээлээ`
      : title || "Суудлын захиалгын хүсэлт";

  return (
    <View pointerEvents="box-none" style={styles.portal}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Шинэ хүсэлт</Text>
        <Text style={styles.title}>{headline}</Text>
        {body ? (
          <Text numberOfLines={4} style={styles.body}>
            {body}
          </Text>
        ) : null}
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={busyAction !== null}
            onPress={onApprove}
            style={[styles.actionBtn, styles.approveBtn, busyAction !== null && styles.disabledBtn]}
          >
            <Text style={styles.actionText}>
              {busyAction === "approve" ? "Түр хүлээнэ үү..." : "Зөвшөөрөх"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={busyAction !== null}
            onPress={onReject}
            style={[styles.actionBtn, styles.rejectBtn, busyAction !== null && styles.disabledBtn]}
          >
            <Text style={styles.actionText}>
              {busyAction === "reject" ? "Түр хүлээнэ үү..." : "Татгалзах"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  portal: {
    position: "absolute",
    top: 88,
    left: 16,
    right: 16,
    zIndex: 60,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#dbeafe",
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  body: {
    marginTop: 6,
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 11,
  },
  approveBtn: {
    backgroundColor: "#16a34a",
  },
  rejectBtn: {
    backgroundColor: "#dc2626",
  },
  disabledBtn: {
    opacity: 0.7,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});
