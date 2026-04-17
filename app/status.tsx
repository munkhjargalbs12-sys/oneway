import { AppFontFamily, AppTheme } from "@/constants/theme";
import { getBookingStatusColor, getBookingStatusLabel } from "@/services/bookingStatus";
import {
  areNotificationsEnabled,
  ensureNotificationPermission,
  syncPushTokenWithBackend,
} from "@/services/pushNotifications";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

function getStatusDescription(status?: string) {
  switch (String(status ?? "").toLowerCase()) {
    case "approved":
      return "Жолооч таны захиалгыг зөвшөөрлөө. Удахгүй уулзах цэг болон цагийн дагуу аялалдаа нэгдэнэ.";
    case "rejected":
      return "Энэ удаад жолооч таны захиалгыг зөвшөөрсөнгүй. Өөр тохирох аялал руу шууд шилжиж болно.";
    case "cancelled":
    case "canceled":
      return "Энэ суудлын захиалга цуцлагдсан байна. Өөр тохирох аялал сонгох боломжтой.";
    case "pending":
    default:
      return "Жолооч шийдвэр гаргасны дараа захиалгын төлөв автоматаар шинэчлэгдэнэ.";
  }
}

function getToneBackground(status?: string) {
  switch (String(status ?? "").toLowerCase()) {
    case "approved":
      return [AppTheme.colors.accentDeep, AppTheme.colors.accent] as const;
    case "rejected":
      return ["#9b4c3c", AppTheme.colors.danger] as const;
    case "cancelled":
    case "canceled":
      return ["#7f1d1d", "#b91c1c"] as const;
    case "pending":
    default:
      return ["#9c7640", AppTheme.colors.warning] as const;
  }
}

export default function Status() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const normalizedStatus = String(status ?? "pending").toLowerCase();
  const statusLabel = getBookingStatusLabel(normalizedStatus);
  const shouldPromptForNotifications = ["pending", "approved"].includes(
    normalizedStatus
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState<
    boolean | null
  >(null);
  const [notificationLoading, setNotificationLoading] = useState(false);

  const loadNotificationState = useCallback(async () => {
    if (!shouldPromptForNotifications) {
      setNotificationsEnabled(null);
      return;
    }

    try {
      const enabled = await areNotificationsEnabled();
      setNotificationsEnabled(enabled);
    } catch {
      setNotificationsEnabled(false);
    }
  }, [shouldPromptForNotifications]);

  useEffect(() => {
    void loadNotificationState();
  }, [loadNotificationState]);

  useEffect(() => {
    if (!shouldPromptForNotifications) {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void loadNotificationState();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [loadNotificationState, shouldPromptForNotifications]);

  const handleEnableNotifications = useCallback(async () => {
    setNotificationLoading(true);

    try {
      await ensureNotificationPermission();
      const enabled = await areNotificationsEnabled();
      setNotificationsEnabled(enabled);

      if (enabled) {
        await syncPushTokenWithBackend();
        Alert.alert(
          "Мэдэгдэл идэвхжлээ",
          "Жолоочийн шийдвэр, 10 минутын өмнөх сануулга, аялал эхэлсэн мэдэгдлийг одоо хүлээж авна."
        );
        return;
      }

      Alert.alert(
        "Мэдэгдлээ асаана уу",
        "Суудал захиалсан тул жолоочийн зөвшөөрөл, 10 минутын өмнөх сануулга, аялал эхэлсэн мэдэгдлийг алдахгүй байхын тулд Settings дотроос notifications-оо асаана уу.",
        [
          { text: "Дараа" },
          {
            text: "Settings",
            onPress: () => {
              void Linking.openSettings().catch(() => null);
            },
          },
        ]
      );
    } catch {
      Alert.alert(
        "Алдаа",
        "Notification permission шалгах үед алдаа гарлаа. Дараа нь дахин оролдоно уу."
      );
    } finally {
      setNotificationLoading(false);
    }
  }, []);

  return (
    <View style={styles.safe}>
      <View style={styles.content}>
        <LinearGradient
          colors={getToneBackground(normalizedStatus)}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <Text style={styles.heroEyebrow}>Booking Status</Text>
          <Text style={styles.heroTitle}>{statusLabel}</Text>
          <Text style={styles.heroBody}>{getStatusDescription(normalizedStatus)}</Text>
        </LinearGradient>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Одоогийн төлөв</Text>
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${getBookingStatusColor(normalizedStatus)}22` }]}>
              <Text style={[styles.statusBadgeText, { color: getBookingStatusColor(normalizedStatus) }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.summaryBody}>
            Төлөв өөрчлөгдөх бүрт notifications болон history хэсэг дээр мөн харагдана.
          </Text>
        </View>

        {shouldPromptForNotifications && notificationsEnabled === false ? (
          <View style={styles.reminderCard}>
            <Text style={styles.reminderTitle}>Мэдэгдлээ асаагаарай</Text>
            <Text style={styles.reminderBody}>
              Та суудал захиалсан байна. Жолоочийн зөвшөөрөл, 10 минутын өмнөх
              сануулга, аялал эхэлсэн мэдэгдлийг алдахгүйн тулд notifications-оо
              асаана уу.
            </Text>

            <TouchableOpacity
              activeOpacity={0.92}
              style={[
                styles.reminderButton,
                notificationLoading && styles.buttonDisabled,
              ]}
              onPress={() => {
                void handleEnableNotifications();
              }}
              disabled={notificationLoading}
            >
              {notificationLoading ? (
                <ActivityIndicator size="small" color={AppTheme.colors.white} />
              ) : (
                <Text style={styles.reminderButtonText}>
                  Notifications асаах
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity activeOpacity={0.92} style={styles.primaryButton} onPress={() => router.push("/history")}>
          <Text style={styles.primaryButtonText}>Түүх рүү очих</Text>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.92} style={styles.secondaryButton} onPress={() => router.replace("/home")}>
          <Text style={styles.secondaryButtonText}>Нүүр рүү буцах</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  content: {
    paddingVertical: 24,
  },
  heroCard: {
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 22,
    paddingVertical: 24,
    ...AppTheme.shadow.floating,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 10,
    fontFamily: AppFontFamily,
  },
  heroTitle: {
    color: AppTheme.colors.white,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  heroBody: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  summaryTitle: {
    color: AppTheme.colors.text,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  badgeRow: {
    marginTop: 14,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  summaryBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 14,
  },
  reminderCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#d7c7a5",
    ...AppTheme.shadow.card,
  },
  reminderTitle: {
    color: AppTheme.colors.text,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: AppFontFamily,
  },
  reminderBody: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  reminderButton: {
    minHeight: 50,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.warning,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  reminderButtonText: {
    color: AppTheme.colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    ...AppTheme.shadow.floating,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.card,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  secondaryButtonText: {
    color: AppTheme.colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
