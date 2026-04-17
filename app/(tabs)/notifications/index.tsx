import IllustratedEmptyState from "@/components/IllustratedEmptyState";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import {
  canReviewDriverRequestNotification,
  getNotificationAttendanceStatus as getNormalizedAttendanceStatus,
  getNotificationBookingId as getNormalizedBookingId,
  getNotificationBookingStatus as getNormalizedBookingStatus,
  isDriverBookingRequestNotification,
  sortNotificationsNewestFirst,
} from "@/services/notificationUtils";
import { playActionSuccessSound } from "@/services/notificationSound";
import { syncRideReminderNotificationsFromServer } from "@/services/rideReminders";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const avatars: Record<string, any> = {
  grandfa: require("../../../assets/profile/avatars/grandfa.png"),
  father: require("../../../assets/profile/avatars/father.png"),
  guy: require("../../../assets/profile/avatars/guy.png"),
  child: require("../../../assets/profile/avatars/child.png"),
  grandma: require("../../../assets/profile/avatars/grandma.png"),
  mother: require("../../../assets/profile/avatars/mother.png"),
  women: require("../../../assets/profile/avatars/women.png"),
  sister: require("../../../assets/profile/avatars/sister.png"),
};

const avatarAliases: Record<string, keyof typeof avatars> = {
  grandpa: "grandfa",
  grandfather: "grandfa",
  woman: "women",
  female: "women",
};

type NotificationAction = "approve" | "reject" | "arrived" | "no_show";

function normalizeAvatarKey(value: any): keyof typeof avatars | null {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return null;

  if ((avatars as any)[raw]) return raw as keyof typeof avatars;
  if (avatarAliases[raw]) return avatarAliases[raw];

  const cleaned = raw.replace(/[^a-z]/g, "");
  if ((avatars as any)[cleaned]) return cleaned as keyof typeof avatars;
  if (avatarAliases[cleaned]) return avatarAliases[cleaned];

  return null;
}

function getRequesterAvatar(item: any) {
  const candidates = [
    item?.from_avatar_id,
    item?.fromAvatarId,
    item?.requester_avatar_id,
    item?.requesterAvatarId,
    item?.from_user?.avatar_id,
    item?.from_user?.avatarId,
    item?.requester?.avatar_id,
    item?.requester?.avatarId,
    item?.avatar_id,
  ];

  for (const candidate of candidates) {
    const key = normalizeAvatarKey(candidate);
    if (key) return avatars[key];
  }

  return avatars.sister;
}

function getRequesterName(item: any) {
  const isGeneric = (value: any) => {
    const normalized = String(value || "").trim().toLowerCase();
    return !normalized || normalized === "хэрэглэгч" || normalized === "user";
  };

  const directName =
    item?.from_user_name ||
    item?.from_name ||
    item?.fromUserName ||
    item?.requester?.name ||
    item?.requester?.full_name ||
    item?.requester_name ||
    item?.user_name ||
    item?.full_name ||
    item?.name ||
    item?.from_user?.name ||
    item?.from_user?.full_name;

  if (directName && !isGeneric(directName)) return String(directName);

  const bodyText = String(item?.body || "");
  const bodyMatch =
    bodyText.match(/^(.+?)\s+хэрэглэгч/i) ||
    bodyText.match(/^Зорчигч\s+(.+?)\s+/i) ||
    bodyText.match(/^(.+?)\s+таны\s+үүсгэсэн/i);

  if (bodyMatch?.[1] && !isGeneric(bodyMatch[1])) return String(bodyMatch[1]).trim();

  if (directName) return String(directName);
  return "Хэрэглэгч";
}

function getBookingStatus(item: any) {
  return getNormalizedBookingStatus(item);
}

function getAttendanceStatus(item: any) {
  return getNormalizedAttendanceStatus(item);
}

function getAttendanceLabel(status: string) {
  if (status === "arrived") return "Уулзах цэгт цагтаа ирсэн";
  if (status === "no_show") return "Уулзах цэгт ирээгүй";
  return "";
}

