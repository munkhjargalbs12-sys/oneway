import { apiFetch } from "@/services/apiClient";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
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

  for (const c of candidates) {
    const key = normalizeAvatarKey(c);
    if (key) return avatars[key];
  }

  return avatars.sister;
}

function getRequesterName(item: any) {
  const isGeneric = (v: any) => {
    const s = String(v || "").trim().toLowerCase();
    return !s || s === "хэрэглэгч" || s === "хэрэлэгч" || s === "user";
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

export default function NotificationsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [userById, setUserById] = useState<Record<number, any>>({});
  const [actionLoading, setActionLoading] = useState<Record<number, "approve" | "reject" | null>>(
    {}
  );
  const [resolved, setResolved] = useState<Record<number, "approved" | "rejected">>({});

  const isGenericName = (v: any) => {
    const s = String(v || "").trim().toLowerCase();
    return !s || s === "хэрэглэгч" || s === "хэрэлэгч" || s === "user";
  };

  const loadRequesterProfiles = async (list: any[]) => {
    const ids = Array.from(
      new Set(
        list
          .map((n: any) => Number(n?.from_user_id))
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
  };

  const load = async () => {
    try {
      const data = await apiFetch("/notifications");
      const list = Array.isArray(data)
        ? [...data].sort(
            (a: any, b: any) =>
              new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime()
          )
        : [];
      setItems(list);
      loadRequesterProfiles(list);
    } catch (err) {
      console.log("notif load error", err);
    }
  };

  const markRead = async (id: number) => {
    await apiFetch(`/notifications/${id}/read`, { method: "PATCH" });
    load();
  };

  const resolveBookingId = (item: any): number | null => {
    const raw = item?.booking_id ?? item?.bookingId ?? null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  };

  const canReviewRequest = (item: any) => {
    const type = String(item?.type || "").toLowerCase();
    const bookingId = resolveBookingId(item);
    return !!bookingId && (type === "booking" || type.includes("booking"));
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
      setResolved((prev) => ({
        ...prev,
        [notificationId]: action === "approve" ? "approved" : "rejected",
      }));
      setItems((prev) =>
        prev.map((n) =>
          Number(n?.id) === notificationId
            ? { ...n, is_read: true, booking_status: action === "approve" ? "approved" : "rejected" }
            : n
        )
      );
    } catch (err: any) {
      Alert.alert("Алдаа", err?.message || "Үйлдэл амжилтгүй.");
    } finally {
      setActionLoading((prev) => ({ ...prev, [notificationId]: null }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [])
  );

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={[styles.card, !item.is_read && styles.unread]}
      onPress={() => markRead(item.id)}
    >
      <View style={styles.row}>
        <Image
          source={getRequesterAvatar({
            ...item,
            from_user: userById[Number(item?.from_user_id)] || item?.from_user,
          })}
          style={styles.avatar}
        />
        <View style={styles.content}>
          <Text style={styles.name}>
            {(() => {
              const id = Number(item?.from_user_id);
              const profile = userById[id];
              const fallback = getRequesterName(item);
              if (!isGenericName(fallback)) return fallback;
              const profileName =
                profile?.name ||
                profile?.full_name ||
                profile?.fullName ||
                profile?.username ||
                profile?.user_name;
              return profileName || fallback;
            })()}
          </Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.time}>{new Date(item.created_at).toLocaleString()}</Text>

          {canReviewRequest(item) && !resolved[Number(item?.id)] && (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.approveBtn]}
                disabled={!!actionLoading[Number(item?.id)]}
                onPress={() => handleDecision(item, "approve")}
              >
                <Text style={styles.actionText}>
                  {actionLoading[Number(item?.id)] === "approve" ? "Түр хүлээнэ үү..." : "Зөвшөөрөх"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.rejectBtn]}
                disabled={!!actionLoading[Number(item?.id)]}
                onPress={() => handleDecision(item, "reject")}
              >
                <Text style={styles.actionText}>
                  {actionLoading[Number(item?.id)] === "reject" ? "Түр хүлээнэ үү..." : "Татгалзах"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {resolved[Number(item?.id)] === "approved" && (
            <Text style={styles.resolvedOk}>Захиалга баталгаажлаа</Text>
          )}
          {resolved[Number(item?.id)] === "rejected" && (
            <Text style={styles.resolvedNo}>Захиалга татгалзлаа</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Танд ирсэн мэдэгдэл</Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 40 }}>Мэдэгдэл байхгүй</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#F8FAFC" },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  unread: {
    borderWidth: 1,
    borderColor: "#22c55e",
  },
  title: { fontWeight: "700", marginBottom: 4 },
  body: { color: "#475569" },
  time: { marginTop: 6, fontSize: 12, color: "#94A3B8" },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  approveBtn: {
    backgroundColor: "#16a34a",
  },
  rejectBtn: {
    backgroundColor: "#dc2626",
  },
  actionText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  resolvedOk: {
    marginTop: 8,
    color: "#15803d",
    fontWeight: "700",
    fontSize: 12,
  },
  resolvedNo: {
    marginTop: 8,
    color: "#b91c1c",
    fontWeight: "700",
    fontSize: 12,
  },
});
