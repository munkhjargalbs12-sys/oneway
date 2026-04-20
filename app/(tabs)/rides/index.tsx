import AppIconBadge from "@/components/AppIconBadge";
import IllustratedEmptyState from "@/components/IllustratedEmptyState";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import {
  extractBookedRideIds,
  extractBookingStatusByRide,
  extractBookingStatusLabelByRide,
  getBookingStatusColor,
  getBookingStatusLabel,
} from "@/services/bookingStatus";
import {
  formatRadiusLabel,
  getDefaultRadius,
  getRideScope,
  type RideScope,
} from "@/services/rideSearch";
import { formatRideDate } from "@/services/rideDate";
import { showLocationUsageReminder } from "@/services/locationUsageReminder";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const seatImages: Record<number, any> = {
  1: require("../../../assets/cars/1seat.png"),
  2: require("../../../assets/cars/2seat.png"),
  3: require("../../../assets/cars/3seat.png"),
  4: require("../../../assets/cars/4seat.png"),
};

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

type SearchPoint = {
  lat: number;
  lng: number;
};

function readString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readNumber(value: string | string[] | undefined) {
  const parsed = Number(readString(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function getAvatarSource(avatarId?: string) {
  if (!avatarId) return avatars.sister;
  return avatars[avatarId] || avatars.sister;
}

function getRideOwnerName(ride: any) {
  return (
    ride?.user_name ||
    ride?.driver_name ||
    ride?.creator_name ||
    ride?.name ||
    ride?.user?.name ||
    ride?.driver?.name ||
    "Хэрэглэгч"
  );
}

function getLocationLabel(value: unknown, fallback: string) {
  const normalized = String(value || "").trim();
  return normalized || fallback;
}

function getRouteLabel(ride: any) {
  const startLocation = getLocationLabel(ride?.start_location, "Эхлэх цэг тодорхойгүй");
  const endLocation = getLocationLabel(ride?.end_location, "Очих газар тодорхойгүй");
  return `${startLocation} → ${endLocation}`;
}

function formatPointLabel(point: SearchPoint | null, label?: string | null) {
  const trimmed = String(label || "").trim();
  if (trimmed) {
    return trimmed;
  }

  if (!point) {
    return "";
  }

  return `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;
}

function getAvailableSeatCount(ride: any) {
  if (typeof ride?.available_seats === "number") {
    return Math.max(0, ride.available_seats);
  }

  if (typeof ride?.seats === "number") {
    return Math.max(0, ride.seats);
  }

  const seatsTotal = Number(ride?.seats_total) || 0;
  const seatsTaken = Number(ride?.seats_taken) || 0;
  return Math.max(0, seatsTotal - seatsTaken);
}

function getSeatIllustrationCount(availableSeats: number) {
  return Math.min(Math.max(availableSeats || 1, 1), 4);
}

function toRideTimestamp(ride: any) {
  const dateValue = formatRideDate(ride?.ride_date, "");
  if (!dateValue) return 0;

  const timeValue = String(ride?.start_time || "00:00").slice(0, 5);
  const timestamp = new Date(`${dateValue}T${timeValue}:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function toCreatedTimestamp(ride: any) {
  const timestamp = new Date(String(ride?.created_at || ride?.createdAt || "")).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortRidesNewestFirst(first: any, second: any) {
  const createdDelta = toCreatedTimestamp(second) - toCreatedTimestamp(first);
  if (createdDelta !== 0) {
    return createdDelta;
  }

  const idDelta = Number(second?.id || 0) - Number(first?.id || 0);
  if (idDelta !== 0) {
    return idDelta;
  }

  return toRideTimestamp(second) - toRideTimestamp(first);
}

function isRideUpcoming(ride: any) {
  const timestamp = toRideTimestamp(ride);
  return timestamp <= 0 || timestamp >= Date.now();
}

function getRideStatusLabel(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "scheduled":
      return "Төлөвлөгдсөн";
    case "pending":
      return "Хүлээгдэж байна";
    case "started":
      return "Явж байна";
    default:
      return "Идэвхтэй";
  }
}

function getRideStatusTone(status?: string | null) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "started") {
    return {
      backgroundColor: "#f8ecd8",
      color: AppTheme.colors.warning,
    };
  }

  if (normalized === "scheduled") {
    return {
      backgroundColor: "#e7eefc",
      color: "#2f5fb4",
    };
  }

  if (normalized === "pending") {
    return {
      backgroundColor: "#f2eee5",
      color: AppTheme.colors.textMuted,
    };
  }

  return {
    backgroundColor: AppTheme.colors.accentGlow,
    color: AppTheme.colors.accentDeep,
  };
}

export default function RideListScreen() {
  const params = useLocalSearchParams<{
    scope?: string;
    refresh?: string;
    radiusM?: string;
    locationReminder?: string;
    searchStartLat?: string;
    searchStartLng?: string;
    searchStartLabel?: string;
    searchEndLat?: string;
    searchEndLng?: string;
    searchEndLabel?: string;
  }>();

  const activeScope: RideScope =
    readString(params.scope) === "intercity" ? "intercity" : "local";
  const searchStartLat = readNumber(params.searchStartLat);
  const searchStartLng = readNumber(params.searchStartLng);
  const searchEndLat = readNumber(params.searchEndLat);
  const searchEndLng = readNumber(params.searchEndLng);
  const searchStart = useMemo(
    () =>
      searchStartLat === null || searchStartLng === null
        ? null
        : { lat: searchStartLat, lng: searchStartLng },
    [searchStartLat, searchStartLng]
  );
  const searchEnd = useMemo(
    () =>
      searchEndLat === null || searchEndLng === null
        ? null
        : { lat: searchEndLat, lng: searchEndLng },
    [searchEndLat, searchEndLng]
  );
  const radiusMeters = readNumber(params.radiusM) ?? getDefaultRadius(activeScope);
  const hasSearch = Boolean(searchStart && searchEnd);
  const searchStartLabel = formatPointLabel(searchStart, readString(params.searchStartLabel));
  const searchEndLabel = formatPointLabel(searchEnd, readString(params.searchEndLabel));
  const refreshToken = readString(params.refresh) || "";
  const locationReminder = readString(params.locationReminder) || "";

  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookedRideIds, setBookedRideIds] = useState<number[]>([]);
  const [bookingStatusByRide, setBookingStatusByRide] = useState<Record<number, string>>({});
  const [bookingStatusLabelByRide, setBookingStatusLabelByRide] = useState<Record<number, string>>({});
  const locationReminderShownRef = useRef(false);

  const loadRides = useCallback(async () => {
    void refreshToken;
    setLoading(true);

    try {
      const [ridePayload, myBookings] = await Promise.all([
        hasSearch && searchStart && searchEnd
          ? apiFetch("/rides/search", {
              method: "POST",
              body: JSON.stringify({
                start: searchStart,
                end: searchEnd,
                radius_m: radiusMeters,
                scope: activeScope,
              }),
            }).catch(() => [])
          : apiFetch("/rides").catch(() => []),
        apiFetch("/bookings/mine").catch(() => ({ ride_ids: [] })),
      ]);

      const nextBookingStatusByRide = extractBookingStatusByRide(myBookings);
      const nextBookingStatusLabelByRide = extractBookingStatusLabelByRide(myBookings);

      const nextRides = (Array.isArray(ridePayload) ? ridePayload : [])
        .filter((ride) => (hasSearch ? true : getRideScope(ride) === activeScope))
        .filter(isRideUpcoming)
        .sort(sortRidesNewestFirst);

      setRides(nextRides);
      setBookedRideIds(extractBookedRideIds(myBookings));
      setBookingStatusByRide(nextBookingStatusByRide);
      setBookingStatusLabelByRide(nextBookingStatusLabelByRide);
    } catch (error) {
      console.log("Failed to load rides:", error);
      setRides([]);
      setBookedRideIds([]);
      setBookingStatusByRide({});
      setBookingStatusLabelByRide({});
    } finally {
      setLoading(false);
    }
  }, [
    activeScope,
    hasSearch,
    radiusMeters,
    searchEnd,
    searchStart,
    refreshToken,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadRides();
    }, [loadRides])
  );

  useEffect(() => {
    if (!locationReminder || locationReminderShownRef.current) {
      return;
    }

    locationReminderShownRef.current = true;

    showLocationUsageReminder(locationReminder, () => {
      router.replace({
        pathname: "/rides",
        params: {
          scope: activeScope,
          ...(refreshToken ? { refresh: refreshToken } : {}),
          ...(searchStart
            ? {
                searchStartLat: String(searchStart.lat),
                searchStartLng: String(searchStart.lng),
              }
            : {}),
          ...(searchStartLabel ? { searchStartLabel } : {}),
          ...(searchEnd
            ? {
                searchEndLat: String(searchEnd.lat),
                searchEndLng: String(searchEnd.lng),
              }
            : {}),
          ...(searchEndLabel ? { searchEndLabel } : {}),
          radiusM: String(radiusMeters),
        },
      });
    });
  }, [
    activeScope,
    locationReminder,
    radiusMeters,
    refreshToken,
    searchEnd,
    searchEndLabel,
    searchStart,
    searchStartLabel,
  ]);

  const searchSummary = useMemo(() => {
    if (!hasSearch) {
      return null;
    }

    return `${searchStartLabel} → ${searchEndLabel}`;
  }, [hasSearch, searchEndLabel, searchStartLabel]);

  const scopeSummary = useMemo(() => {
    return activeScope === "intercity"
      ? "Аймаг, хот хоорондын урт чиглэлүүдийг нэг таб дээрээс харна."
      : "Ойрын зам, хот доторх чиглэлүүдийг эхлэх ба очих цэгээр нь шүүж харна.";
  }, [activeScope]);

  const handleScopeChange = useCallback(
    (nextScope: RideScope) => {
      if (nextScope === activeScope) {
        return;
      }

      router.replace({
        pathname: "/rides",
        params: {
          scope: nextScope,
        },
      });
    },
    [activeScope]
  );

  const openSearch = useCallback(() => {
    router.push({
      pathname: "/ride/search" as never,
      params: {
        scope: activeScope,
        radiusM: String(radiusMeters),
        ...(searchStart ? { startLat: String(searchStart.lat), startLng: String(searchStart.lng) } : {}),
        ...(searchStartLabel ? { startLabel: searchStartLabel } : {}),
        ...(searchEnd ? { endLat: String(searchEnd.lat), endLng: String(searchEnd.lng) } : {}),
        ...(searchEndLabel ? { endLabel: searchEndLabel } : {}),
      },
    });
  }, [activeScope, radiusMeters, searchEnd, searchEndLabel, searchStart, searchStartLabel]);

  const clearSearch = useCallback(() => {
    router.replace({
      pathname: "/rides",
      params: {
        scope: activeScope,
      },
    });
  }, [activeScope]);

  return (
    <View style={styles.container}>
      <FlatList
        data={rides}
        keyExtractor={(item) => String(item.id)}
        refreshing={loading}
        onRefresh={loadRides}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <LinearGradient
              colors={[AppTheme.colors.text, AppTheme.colors.accentDeep]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <Text style={styles.heroEyebrow}>Route Board</Text>
              <Text style={styles.heroTitle}>
                {activeScope === "intercity" ? "Хот хоорондын чиглэлүүд" : "Хот доторх чиглэлүүд"}
              </Text>
              <Text style={styles.heroBody}>{scopeSummary}</Text>

              <View style={styles.heroStatsRow}>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatValue}>{rides.length}</Text>
                  <Text style={styles.heroStatLabel}>
                    {hasSearch ? "Тохирсон чиглэл" : "Нээлттэй чиглэл"}
                  </Text>
                </View>
                <View style={styles.heroStatCard}>
                  <Text style={styles.heroStatValue}>{formatRadiusLabel(radiusMeters)}</Text>
                  <Text style={styles.heroStatLabel}>Одоогийн радиус</Text>
                </View>
              </View>
            </LinearGradient>

            <View style={styles.segmentWrap}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.segmentButton, activeScope === "local" && styles.segmentButtonActive]}
                onPress={() => handleScopeChange("local")}
              >
                <Text
                  style={[styles.segmentText, activeScope === "local" && styles.segmentTextActive]}
                >
                  Хот дотор
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.segmentButton, activeScope === "intercity" && styles.segmentButtonActive]}
                onPress={() => handleScopeChange("intercity")}
              >
                <Text
                  style={[
                    styles.segmentText,
                    activeScope === "intercity" && styles.segmentTextActive,
                  ]}
                >
                  Хот хооронд
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchCard}>
              <View style={styles.searchCardTop}>
                <View style={styles.searchHeadingWrap}>
                  <AppIconBadge
                    name={hasSearch ? "travel-explore" : "search"}
                    theme="accent"
                    style={styles.searchBadge}
                  />
                  <View style={styles.searchCopyWrap}>
                    <Text style={styles.searchTitle}>Чиглэл хайх</Text>
                    <Text style={styles.searchBody}>
                      Эхлэх цэг, очих цэгээ газрын зургаар эсвэл үгээр сонгоод заруудаас шүүж харна.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity activeOpacity={0.92} style={styles.primaryButton} onPress={openSearch}>
                  <Text style={styles.primaryButtonText}>
                    {hasSearch ? "Хайлтаа өөрчлөх" : "Чиглэл хайх"}
                  </Text>
                </TouchableOpacity>
              </View>

              {hasSearch ? (
                <View style={styles.filterSummaryCard}>
                  <Text style={styles.filterSummaryLabel}>Идэвхтэй хайлт</Text>
                  <Text style={styles.filterSummaryValue}>{searchSummary}</Text>
                  <View style={styles.filterMetaRow}>
                    <Text style={styles.filterMetaText}>Радиус: {formatRadiusLabel(radiusMeters)}</Text>
                    <TouchableOpacity activeOpacity={0.92} onPress={clearSearch}>
                      <Text style={styles.clearSearchText}>Хайлтыг цэвэрлэх</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <IllustratedEmptyState
            icon={loading ? "hourglass-empty" : "map"}
            eyebrow={activeScope === "intercity" ? "Intercity Routes" : "City Routes"}
            title={
              loading
                ? "Чиглэлүүдийг ачаалж байна..."
                : hasSearch
                  ? "Тохирох чиглэл хараахан олдсонгүй"
                  : "Одоогоор нээлттэй чиглэл алга"
            }
            body={
              hasSearch
                ? "Хайлтын радиусаа өөрчилж эсвэл өөр эхлэх, очих цэг сонгоод дахин шалгаарай."
                : "Шинэ чиглэл нэмэгдэхэд энд шууд харагдана. Хайлтаар шүүгээд өөрт тохирохыг нь олж болно."
            }
            tone={activeScope === "intercity" ? "ink" : "accent"}
            style={styles.emptyCard}
          />
        }
        renderItem={({ item }) => {
          const rideId = Number(item?.id);
          const availableSeats = getAvailableSeatCount(item);
          const seatIllustrationCount = getSeatIllustrationCount(availableSeats);
          const ownerName = getRideOwnerName(item);
          const rideStatus = String(item?.status || "active").toLowerCase();
          const rideStatusLabel = getRideStatusLabel(rideStatus);
          const rideStatusTone = getRideStatusTone(rideStatus);
          const isBookableStatus = ["active", "scheduled", "pending"].includes(rideStatus);
          const bookingStatus = String(
            item?.booking_status || bookingStatusByRide[rideId] || ""
          ).toLowerCase();
          const bookingStatusLabel =
            item?.booking_status_label ||
            bookingStatusLabelByRide[rideId] ||
            (bookingStatus ? getBookingStatusLabel(bookingStatus) : "");
          const isBooked = bookedRideIds.includes(rideId);
          const routeLabel = getRouteLabel(item);
          const showBookCta = !isBooked && availableSeats > 0 && isBookableStatus;

          return (
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.card}
              onPress={() =>
                router.push({
                  pathname: "/ride/[id]",
                  params: {
                    id: String(item.id),
                    role: "rider",
                  },
                })
              }
            >
              <View style={styles.cardHeader}>
                <View style={styles.driverWrap}>
                  <Image source={getAvatarSource(item.avatar_id)} style={styles.avatar} />
                  <View style={styles.driverMeta}>
                    <Text style={styles.driverName}>{ownerName}</Text>
                    <Text style={styles.dateText}>
                      {formatRideDate(item.ride_date)} · {String(item.start_time || "-").slice(0, 5)}
                    </Text>
                  </View>
                </View>

                <View style={styles.priceChip}>
                  <Text style={styles.priceCaption}>1 суудал</Text>
                  <Text style={styles.priceText}>{Number(item?.price || 0).toLocaleString()}₮</Text>
                </View>
              </View>

              <View style={styles.routeRow}>
                <View style={styles.routeCopy}>
                  <Text style={styles.routeLabel}>{routeLabel}</Text>
                  <Text style={styles.routeMeta}>
                    {activeScope === "intercity" ? "Хот хоорондын чиглэл" : "Хот доторх чиглэл"}
                  </Text>

                  <View style={styles.metaChipRow}>
                    <View
                      style={[
                        styles.metaChip,
                        { backgroundColor: rideStatusTone.backgroundColor },
                      ]}
                    >
                      <Text style={[styles.metaChipText, { color: rideStatusTone.color }]}>
                        {rideStatusLabel}
                      </Text>
                    </View>

                    <View style={styles.metaChip}>
                      <Text style={styles.metaChipText}>{availableSeats} сул суудал</Text>
                    </View>

                    {isBooked && bookingStatusLabel ? (
                      <View
                        style={[
                          styles.metaChip,
                          {
                            backgroundColor: `${getBookingStatusColor(bookingStatus)}16`,
                            borderColor: `${getBookingStatusColor(bookingStatus)}33`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.metaChipText,
                            { color: getBookingStatusColor(bookingStatus) },
                          ]}
                        >
                          {bookingStatusLabel}
                        </Text>
                      </View>
                    ) : null}

                    {hasSearch &&
                    Number.isFinite(Number(item?.origin_distance_m)) &&
                    Number.isFinite(Number(item?.destination_distance_m)) ? (
                      <View style={styles.metaChip}>
                        <Text style={styles.metaChipText}>
                          Match {formatRadiusLabel(Number(item.origin_distance_m))} ·{" "}
                          {formatRadiusLabel(Number(item.destination_distance_m))}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                <Image
                  source={seatImages[seatIllustrationCount] || seatImages[1]}
                  style={styles.seatImage}
                />
              </View>

              {showBookCta ? (
                <View style={styles.cardAction}>
                  <Text style={styles.cardActionText}>Суудал захиалах</Text>
                  <Text style={styles.cardActionHint}>Дэлгэрэнгүй</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.canvas,
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 42,
  },
  headerWrap: {
    paddingTop: 18,
    paddingBottom: 22,
    gap: 16,
  },
  heroCard: {
    borderRadius: AppTheme.radius.lg,
    paddingHorizontal: 22,
    paddingVertical: 24,
    ...AppTheme.shadow.floating,
  },
  heroEyebrow: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: AppFontFamily,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  heroTitle: {
    color: AppTheme.colors.white,
    fontFamily: AppFontFamily,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  heroBody: {
    color: "rgba(255,255,255,0.82)",
    fontFamily: AppFontFamily,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  heroStatCard: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: AppTheme.radius.md,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroStatValue: {
    color: AppTheme.colors.white,
    fontFamily: AppFontFamily,
    fontSize: 20,
    fontWeight: "700",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: AppFontFamily,
    fontSize: 12,
    marginTop: 4,
  },
  segmentWrap: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: AppTheme.colors.canvasMuted,
    borderRadius: AppTheme.radius.pill,
    padding: 6,
  },
  segmentButton: {
    flex: 1,
    borderRadius: AppTheme.radius.pill,
    paddingVertical: 12,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: AppTheme.colors.card,
    ...AppTheme.shadow.card,
  },
  segmentText: {
    color: AppTheme.colors.textMuted,
    fontFamily: AppFontFamily,
    fontSize: 14,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: AppTheme.colors.text,
  },
  searchCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 18,
    gap: 16,
    ...AppTheme.shadow.card,
  },
  searchCardTop: {
    gap: 16,
  },
  searchHeadingWrap: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  searchBadge: {
    marginTop: 2,
  },
  searchCopyWrap: {
    flex: 1,
  },
  searchTitle: {
    color: AppTheme.colors.text,
    fontFamily: AppFontFamily,
    fontSize: 18,
    fontWeight: "700",
  },
  searchBody: {
    color: AppTheme.colors.textMuted,
    fontFamily: AppFontFamily,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  primaryButton: {
    alignSelf: "flex-start",
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: AppTheme.colors.white,
    fontFamily: AppFontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  filterSummaryCard: {
    borderRadius: AppTheme.radius.md,
    backgroundColor: AppTheme.colors.cardSoft,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 14,
    gap: 8,
  },
  filterSummaryLabel: {
    color: AppTheme.colors.textMuted,
    fontFamily: AppFontFamily,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  filterSummaryValue: {
    color: AppTheme.colors.text,
    fontFamily: AppFontFamily,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  filterMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  filterMetaText: {
    color: AppTheme.colors.textMuted,
    fontFamily: AppFontFamily,
    fontSize: 13,
  },
  clearSearchText: {
    color: AppTheme.colors.accentDeep,
    fontFamily: AppFontFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyCard: {
    marginTop: 8,
  },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 18,
    marginBottom: 14,
    ...AppTheme.shadow.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  driverWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  driverMeta: {
    flex: 1,
  },
  driverName: {
    color: AppTheme.colors.text,
    fontFamily: AppFontFamily,
    fontSize: 15,
    fontWeight: "700",
  },
  dateText: {
    color: AppTheme.colors.textMuted,
    fontFamily: AppFontFamily,
    fontSize: 12,
    marginTop: 4,
  },
  priceChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.accentGlow,
    borderWidth: 1,
    borderColor: AppTheme.colors.accentSoft,
    alignItems: "flex-end",
    gap: 2,
  },
  priceCaption: {
    color: AppTheme.colors.textMuted,
    fontFamily: AppFontFamily,
    fontSize: 11,
  },
  priceText: {
    color: AppTheme.colors.accentDeep,
    fontFamily: AppFontFamily,
    fontSize: 13,
    fontWeight: "700",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 16,
  },
  routeCopy: {
    flex: 1,
  },
  routeLabel: {
    color: AppTheme.colors.text,
    fontFamily: AppFontFamily,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  routeMeta: {
    color: AppTheme.colors.textMuted,
    fontFamily: AppFontFamily,
    fontSize: 13,
    marginTop: 4,
  },
  cardAction: {
    marginTop: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.accentSoft,
    backgroundColor: AppTheme.colors.accentGlow,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardActionText: {
    color: AppTheme.colors.accentDeep,
    fontFamily: AppFontFamily,
    fontSize: 14,
    fontWeight: "700",
  },
  cardActionHint: {
    color: AppTheme.colors.textMuted,
    fontFamily: AppFontFamily,
    fontSize: 12,
  },
  metaChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metaChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.cardSoft,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  metaChipText: {
    color: AppTheme.colors.textMuted,
    fontFamily: AppFontFamily,
    fontSize: 12,
    fontWeight: "600",
  },
  seatImage: {
    width: 86,
    height: 78,
    resizeMode: "contain",
  },
});