function formatNotificationTime(value: any) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Цаг тодорхойгүй";

  return date.toLocaleString("mn-MN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusTone(item: any, unread: boolean) {
  const bookingStatus = getBookingStatus(item);
  const attendanceStatus = getAttendanceStatus(item);

  if (attendanceStatus === "arrived") {
    return { label: "Ирц баталгаажсан", backgroundColor: "#e8f0ff", color: "#2255b4" };
  }

  if (attendanceStatus === "no_show") {
    return { label: "Ирээгүй гэж тэмдэглэсэн", backgroundColor: "#fce7df", color: AppTheme.colors.danger };
  }

  if (bookingStatus === "approved") {
    return { label: "Зөвшөөрөгдсөн", backgroundColor: AppTheme.colors.accentGlow, color: AppTheme.colors.accentDeep };
  }

  if (bookingStatus === "rejected") {
    return { label: "Татгалзсан", backgroundColor: "#fbe6de", color: AppTheme.colors.danger };
  }

  if (bookingStatus === "cancelled" || bookingStatus === "canceled") {
    return { label: "Захиалга цуцлагдсан", backgroundColor: "#f8e3e8", color: "#9f1239" };
  }

  if (canReviewDriverRequestNotification(item)) {
    return { label: "Шийдвэр хүлээж байна", backgroundColor: "#fbefd7", color: AppTheme.colors.warning };
  }

  if (unread) {
    return { label: "Шинэ", backgroundColor: "#efe6d8", color: AppTheme.colors.text };
  }

  return { label: "Мэдэгдэл", backgroundColor: AppTheme.colors.cardSoft, color: AppTheme.colors.textMuted };
}

