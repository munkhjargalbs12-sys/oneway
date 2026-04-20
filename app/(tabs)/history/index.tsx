import IllustratedEmptyState from "@/components/IllustratedEmptyState";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import {
  extractBookedRideIds,
  extractBookingStatusByRide,
  extractBookingStatusLabelByRide,
  getBookingStatusLabel,
} from "@/services/bookingStatus";
import { formatRideDate } from "@/services/rideDate";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type HistoryEntryType = "created" | "booked";

type HistoryRide = {
  id: number;
  ride_date?: string;
  start_time?: string;
  end_location?: string;
  price?: number;
  status?: string;
  booking_status?: string;
  booking_status_label?: string;
  _entryType: HistoryEntryType;
};

function getRideSortTimestamp(ride: HistoryRide) {
  const date = formatRideDate(ride.ride_date, "");
  if (!date) return 0;

  const time = String(ride.start_time || "00:00").slice(0, 5);
  const timestamp = new Date(`${date}T${time}:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortByRideTime(a: HistoryRide, b: HistoryRide) {
  return getRideSortTimestamp(b) - getRideSortTimestamp(a);
}

function toRideId(value: unknown) {
  const id = Number(value);
  return Number.isFinite(id) ? id : null;
}

function getAllBookedRideIds(payload: any) {
  const entries = Array.isArray(payload?.bookings) ? payload.bookings : [];
  const ids = entries
    .map((entry: any) => toRideId(entry?.ride_id ?? entry?.ride?.id ?? entry?.id))
    .filter((id: number | null): id is number => id !== null);

  return Array.from(new Set([...extractBookedRideIds(payload), ...ids]));
}

function canHideHistoryEntry(ride: HistoryRide) {
  const status = String(ride.status || "").toLowerCase();
  if (["completed", "cancelled", "canceled"].includes(status)) {
    return true;
  }

  const timestamp = getRideSortTimestamp(ride);
  return timestamp > 0 && timestamp < Date.now();
}

function buildHistoryRides(
  myCreatedPayload: any,
  myBookingsPayload: any,
  allRidesPayload: any
): HistoryRide[] {
  const myCreated = Array.isArray(myCreatedPayload) ? myCreatedPayload : [];
  const allRides = Array.isArray(allRidesPayload) ? allRidesPayload : [];
  const bookedIds = getAllBookedRideIds(myBookingsPayload);
  const bookingStatusByRide = extractBookingStatusByRide(myBookingsPayload);
  const bookingStatusLabelByRide = extractBookingStatusLabelByRide(myBookingsPayload);

  const createdEntries: HistoryRide[] = myCreated.map((ride: any) => ({
    ...ride,
    _entryType: "created",
  }));

  const createdIds = new Set(
    createdEntries
      .map((ride) => Number(ride.id))
      .filter((id) => Number.isFinite(id))
  );

  const bookedEntries: HistoryRide[] = allRides
    .filter((ride: any) => bookedIds.includes(Number(ride?.id)))
    .filter((ride: any) => !createdIds.has(Number(ride?.id)))
    .map((ride: any) => ({
      ...ride,
      booking_status: bookingStatusByRide[Number(ride?.id)],
      booking_status_label: bookingStatusLabelByRide[Number(ride?.id)],
      _entryType: "booked",
    }));

  return [...createdEntries, ...bookedEntries].sort(sortByRideTime);
}

function getEntryLabel(entryType: HistoryEntryType) {
  return entryType === "created" ? "Таны үүсгэсэн аялал" : "Таны суудал захиалсан аялал";
}

function getStatusLabel(status?: string, entryType?: HistoryEntryType) {
  if (status === "started") return "Явж байна";
  if (status === "scheduled") return "Төлөвлөгдсөн";
  if (status === "pending") return "Хүлээгдэж байна";
  if (status === "cancelled") return "Цуцлагдсан";
  if (status === "completed") return "Дууссан";

  return entryType === "created" ? "Идэвхтэй чиглэл" : "Жолооч баталгаажуулаагүй";
}

function getResolvedStatusLabel(entry: HistoryRide) {
  if (entry._entryType === "booked" && (entry.booking_status_label || entry.booking_status)) {
    return entry.booking_status_label || getBookingStatusLabel(entry.booking_status);
  }

  return getStatusLabel(entry.status, entry._entryType);
}

function getMonthLabel(dateValue?: string) {
  const displayDate = formatRideDate(dateValue, "");
  if (!displayDate) return "Огноо тодорхойгүй";

  const date = new Date(`${displayDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "Огноо тодорхойгүй";

  return date.toLocaleDateString("mn-MN", {
    year: "numeric",
    month: "long",
  });
}

function getStatusTone(label: string) {
  const normalized = label.toLowerCase();

  if (normalized.includes("дуус")) {
    return { backgroundColor: AppTheme.colors.accentGlow, color: AppTheme.colors.accentDeep };
  }

  if (normalized.includes("цуц")) {
    return { backgroundColor: "#fbe6de", color: AppTheme.colors.danger };
  }

  if (normalized.includes("баталга") || normalized.includes("төлөв")) {
    return { backgroundColor: "#e8f0ff", color: "#2255b4" };
  }

  return { backgroundColor: AppTheme.colors.cardSoft, color: AppTheme.colors.textMuted };
}

export default function RideHistory() {
  const [rides, setRides] = useState<HistoryRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidingRideId, setHidingRideId] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);

    try {
      const [myCreatedRides, myBookings, activeRides, historyRides] = await Promise.all([
        apiFetch("/rides/mine/all").catch(() => []),
        apiFetch("/bookings/mine").catch(() => ({ ride_ids: [] })),
        apiFetch("/rides").catch(() => []),
        apiFetch("/rides/history").catch(() => []),
      ]);

      const combinedRides = [
        ...(Array.isArray(activeRides) ? activeRides : []),
        ...(Array.isArray(historyRides) ? historyRides : []),
      ].filter((ride, index, list) => {
        const rideId = Number(ride?.id);
        return list.findIndex((entry) => Number(entry?.id) === rideId) === index;
      });

      setRides(buildHistoryRides(myCreatedRides, myBookings, combinedRides));
    } catch (error) {
      console.log("History load error", error);
      setRides([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const createdCount = useMemo(() => rides.filter((ride) => ride._entryType === "created").length, [rides]);
  const bookedCount = useMemo(() => rides.filter((ride) => ride._entryType === "booked").length, [rides]);

  const hideHistoryEntry = useCallback((ride: HistoryRide) => {
    const rideId = Number(ride?.id);
    if (!Number.isFinite(rideId)) return;

    Alert.alert(
      "Түүхээс устгах уу?",
      "Энэ бичлэг манай датанд хэвээр үлдэнэ. Зөвхөн таны түүх дээр харагдахгүй болно.",
      [
        { text: "Болих", style: "cancel" },
        {
          text: "Устгах",
          style: "destructive",
          onPress: async () => {
            try {
              setHidingRideId(rideId);
              await apiFetch(`/rides/${rideId}/history`, { method: "DELETE" });
              setRides((prev) => prev.filter((entry) => Number(entry.id) !== rideId));
            } catch (error: any) {
              Alert.alert("Алдаа", error?.message || "Түүхээс нууж чадсангүй.");
            } finally {
              setHidingRideId(null);
            }
          },
        },
      ]
    );
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={rides}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.heroWrap}>
            <LinearGradient colors={[AppTheme.colors.text, AppTheme.colors.accentDeep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
              <Text style={styles.heroEyebrow}>Ride Archive</Text>
              <Text style={styles.heroTitle}>Аяллын түүхээ цэгцтэй хараарай</Text>
              <Text style={styles.heroBody}>Үүсгэсэн болон захиалсан бүх аяллаа нэг timeline дээрээс хянахад зориулсан хэсэг.</Text>

              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{rides.length}</Text>
                  <Text style={styles.summaryLabel}>Нийт бичлэг</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{createdCount}</Text>
                  <Text style={styles.summaryLabel}>Үүсгэсэн</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryValue}>{bookedCount}</Text>
                  <Text style={styles.summaryLabel}>Захиалсан</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        }
        ListEmptyComponent={
          <IllustratedEmptyState
            icon={loading ? "hourglass-empty" : "history"}
            eyebrow="Ride Archive"
            title={loading ? "Түүхийг ачаалж байна..." : "Одоогоор түүх алга"}
            body="Аялал үүсгэх эсвэл суудал захиалах үед түүх энд timeline байдлаар нэмэгдэнэ."
            tone="ink"
            style={styles.emptyCard}
          />
        }
        renderItem={({ item }) => {
          const statusLabel = getResolvedStatusLabel(item);
          const statusTone = getStatusTone(statusLabel);

          return (
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/ride/[id]",
                  params: {
                    id: String(item.id),
                    ...(item._entryType === "booked" ? { role: "rider" } : {}),
                  },
                })
              }
            >
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.month}>{getMonthLabel(item.ride_date)}</Text>
                  <Text style={styles.title}>{item.end_location || "Очих газар тодорхойгүй"}</Text>
                </View>
                <View style={styles.cardActions}>
                  <View style={styles.priceChip}>
                    <Text style={styles.priceText}>{(item.price ?? 0).toLocaleString()}₮</Text>
                  </View>
                  {canHideHistoryEntry(item) ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      disabled={hidingRideId === Number(item.id)}
                      style={[styles.hideButton, hidingRideId === Number(item.id) && styles.hideButtonDisabled]}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        hideHistoryEntry(item);
                      }}
                    >
                      <Text style={styles.hideButtonText}>
                        {hidingRideId === Number(item.id) ? "..." : "Устгах"}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              <Text style={styles.meta}>Огноо: {formatRideDate(item.ride_date)} · Цаг: {item.start_time || "-"}</Text>

              <View style={styles.tagRow}>
                <View style={[styles.entryTag, item._entryType === "created" ? styles.createdTag : styles.bookedTag]}>
                  <Text style={[styles.entryTagText, item._entryType === "created" ? styles.createdTagText : styles.bookedTagText]}>
                    {getEntryLabel(item._entryType)}
                  </Text>
                </View>
                <View style={[styles.statusChip, { backgroundColor: statusTone.backgroundColor }]}>
                  <Text style={[styles.statusText, { color: statusTone.color }]}>{statusLabel}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppTheme.colors.canvas },
  listContent: { paddingHorizontal: 18, paddingBottom: 40 },
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
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  cardHeader: { flexDirection: "row", alignItems: "flex-start" },
  month: { color: AppTheme.colors.textMuted, fontSize: 12, marginBottom: 6 },
  title: {
    color: AppTheme.colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: "700",
    fontFamily: AppFontFamily,
    maxWidth: 230,
  },
  cardActions: { marginLeft: "auto", alignItems: "flex-end" },
  priceChip: {
    backgroundColor: AppTheme.colors.accentGlow,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceText: { color: AppTheme.colors.accentDeep, fontSize: 13, fontWeight: "700" },
  hideButton: {
    marginTop: 8,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    borderColor: "#f0c8bd",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fff7f4",
  },
  hideButtonDisabled: { opacity: 0.55 },
  hideButtonText: { color: AppTheme.colors.danger, fontSize: 11, fontWeight: "700" },
  meta: { color: AppTheme.colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 12 },
  tagRow: { flexDirection: "row", marginTop: 16, flexWrap: "wrap" },
  entryTag: { borderRadius: AppTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 8, marginRight: 10, marginBottom: 8 },
  createdTag: { backgroundColor: "#e6edf7" },
  bookedTag: { backgroundColor: AppTheme.colors.accentSoft },
  entryTagText: { fontSize: 12, fontWeight: "700" },
  createdTagText: { color: "#2453a7" },
  bookedTagText: { color: AppTheme.colors.accentDeep },
  statusChip: { borderRadius: AppTheme.radius.pill, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  statusText: { fontSize: 12, fontWeight: "700" },
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
  emptyTitle: { color: AppTheme.colors.text, fontSize: 20, fontWeight: "700", textAlign: "center", fontFamily: AppFontFamily },
  emptyBody: { color: AppTheme.colors.textMuted, fontSize: 14, lineHeight: 22, marginTop: 8, textAlign: "center" },
});