export default function NotificationsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [userById, setUserById] = useState<Record<number, any>>({});
  const [actionLoading, setActionLoading] = useState<Record<number, NotificationAction | null>>({});

  const isGenericName = (value: any) => {
    const normalized = String(value || "").trim().toLowerCase();
    return !normalized || normalized === "хэрэглэгч" || normalized === "user";
  };

  const loadRequesterProfiles = useCallback(async (list: any[]) => {
    const ids = Array.from(
      new Set(
        list
          .map((notification: any) => Number(notification?.from_user_id))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      )
    );

    if (ids.length === 0) return;

    const entries = await Promise.all(
      ids.map(async (id) => {
        const profile =
          (await apiFetch(`/users/${id}`).catch(() => null)) ||
          (await apiFetch(`/users?id=${id}`).catch(() => null));
        return [id, profile] as const;
      })
    );

    const next: Record<number, any> = {};
    for (const [id, profile] of entries) {
      if (profile) next[id] = profile;
    }

    if (Object.keys(next).length > 0) {
      setUserById((prev) => ({ ...prev, ...next }));
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("/notifications");
      const list = sortNotificationsNewestFirst(Array.isArray(data) ? data : []);
      setItems(list);
      loadRequesterProfiles(list);
    } catch (error) {
      console.log("notif load error", error);
    }
  }, [loadRequesterProfiles]);

  const markRead = async (id: number) => {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    load();
  };

  const resolveBookingId = (item: any): number | null => getNormalizedBookingId(item);
  const isDriverBookingRequest = (item: any) => isDriverBookingRequestNotification(item);
  const canReviewRequest = (item: any) => canReviewDriverRequestNotification(item);

  const canMarkAttendance = (item: any) => {
    if (!isDriverBookingRequest(item)) return false;

    const bookingStatus = getBookingStatus(item);
    const attendanceStatus = getAttendanceStatus(item);
    if (bookingStatus !== "approved") return false;
    if (attendanceStatus === "arrived" || attendanceStatus === "no_show") return false;

    return true;
  };

  const handleDecision = async (item: any, action: "approve" | "reject") => {
    const notificationId = Number(item?.id);
    const bookingId = resolveBookingId(item);

    if (!bookingId || !Number.isFinite(notificationId)) {
      Alert.alert("Алдаа", "Booking мэдээлэл дутуу байна.");
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [notificationId]: action }));
      await apiFetch(`/bookings/${bookingId}/${action}`, { method: "PATCH" });
      await apiFetch(`/notifications/${notificationId}/read`, { method: "PATCH" }).catch(() => null);
      setItems((prev) =>
        prev.map((notification) =>
          Number(notification?.id) === notificationId
            ? { ...notification, is_read: true, booking_status: action === "approve" ? "approved" : "rejected" }
            : notification
        )
      );
      void playActionSuccessSound();
      void syncRideReminderNotificationsFromServer();
    } catch (error: any) {
      Alert.alert("Алдаа", error?.message || "Үйлдэл амжилтгүй.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [notificationId]: null }));
    }
  };

  const handleAttendance = async (item: any, status: "arrived" | "no_show") => {
    const notificationId = Number(item?.id);
    const bookingId = resolveBookingId(item);

    if (!bookingId || !Number.isFinite(notificationId)) {
      Alert.alert("Алдаа", "Booking мэдээлэл дутуу байна.");
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [notificationId]: status }));
      await apiFetch(`/bookings/${bookingId}/attendance`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await apiFetch(`/notifications/${notificationId}/read`, { method: "PATCH" }).catch(() => null);
      setItems((prev) =>
        prev.map((notification) =>
          Number(notification?.id) === notificationId
            ? { ...notification, is_read: true, booking_status: "approved", attendance_status: status }
            : notification
        )
      );
      void playActionSuccessSound();
    } catch (error: any) {
      Alert.alert("Алдаа", error?.message || "Ирц тэмдэглэж чадсангүй.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [notificationId]: null }));
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const unreadCount = useMemo(() => items.filter((item) => !item?.is_read).length, [items]);
  const pendingCount = useMemo(() => items.filter((item) => canReviewRequest(item)).length, [items]);

  const renderItem = ({ item }: any) => {
    const bookingStatus = getBookingStatus(item);
    const attendanceStatus = getAttendanceStatus(item);
    const notificationId = Number(item?.id);
    const profile = userById[Number(item?.from_user_id)];
    const fallbackName = getRequesterName(item);
    const profileName =
      profile?.name ||
      profile?.full_name ||
      profile?.fullName ||
      profile?.username ||
      profile?.user_name;
    const displayName = !isGenericName(fallbackName) ? fallbackName : profileName || fallbackName;
    const unread = !item?.is_read;
    const tone = getStatusTone(item, unread);
    const loadingAction = actionLoading[notificationId];

    return (
      <TouchableOpacity activeOpacity={0.92} style={[styles.card, unread && styles.unreadCard]} onPress={() => markRead(item.id)}>
        <View style={styles.cardTopRow}>
          <Image source={getRequesterAvatar({ ...item, from_user: profile || item?.from_user })} style={styles.avatar} />
          <View style={styles.cardTopContent}>
            <View style={styles.cardHeadingRow}>
              <View style={styles.cardHeadingText}>
                <Text style={styles.name}>{displayName}</Text>
                <Text style={styles.title}>{item.title}</Text>
              </View>
              {unread ? <View style={styles.unreadDot} /> : null}
            </View>

            <Text style={styles.body}>{item.body}</Text>

            <View style={styles.metaRow}>
              <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
                <Text style={[styles.badgeText, { color: tone.color }]}>{tone.label}</Text>
              </View>
              <Text style={styles.time}>{formatNotificationTime(item.created_at)}</Text>
            </View>
          </View>
        </View>

        {canReviewRequest(item) ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!!loadingAction}
              style={[styles.actionButton, styles.primaryAction, loadingAction && styles.actionDisabled]}
              onPress={() => handleDecision(item, "approve")}
            >
              <Text style={styles.primaryActionText}>
                {loadingAction === "approve" ? "Түр хүлээнэ үү..." : "Зөвшөөрөх"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!!loadingAction}
              style={[styles.actionButton, styles.secondaryAction, loadingAction && styles.actionDisabled]}
              onPress={() => handleDecision(item, "reject")}
            >
              <Text style={styles.secondaryActionText}>
                {loadingAction === "reject" ? "Түр хүлээнэ үү..." : "Татгалзах"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {canMarkAttendance(item) ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!!loadingAction}
              style={[styles.actionButton, styles.infoAction, loadingAction && styles.actionDisabled]}
              onPress={() => handleAttendance(item, "arrived")}
            >
              <Text style={styles.infoActionText}>
                {loadingAction === "arrived" ? "Түр хүлээнэ үү..." : "Ирсэн"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              disabled={!!loadingAction}
              style={[styles.actionButton, styles.secondaryAction, loadingAction && styles.actionDisabled]}
              onPress={() => handleAttendance(item, "no_show")}
            >
              <Text style={styles.secondaryActionText}>
                {loadingAction === "no_show" ? "Түр хүлээнэ үү..." : "Ирээгүй"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {bookingStatus === "approved" || bookingStatus === "rejected" || attendanceStatus ? (
          <View style={styles.noteCard}>
            {bookingStatus === "approved" ? <Text style={styles.noteOk}>Захиалга баталгаажсан.</Text> : null}
            {bookingStatus === "rejected" ? <Text style={styles.noteDanger}>Захиалгыг татгалзсан.</Text> : null}
            {attendanceStatus === "arrived" ? <Text style={styles.noteInfo}>{getAttendanceLabel(attendanceStatus)}</Text> : null}
            {attendanceStatus === "no_show" ? <Text style={styles.noteDanger}>{getAttendanceLabel(attendanceStatus)}</Text> : null}
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.heroWrap}>
            <LinearGradient colors={[AppTheme.colors.accentDeep, AppTheme.colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Notification Center</Text>
              <Text style={styles.heroTitle}>Танд ирсэн бүх хөдөлгөөн нэг дор</Text>
              <Text style={styles.heroBody}>Захиалга, баталгаажуулалт, жолоочийн хүсэлтүүдийг эндээс хурдан удирдана.</Text>

              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{items.length}</Text>
                  <Text style={styles.summaryLabel}>Нийт мэдэгдэл</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{unreadCount}</Text>
                  <Text style={styles.summaryLabel}>Шинэ</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{pendingCount}</Text>
                  <Text style={styles.summaryLabel}>Шийдвэр хүлээж буй</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        }
        ListEmptyComponent={
          <IllustratedEmptyState
            icon="notifications-none"
            eyebrow="Notification Center"
            title="Шинэ мэдэгдэл алга"
            body="Захиалга, хүсэлт, ирцийн өөрчлөлт орж ирэхэд энэ хэсэгт цэгцтэй харагдана."
            tone="accent"
            style={styles.emptyCard}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.canvas },
  listContent: { paddingBottom: 44, paddingHorizontal: 18 },
  heroWrap: { paddingTop: 18, paddingBottom: 20 },
  heroCard: { borderRadius: AppTheme.radius.lg, paddingHorizontal: 22, paddingVertical: 24, ...AppTheme.shadow.floating },
  heroEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 10,
    fontFamily: AppFontFamily,
  },
  heroTitle: { color: AppTheme.colors.white, fontSize: 28, lineHeight: 34, fontWeight: "700", fontFamily: AppFontFamily },
  heroBody: { color: "rgba(255,255,255,0.82)", fontSize: 14, lineHeight: 22, marginTop: 10, maxWidth: 320 },
  summaryRow: { flexDirection: "row", marginTop: 22 },
  summaryCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: AppTheme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  summaryValue: { color: AppTheme.colors.white, fontSize: 22, fontWeight: "700", fontFamily: AppFontFamily },
  summaryLabel: { color: "rgba(255,255,255,0.74)", fontSize: 11, lineHeight: 15, marginTop: 6 },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(222,212,197,0.8)",
    ...AppTheme.shadow.card,
  },
  unreadCard: { borderColor: AppTheme.colors.accent, shadowOpacity: 0.12 },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start" },
  avatar: { width: 54, height: 54, borderRadius: 18, marginRight: 14, backgroundColor: AppTheme.colors.cardSoft },
  cardTopContent: { flex: 1 },
  cardHeadingRow: { flexDirection: "row", alignItems: "flex-start" },
  cardHeadingText: { flex: 1 },
  unreadDot: { width: 10, height: 10, borderRadius: 999, backgroundColor: AppTheme.colors.gold, marginTop: 6, marginLeft: 10 },
  name: { color: AppTheme.colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: 3 },
  title: { color: AppTheme.colors.text, fontSize: 18, lineHeight: 23, fontWeight: "700", fontFamily: AppFontFamily },
  body: { color: AppTheme.colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  badge: { borderRadius: AppTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontSize: 12, fontWeight: "700" },
  time: { color: AppTheme.colors.textMuted, fontSize: 12, marginLeft: "auto" },
  actionRow: { flexDirection: "row", marginTop: 16 },
  actionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: AppTheme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    marginRight: 10,
  },
  actionDisabled: { opacity: 0.62 },
  primaryAction: { backgroundColor: AppTheme.colors.accent },
  secondaryAction: { backgroundColor: AppTheme.colors.cardSoft, borderWidth: 1, borderColor: AppTheme.colors.border },
  infoAction: { backgroundColor: "#dfe9fb" },
  primaryActionText: { color: AppTheme.colors.white, fontWeight: "700", fontSize: 13 },
  secondaryActionText: { color: AppTheme.colors.text, fontWeight: "700", fontSize: 13 },
  infoActionText: { color: "#2255b4", fontWeight: "700", fontSize: 13 },
  noteCard: { marginTop: 14, backgroundColor: AppTheme.colors.cardSoft, borderRadius: AppTheme.radius.md, paddingHorizontal: 14, paddingVertical: 12 },
  noteOk: { color: AppTheme.colors.accentDeep, fontSize: 13, fontWeight: "700" },
  noteDanger: { color: AppTheme.colors.danger, fontSize: 13, fontWeight: "700" },
  noteInfo: { color: "#2255b4", fontSize: 13, fontWeight: "700" },
  emptyCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 22,
    paddingVertical: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  emptyTitle: { color: AppTheme.colors.text, fontSize: 20, fontWeight: "700", fontFamily: AppFontFamily },
  emptyBody: { color: AppTheme.colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: 8, textAlign: "center" },
});
