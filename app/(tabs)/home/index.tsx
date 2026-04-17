import AppIconBadge from "@/components/AppIconBadge";
import DriverRequestPopup from "@/components/DriverRequestPopup";
import IllustratedEmptyState from "@/components/IllustratedEmptyState";
import { AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import { getToken, getUser } from "@/services/authStorage";
import {
  extractBookedRideIds,
  extractBookingStatusByRide,
  extractBookingStatusLabelByRide,
  getBookingStatusColor,
  getBookingStatusLabel,
} from "@/services/bookingStatus";
import {
  syncRideReminderNotifications,
  syncRideReminderNotificationsFromServer,
} from "@/services/rideReminders";
import {
  canReviewDriverRequestNotification,
  countUnreadNotifications,
  getNotificationBookingId,
  getNotificationRequesterName,
  sortNotificationsNewestFirst,
} from "@/services/notificationUtils";
import { playActionSuccessSound } from "@/services/notificationSound";
import { showLocationUsageReminder } from "@/services/locationUsageReminder";
import { shouldShowRideOnHome } from "@/services/rideTiming";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

function extractRideList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rides)) return payload.rides;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function getSettledValue<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
  label: string
) {
  if (result.status === "fulfilled") {
    return result.value;
  }

  console.log(`${label} load error`, result.reason);
  return fallback;
}

type DriverDecisionAction = "approve" | "reject" | null;

function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [bookedRides, setBookedRides] = useState<any[]>([]);
  const [bookingStatusByRide, setBookingStatusByRide] = useState<Record<number, string>>({});
  const [bookingStatusLabelByRide, setBookingStatusLabelByRide] = useState<Record<number, string>>({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [driverDecisionLoading, setDriverDecisionLoading] = useState<DriverDecisionAction>(null);
  const [activeTrustTip, setActiveTrustTip] = useState<number | null>(null);
  const [activeShieldTip, setActiveShieldTip] = useState(false);
  const trustTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const walletFloat = useRef(new Animated.Value(0)).current;
  const createPulse = useRef(new Animated.Value(0)).current;
  const walletFloatLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const createPulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const locationReminderShownRef = useRef(false);
  const params = useLocalSearchParams<{
    startLat?: string;
    startLng?: string;
    startLabel?: string;
    rideCreated?: string;
    locationReminder?: string;
  }>();

  const startLat = params.startLat;
  const startLng = params.startLng;
  const startLabel = params.startLabel;
  const locationReminder = params.locationReminder;

  const getRevealStyle = useCallback((value: Animated.Value, distance = 30) => ({
    opacity: value,
    transform: [
      {
        translateY: value.interpolate({
          inputRange: [0, 1],
          outputRange: [distance, 0],
        }),
      },
      {
        scale: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.97, 1],
        }),
      },
    ],
  }), []);

  const walletFloatStyle = {
    transform: [
      {
        translateY: walletFloat.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -5],
        }),
      },
    ],
  };

  const createPulseStyle = {
    transform: [
      {
        scale: createPulse.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.025],
        }),
      },
    ],
  };

  const trustLevel = Math.max(
    1,
    Math.min(5, Math.floor(Number(user?.trust_level ?? user?.trustLevel ?? user?.rating ?? 1)))
  );
  const shouldShowShieldPopup = trustLevel < 4;

  const shieldHintText = "Итгэлцэл хүлээсэн жолооч буюу жолоочийн эрх, тээврийн хэрэгслээ баталгаажуулсан 4 одтой жолооч дээр идэвхжинэ.";

  const onPressShield = () => {
    if (!shouldShowShieldPopup) return;
    setActiveShieldTip((prev) => !prev);
  };

  const closeTrustTip = useCallback(() => {
    if (trustTipTimerRef.current) {
      clearTimeout(trustTipTimerRef.current);
      trustTipTimerRef.current = null;
    }
    setActiveTrustTip(null);
  }, []);

  const openTrustTip = useCallback((level: number) => {
    if (trustTipTimerRef.current) {
      clearTimeout(trustTipTimerRef.current);
    }

    setActiveShieldTip(false);
    setActiveTrustTip(level);

    trustTipTimerRef.current = setTimeout(() => {
      setActiveTrustTip(null);
      trustTipTimerRef.current = null;
    }, 10000);
  }, []);

  const applyNotifications = useCallback((list: any[]) => {
    const next = sortNotificationsNewestFirst(Array.isArray(list) ? list : []);
    setNotifications(next);
    setUnreadCount(countUnreadNotifications(next));
  }, []);

  const loadNotificationsOnly = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      applyNotifications([]);
      return;
    }

    try {
      const data = await apiFetch("/notifications").catch(() => []);
      applyNotifications(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Home notifications load error", err);
    }
  }, [applyNotifications]);

  const stopWidgetAnimations = useCallback(() => {
    walletFloatLoopRef.current?.stop();
    createPulseLoopRef.current?.stop();
    walletFloat.stopAnimation();
    createPulse.stopAnimation();
  }, [createPulse, walletFloat]);

  const startWidgetAnimations = useCallback(() => {
    sectionAnimations.forEach((value) => value.setValue(0));
    stopWidgetAnimations();

    Animated.stagger(
      90,
      sectionAnimations.map((value, index) =>
        Animated.timing(value, {
          toValue: 1,
          duration: 520 + index * 40,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )
    ).start();

    walletFloat.setValue(0);
    walletFloatLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(walletFloat, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(walletFloat, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    walletFloatLoopRef.current.start();

  }, [sectionAnimations, stopWidgetAnimations, walletFloat]);

  const trustLevelHints = [
    { stars: 1, title: "⭐ 1 од", text: "Шинээр бүртгүүлсэн хэрэглэгч." },
    { stars: 2, title: "⭐⭐ 2 од", text: "И-мэйл болон утас баталгаажуулсан." },
    { stars: 3, title: "⭐⭐⭐ 3 од", text: "Төлбөрийн данс баталгаажуулсан." },
    { stars: 4, title: "⭐⭐⭐⭐ 4 од", text: "Жолоочийн эрх болон тээврийн хэрэгслээ баталгаажуулсан." },
    { stars: 5, title: "⭐⭐⭐⭐⭐ 5 од", text: "One Way-оос баталгаажуулсан." },
  ];

  const loadHome = useCallback(async () => {
      const token = await getToken();
      if (!token) {
        setUser(null);
        setActiveRide(null);
        setBookedRides([]);
        setBookingStatusByRide({});
        setBookingStatusLabelByRide({});
        applyNotifications([]);
        return;
      }

      const cachedUser = await getUser().catch(() => null);
      if (cachedUser) {
        setUser(cachedUser);
      }

      try {
        const userData = await apiFetch("/users/me");
        setUser(userData);

        const [
          rideDataResult,
          myBookingsResult,
          allRidesResult,
          myRidesResult,
          notificationsResult,
        ] = await Promise.allSettled([
          apiFetch("/rides/active"),
          apiFetch("/bookings/mine"),
          apiFetch("/rides"),
          apiFetch("/rides/mine"),
          apiFetch("/notifications"),
        ]);

        const rideData = getSettledValue(rideDataResult, null, "Active ride");
        const myBookings = getSettledValue(
          myBookingsResult,
          { ride_ids: [] },
          "My bookings"
        );
        const allRidesRaw = getSettledValue(allRidesResult, [], "Ride list");
        const myRidesRaw = getSettledValue(myRidesResult, [], "My rides");
        const notifications = getSettledValue(
          notificationsResult,
          [],
          "Notifications"
        );
        const allRides = extractRideList(allRidesRaw);
        const myRides = extractRideList(myRidesRaw);
        const mineList = Array.isArray(myRides) ? myRides : [];

        const bookedIds = extractBookedRideIds(myBookings);
        const nextBookingStatusByRide = extractBookingStatusByRide(myBookings);
        const nextBookingStatusLabelByRide = extractBookingStatusLabelByRide(myBookings);
        setBookingStatusByRide(nextBookingStatusByRide);
        setBookingStatusLabelByRide(nextBookingStatusLabelByRide);

        const now = new Date();

        const matched = Array.isArray(allRides)
          ? allRides
              .filter((r: any) => bookedIds.includes(Number(r?.id)))
              .filter((ride: any) => shouldShowRideOnHome(ride, now))
              .map((ride: any) => {
                const rideId = Number(ride?.id);
                const bookingStatus = nextBookingStatusByRide[rideId];

                return {
                  ...ride,
                  booking_status: bookingStatus,
                  booking_status_label:
                    nextBookingStatusLabelByRide[rideId] || getBookingStatusLabel(bookingStatus),
                };
              })
          : [];

        setBookedRides(matched);

        const enrichedActiveRide =
          Array.isArray(allRides) && rideData?.id
            ? allRides.find((r: any) => Number(r?.id) === Number(rideData.id)) || rideData
            : rideData;

        const pickLatestRide = (list: any[]) =>
          list
            .filter((ride: any) => shouldShowRideOnHome(ride, now))
            .sort((a: any, b: any) => Number(b?.id || 0) - Number(a?.id || 0))[0] || null;

        const mineFallback =
          mineList.length > 0
            ? pickLatestRide(mineList)
            : Array.isArray(allRides)
              ? pickLatestRide(allRides.filter((r: any) => {
                  const ownerId =
                    r?.user_id ??
                    r?.driver_id ??
                    r?.creator_id ??
                    r?.user?.id ??
                    r?.driver?.id;
                  return Number(ownerId) === Number(userData?.id);
                }))
              : null;

        const nextActiveRide = shouldShowRideOnHome(enrichedActiveRide, now)
          ? enrichedActiveRide
          : null;

        setActiveRide(nextActiveRide?.id ? nextActiveRide : mineFallback);

        applyNotifications(Array.isArray(notifications) ? notifications : []);
        void syncRideReminderNotifications({
          allRides,
          myRides: mineList,
          bookings: myBookings,
        });
      } catch (err) {
        console.log("Home load error", err);
      }
    }, [applyNotifications]);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  useEffect(() => {
    if (!locationReminder || locationReminderShownRef.current) {
      return;
    }

    locationReminderShownRef.current = true;

    showLocationUsageReminder(locationReminder, () => {
      router.replace({
        pathname: "/home",
        params: {
          ...(startLat ? { startLat } : {}),
          ...(startLng ? { startLng } : {}),
          ...(startLabel ? { startLabel } : {}),
        },
      });
    });
  }, [locationReminder, startLabel, startLat, startLng]);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
      startWidgetAnimations();

      const timer = setInterval(() => {
        void loadNotificationsOnly();
      }, 8000);

      return () => {
        clearInterval(timer);
        stopWidgetAnimations();
      };
    }, [loadHome, loadNotificationsOnly, startWidgetAnimations, stopWidgetAnimations])
  );

  useEffect(() => {
    return () => {
      if (trustTipTimerRef.current) {
        clearTimeout(trustTipTimerRef.current);
      }
      stopWidgetAnimations();
    };
  }, [stopWidgetAnimations]);

  const getAvatarSource = () => {
    if (!user?.avatar_id) return icons.profile;
    return avatars[user.avatar_id as keyof typeof avatars] || icons.profile;
  };

  const getRideAvatarSource = (avatarId?: string) => {
    if (!avatarId) return avatars.sister;
    return avatars[avatarId as keyof typeof avatars] || avatars.sister;
  };

  const getRideOwnerName = (ride: any) => {
    return (
      ride?.user_name ||
      ride?.driver_name ||
      ride?.creator_name ||
      ride?.name ||
      ride?.user?.name ||
      ride?.driver?.name ||
      null
    );
  };

  const getAvailableSeats = (ride: any) => {
    if (typeof ride?.available_seats === "number") {
      return Math.min(Math.max(ride.available_seats, 1), 4);
    }

    if (typeof ride?.seats === "number") {
      return Math.min(Math.max(ride.seats, 1), 4);
    }

    const seatsTotal = Number(ride?.seats_total) || 0;
    const seatsTaken = Number(ride?.seats_taken) || 0;
    const avail = Math.max(1, seatsTotal - seatsTaken || 1);
    return Math.min(avail, 4);
  };

  const activeDriverRequest =
    user?.role === "driver"
      ? notifications.find((item: any) => canReviewDriverRequestNotification(item)) || null
      : null;

  const handleDriverDecision = useCallback(
    async (item: any, action: "approve" | "reject") => {
      const bookingId = getNotificationBookingId(item);
      const notificationId = Number(item?.id);

      if (!bookingId || !Number.isFinite(notificationId)) {
        Alert.alert("Алдаа", "Захиалгын мэдээлэл дутуу байна.");
        return;
      }

      try {
        setDriverDecisionLoading(action);
        await apiFetch(`/bookings/${bookingId}/${action}`, { method: "PATCH" });
        await apiFetch(`/notifications/${notificationId}/read`, { method: "PATCH" }).catch(() => null);

        setNotifications((prev) => {
          const next = prev.map((entry: any) =>
            Number(entry?.id) === notificationId
              ? {
                  ...entry,
                  is_read: true,
                  booking_status: action === "approve" ? "approved" : "rejected",
                }
              : entry
          );
          setUnreadCount(countUnreadNotifications(next));
          return next;
        });

        void playActionSuccessSound();
        void syncRideReminderNotificationsFromServer();
        void loadHome();
      } catch (err: any) {
        Alert.alert("Алдаа", err?.message || "Үйлдэл амжилтгүй боллоо.");
      } finally {
        setDriverDecisionLoading(null);
      }
    },
    [loadHome]
  );

  const selectedPickupReady = Boolean(startLat && startLng);
  const heroSubtitle =
    user?.role === "driver"
      ? "Зам, захиалга, баталгаажуулалтаа нэг дороос хянаарай."
      : "Дараагийн унаагаа хурдан олоод, захиалгаа хялбар удирдаарай.";

  useEffect(() => {
    createPulseLoopRef.current?.stop();
    createPulse.stopAnimation();
    createPulse.setValue(0);

    if (!selectedPickupReady) {
      return;
    }

    createPulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(createPulse, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(createPulse, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    createPulseLoopRef.current.start();

    return () => {
      createPulseLoopRef.current?.stop();
    };
  }, [createPulse, selectedPickupReady]);

  const bookedRideList: any[] = Array.isArray(bookedRides) ? bookedRides : [];

  if (Array.isArray(bookedRides)) {
    return (
      <View style={styles.safe}>
        <DriverRequestPopup
          visible={!!activeDriverRequest}
          requesterName={getNotificationRequesterName(activeDriverRequest)}
          title={activeDriverRequest?.title}
          body={activeDriverRequest?.body}
          busyAction={driverDecisionLoading}
          onApprove={() =>
            activeDriverRequest &&
            handleDriverDecision(activeDriverRequest, "approve")
          }
          onReject={() =>
            activeDriverRequest &&
            handleDriverDecision(activeDriverRequest, "reject")
          }
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.container}>
            <Animated.View style={getRevealStyle(sectionAnimations[0], 20)}>
            <LinearGradient
              colors={[
                AppTheme.colors.accentDeep,
                AppTheme.colors.accent,
                "#72957f",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumHero}
            >
              <View style={styles.premiumHeroTopRow}>
                <View style={styles.premiumHeroTitleWrap}>
                  <Text style={styles.premiumHeroEyebrow}>Нүүр</Text>
                  <Text style={styles.premiumGreetingText}>
                    Сайн уу, {user?.name || "Хэрэглэгч"}
                  </Text>
                  {false && <Text style={styles.premiumHeroSubtext}>{heroSubtitle}</Text>}
                </View>

                <View style={styles.premiumHeroActionRow}>
                  <TouchableOpacity
                    style={styles.premiumTopIconButton}
                    onPress={() => router.push("/history")}
                  >
                    <Image source={icons.time} style={styles.premiumTopIcon} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.premiumTopIconButton,
                      styles.notificationWrap,
                    ]}
                    onPress={() => router.push("/notifications")}
                  >
                    <Image
                      source={icons.notification}
                      style={styles.premiumTopIcon}
                    />
                    {unreadCount > 0 && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.premiumHeroBody}>
                <View style={styles.premiumAvatarColumn}>
                  <View style={styles.premiumProfileWrap}>
                    <Image
                      source={getAvatarSource()}
                      style={styles.premiumAvatar}
                    />
                    <TouchableOpacity
                      onPress={onPressShield}
                      style={styles.premiumShieldBtn}
                      activeOpacity={0.8}
                    >
                      <Image
                        source={
                          trustLevel >= 4 ? icons.shieldActive : icons.shield
                        }
                        style={styles.premiumShield}
                      />
                    </TouchableOpacity>
                    {activeShieldTip && trustLevel < 4 && (
                      <View style={styles.premiumShieldHintCard}>
                        <Text style={styles.premiumShieldHintText}>
                          {shieldHintText}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setActiveShieldTip(false)}
                        >
                          <Text style={styles.premiumHintClose}>Хаах</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <View style={styles.premiumRatingRow}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TouchableOpacity key={i} onPress={() => openTrustTip(i)}>
                        <Image
                          source={icons.starHalf}
                          style={[
                            styles.premiumStar,
                            {
                              tintColor:
                                i <= trustLevel
                                  ? AppTheme.colors.gold
                                  : "rgba(255,255,255,0.28)",
                            },
                          ]}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.premiumHeroSide}>
                  <Animated.View style={walletFloatStyle}>
                    <TouchableOpacity
                      style={styles.premiumWalletCard}
                      onPress={() => router.push("/wallet")}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.premiumWalletLabel}>OW Coin</Text>
                      <View style={styles.premiumWalletValueRow}>
                        <Image source={icons.coin} style={styles.premiumCoinIcon} />
                        <Text style={styles.premiumWalletValue}>
                          {user?.balance ?? 0}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>

                  <View style={styles.premiumStatsRow}>
                    <View style={styles.premiumMiniStatCard}>
                      <Text style={styles.premiumMiniStatValue}>
                        {bookedRideList.length}
                      </Text>
                      <Text style={styles.premiumMiniStatLabel}>Захиалга</Text>
                    </View>
                    <View style={styles.premiumMiniStatCard}>
                      <Text style={styles.premiumMiniStatValue}>
                        {unreadCount}
                      </Text>
                      <Text style={styles.premiumMiniStatLabel}>Мэдэгдэл</Text>
                    </View>
                  </View>

                  <View style={styles.premiumPillRow}>
                    <View style={styles.premiumInfoPill}>
                      <Text style={styles.premiumInfoPillText}>
                        Итгэл {trustLevel}/5
                      </Text>
                    </View>
                    <View style={styles.premiumInfoPill}>
                      <Text style={styles.premiumInfoPillText}>
                        {activeRide ? "Идэвхтэй аялалтай" : "Аялал алга"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </LinearGradient>
            </Animated.View>

            {bookedRideList.length > 0 ? (
              <Animated.View style={getRevealStyle(sectionAnimations[1], 28)}>
              <View style={styles.premiumSectionCard}>
                <Text style={styles.premiumSectionEyebrow}>Захиалгууд</Text>
                <Text style={styles.premiumSectionTitle}>
                  Таны сүүлийн захиалгууд
                </Text>
                <Text style={styles.premiumSectionText}>
                  Баталгаажсан, хүлээгдэж буй, эсвэл татгалзсан төлөвөө эндээс
                  шууд харна.
                </Text>

                <View style={styles.premiumBookedScrollCard}>
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.bookedScrollContent}
                  >
                    {bookedRideList.map((ride: any) => {
                      const rideId = Number(ride?.id);
                      const bookingStatus = String(
                        ride?.booking_status || bookingStatusByRide[rideId] || ""
                      ).toLowerCase();
                      const bookingStatusLabel =
                        ride?.booking_status_label ||
                        bookingStatusLabelByRide[rideId] ||
                        getBookingStatusLabel(bookingStatus);

                      return (
                        <TouchableOpacity
                          key={String(ride.id)}
                          style={styles.premiumBookedRideCard}
                          onPress={() =>
                            router.push({
                              pathname: "/ride/[id]",
                              params: { id: String(ride.id), role: "rider" },
                            })
                          }
                        >
                          <Image
                            source={getRideAvatarSource(ride.avatar_id)}
                            style={styles.bookedAvatar}
                          />

                          <View style={styles.bookedInfo}>
                            {getRideOwnerName(ride) ? (
                              <Text style={styles.bookedName}>
                                {getRideOwnerName(ride)}
                              </Text>
                            ) : null}
                            <Text style={styles.bookedDate}>
                              Огноо: {ride.ride_date || "-"}
                            </Text>
                            <Text style={styles.bookedTime}>
                              Цаг: {ride.start_time || "-"}
                            </Text>
                            <Text style={styles.bookedEnd} numberOfLines={1}>
                              Очих газар:{" "}
                              {ride.end_location || "Тодорхойгүй"}
                            </Text>
                            <Text style={styles.bookedPrice}>
                              1 суудал: {ride.price ?? 0}₮
                            </Text>
                            <Text
                              style={[
                                styles.bookedBadge,
                                { color: getBookingStatusColor(bookingStatus) },
                              ]}
                            >
                              {bookingStatusLabel}
                            </Text>
                          </View>

                          <Image
                            source={
                              seatImages[getAvailableSeats(ride)] || seatImages[1]
                            }
                            style={styles.bookedSeatImage}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
              </Animated.View>
            ) : (
              <Animated.View style={getRevealStyle(sectionAnimations[1], 28)}>
              <View style={styles.premiumEmptyStateCard}>
                <Text style={styles.premiumEmptyStateTitle}>
                  Захиалга хараахан алга
                </Text>
                <Text style={styles.premiumEmptyStateText}>
                  Та одоогоор чиглэлд захиалга өгөөгүй байна.
                </Text>
              </View>
              </Animated.View>
            )}

            {activeRide ? (
              <Animated.View style={getRevealStyle(sectionAnimations[2], 34)}>
              <TouchableOpacity
                style={styles.premiumActiveCard}
                onPress={() => router.push(`/ride/${activeRide.id}`)}
              >
                <Text style={styles.premiumSectionEyebrow}>Идэвхтэй</Text>
                <View style={styles.cardHeader}>
                  <Image source={icons.ways} style={styles.cardIcon} />
                  <Text style={styles.premiumSectionTitle}>
                    Таны аялалын зам
                  </Text>
                </View>
                <Text style={styles.premiumSectionText}>
                  Одоо явж буй эсвэл хамгийн сүүлд үүсгэсэн маршрутаа нээж
                  дэлгэрэнгүйг шалгана.
                </Text>

                <View style={styles.activeContentRow}>
                  <View style={styles.activeInfo}>
                    {getRideOwnerName(activeRide) ? (
                      <Text style={styles.activeName}>
                        {getRideOwnerName(activeRide)}
                      </Text>
                    ) : null}
                    <Text style={styles.activeDate}>
                      Огноо: {activeRide.ride_date || "-"}
                    </Text>
                    <Text style={styles.activeTime}>
                      Цаг: {activeRide.start_time || "-"}
                    </Text>
                    <Text style={styles.activeEnd} numberOfLines={2}>
                      Очих газар:{" "}
                      {activeRide.end_location ??
                        activeRide.to_location ??
                        "Тодорхойгүй"}
                    </Text>
                    <Text style={styles.activePrice}>
                      1 суудал: {activeRide.price ?? 0}₮
                    </Text>
                  </View>

                  <View style={styles.premiumSeatCard}>
                    <Image
                      source={
                        seatImages[getAvailableSeats(activeRide)] || seatImages[1]
                      }
                      style={styles.activeSeatImage}
                    />
                  </View>
                </View>
              </TouchableOpacity>
              </Animated.View>
            ) : (
              <Animated.View style={getRevealStyle(sectionAnimations[2], 34)}>
              <View style={styles.premiumEmptyStateCard}>
                <Text style={styles.premiumEmptyStateTitle}>
                  Идэвхтэй аялал алга
                </Text>
                <Text style={styles.premiumEmptyStateText}>
                  Шинэ чиглэл үүсгээд маршрутаа бэлдэж эхлээрэй.
                </Text>
              </View>
              </Animated.View>
            )}

            <Animated.View style={getRevealStyle(sectionAnimations[3], 40)}>
            <View style={styles.premiumSectionCard}>
              <Text style={styles.premiumSectionEyebrow}>Чиглэл үүсгэх</Text>
            
              <Text style={styles.premiumSectionText}>
                Эхлээд эхлэх цэгээ сонгоод, дараа нь очих байршлаа оруулбал зам
                үүснэ.
              </Text>

              <TouchableOpacity
                style={styles.premiumPickupBtn}
                onPress={() =>
                  router.push({
                    pathname: "/location/map",
                    params: { returnTo: "home" },
                  })
                }
              >
                <Text style={styles.pickupText}>Эхлэх байршил сонгох</Text>
                <Text style={styles.premiumPickupSubtext}>
                  {selectedPickupReady
                    ? startLabel
                      ? `Сонгосон pickup: ${startLabel}`
                      : "Байршил сонгогдсон. Одоо очих цэгээ үргэлжлүүлээрэй."
                    : "Нэрээр хайж эсвэл map дээрээс pickup цэгээ сонгоно."}
                </Text>
              </TouchableOpacity>

              <Animated.View style={createPulseStyle}>
              <TouchableOpacity
                style={[
                  styles.premiumCreateBtn,
                  !selectedPickupReady && styles.premiumCreateBtnDisabled,
                ]}
                onPress={() => {
                  if (!startLat || !startLng) {
                    alert("Эхлээд замын байршлаа сонгоно уу");
                    return;
                  }

                  router.push({
                    pathname: "/ride/create/map",
                    params: {
                      startLat,
                      startLng,
                      ...(startLabel ? { startLabel } : {}),
                    },
                  });
                }}
              >
                <Text style={styles.createBtnText}>Очих байршлаа оруулах</Text>
              </TouchableOpacity>
              </Animated.View>
            </View>
            </Animated.View>
          </View>
        </ScrollView>
        <Modal
          transparent
          visible={activeTrustTip !== null}
          animationType="fade"
          onRequestClose={closeTrustTip}
        >
          <Pressable style={styles.trustHintBackdrop} onPress={closeTrustTip}>
            <Pressable style={styles.trustHintModalCard} onPress={() => {}}>
              <Text style={styles.trustHintTitle}>
                {trustLevelHints[(activeTrustTip ?? 1) - 1]?.title}
              </Text>
              <Text style={styles.trustHintText}>
                {trustLevelHints[(activeTrustTip ?? 1) - 1]?.text}
              </Text>
              <TouchableOpacity onPress={closeTrustTip}>
                <Text style={styles.trustHintClose}>Хаах</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <DriverRequestPopup
        visible={!!activeDriverRequest}
        requesterName={getNotificationRequesterName(activeDriverRequest)}
        title={activeDriverRequest?.title}
        body={activeDriverRequest?.body}
        busyAction={driverDecisionLoading}
        onApprove={() => activeDriverRequest && handleDriverDecision(activeDriverRequest, "approve")}
        onReject={() => activeDriverRequest && handleDriverDecision(activeDriverRequest, "reject")}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>

        <LinearGradient
          colors={[
            AppTheme.colors.accentDeep,
            AppTheme.colors.accent,
            "#72957f",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.headerRow}>
          <Text style={styles.greetingText}>Сайн уу, {user?.name}</Text>
          <View style={styles.iconTopRow}>
            <TouchableOpacity onPress={() => router.push("/history")}>
              <Image source={icons.time} style={styles.topIcon} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationWrap}
              onPress={() => router.push("/notifications")}
            >
              <Image source={icons.notification} style={styles.topIcon} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* AVATAR */}
  <View style={styles.avatarCenter}>
  <View style={styles.profileWrap}>
    <Image source={getAvatarSource()} style={styles.avatar} />
    <TouchableOpacity onPress={onPressShield} style={styles.shieldBtn} activeOpacity={0.8}>
      <Image
        source={trustLevel >= 4 ? icons.shieldActive : icons.shield}
        style={styles.shield}
      />
    </TouchableOpacity>
    {activeShieldTip && trustLevel < 4 && (
      <View style={styles.shieldHintCard}>
        <Text style={styles.shieldHintPlainText}>
          {shieldHintText}
        </Text>
        <TouchableOpacity onPress={() => setActiveShieldTip(false)}>
          <Text style={styles.trustHintClose}>Хаах</Text>
        </TouchableOpacity>
      </View>
    )}

    {/* OW COIN */}
   <TouchableOpacity
  style={styles.owWrap}
  onPress={() => router.push("/wallet")}
>
  <Text style={styles.owBalance}>
    {user?.balance ?? 0}
  </Text>

  <Image source={icons.coin} style={styles.owIcon} />
</TouchableOpacity>

  </View>
  
</View>


        {/* RATING */}
        <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <TouchableOpacity key={i} onPress={() => openTrustTip(i)}>
                  <Image
                    source={icons.starHalf}
                    style={[
                      styles.star,
                      {
                        tintColor:
                          i <= trustLevel ? "#FFC107" : "#D9D9D9",
                      },
                    ]}
                  />
                </TouchableOpacity>
          ))}
        </View>
        {bookedRideList.length > 0 && (
          <View style={styles.bookedWrap}>
            <Text style={styles.bookedTitle}>
              Таны сүүлийн захиалгууд ({bookedRideList.length})
            </Text>
            <View style={styles.bookedScrollCard}>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.bookedScrollContent}
              >
            {bookedRideList.map((ride: any) => {
              const rideId = Number(ride?.id);
              const bookingStatus =
                String(ride?.booking_status || bookingStatusByRide[rideId] || "").toLowerCase();
              const bookingStatusLabel =
                ride?.booking_status_label ||
                bookingStatusLabelByRide[rideId] ||
                getBookingStatusLabel(bookingStatus);

              return (
                <TouchableOpacity
                  key={String(ride.id)}
                  style={styles.bookedRideCard}
                  onPress={() =>
                    router.push({
                      pathname: "/ride/[id]",
                      params: { id: String(ride.id), role: "rider" },
                    })
                  }
                >
                  <Image
                    source={getRideAvatarSource(ride.avatar_id)}
                    style={styles.bookedAvatar}
                  />

                  <View style={styles.bookedInfo}>
                    {getRideOwnerName(ride) ? (
                      <Text style={styles.bookedName}>{getRideOwnerName(ride)}</Text>
                    ) : null}
                    <Text style={styles.bookedDate}>Огноо: {ride.ride_date || "-"}</Text>
                    <Text style={styles.bookedTime}>⏰ {ride.start_time || "-"}</Text>
                    <Text style={styles.bookedEnd} numberOfLines={1}>
                      📍 Очих газар: {ride.end_location || "Тодорхойгүй"}
                    </Text>
                    <Text style={styles.bookedPrice}>1 суудал: {ride.price ?? 0}₮</Text>
                    <Text
                      style={[
                        styles.bookedBadge,
                        { color: getBookingStatusColor(bookingStatus) },
                      ]}
                    >
                      {bookingStatusLabel}
                    </Text>
                  </View>

                  <Image
                    source={seatImages[getAvailableSeats(ride)] || seatImages[1]}
                    style={styles.bookedSeatImage}
                  />
                </TouchableOpacity>
              );
            })}
              </ScrollView>
            </View>
          </View>
        )}
        {bookedRideList.length === 0 && (
          <IllustratedEmptyState
            icon="event-seat"
            eyebrow="Booked Rides"
            title="Та одоогоор чиглэлд захиалга өгөөгүй байна"
            body="Тохирох чиглэл олдвол та шууд суудал захиалж, энэ хэсэгт цэгцтэй хянах боломжтой."
            tone="gold"
            compact
            style={styles.emptyStateCard}
          />
        )}

        {/* ACTIVE ROUTE */}
        {activeRide ? (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/ride/${activeRide.id}`)}
          >
            <View style={styles.cardHeader}>
              <Image source={icons.ways} style={styles.cardIcon} />
                <Text style={styles.cardTitle}>Таны аялалын зам</Text>
            </View>
            <View style={styles.activeContentRow}>
              <View style={styles.activeInfo}>
                {getRideOwnerName(activeRide) ? (
                  <Text style={styles.activeName}>{getRideOwnerName(activeRide)}</Text>
                ) : null}
                <Text style={styles.activeDate}>
                  Огноо: {activeRide.ride_date || "-"}
                </Text>
                <Text style={styles.activeTime}>⏰ {activeRide.start_time || "-"}</Text>
                <Text style={styles.activeEnd} numberOfLines={2}>
                  📍 Очих газар: {activeRide.end_location ?? activeRide.to_location ?? "Тодорхойгүй"}
                </Text>
                <Text style={styles.activePrice}>1 суудал: {activeRide.price ?? 0}₮</Text>
              </View>
              <Image
                source={seatImages[getAvailableSeats(activeRide)] || seatImages[1]}
                style={styles.activeSeatImage}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <IllustratedEmptyState
            icon="local-taxi"
            eyebrow="Driver Route"
            title="Танд үүсгэсэн аялал алга байна"
            body="Шинэ route үүсгээд, ойрхон зорчигчдыг цэгцтэй цуглуулах боломжоо нээгээрэй."
            tone="accent"
            compact
            style={styles.emptyStateCard}
          />
        )}

        <TouchableOpacity
          style={styles.pickupBtn}
          onPress={() =>
            router.push({
              pathname: "/location/map",
              params: { returnTo: "home" },
            })
          }
        >
          <View style={styles.ctaButtonRow}>
            <AppIconBadge name="pin-drop" theme="accent" />
            <Text style={styles.pickupText}>Шинээр чиглэл үүсгэх</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.createBtn,
            (!startLat || !startLng) && { backgroundColor: "#94a3b8" }
          ]}
          onPress={() => {
            if (!startLat || !startLng) {
              alert("Эхлээд замын байршлаа сонгоно уу");
              return;
            }

              router.push({
                pathname: "/ride/create/map",
                params: {
                  startLat,
                  startLng,
                  ...(startLabel ? { startLabel } : {}),
                },
              });
            }}
        >
          <View style={styles.ctaButtonRow}>
            <AppIconBadge name="route" theme="light" />
            <Text style={styles.createBtnText}>Очих байршилаа оруулна уу</Text>
          </View>
        </TouchableOpacity>

        </LinearGradient>
        </View>
      </ScrollView>
      <Modal
        transparent
        visible={activeTrustTip !== null}
        animationType="fade"
        onRequestClose={closeTrustTip}
      >
        <Pressable style={styles.trustHintBackdrop} onPress={closeTrustTip}>
          <Pressable style={styles.trustHintModalCard} onPress={() => {}}>
            <Text style={styles.trustHintTitle}>
              {trustLevelHints[(activeTrustTip ?? 1) - 1]?.title}
            </Text>
            <Text style={styles.trustHintText}>
              {trustLevelHints[(activeTrustTip ?? 1) - 1]?.text}
            </Text>
            <TouchableOpacity onPress={closeTrustTip}>
              <Text style={styles.trustHintClose}>Хаах</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export default HomeScreen;

/* AVATAR MAP */
const avatars = {
  grandfa: require("../../../assets/profile/avatars/grandfa.png"),
  father: require("../../../assets/profile/avatars/father.png"),
  guy: require("../../../assets/profile/avatars/guy.png"),
  child: require("../../../assets/profile/avatars/child.png"),
  grandma: require("../../../assets/profile/avatars/grandma.png"),
  mother: require("../../../assets/profile/avatars/mother.png"),
  women: require("../../../assets/profile/avatars/women.png"),
  sister: require("../../../assets/profile/avatars/sister.png"),
};

const seatImages: Record<number, any> = {
  1: require("../../../assets/cars/1seat.png"),
  2: require("../../../assets/cars/2seat.png"),
  3: require("../../../assets/cars/3seat.png"),
  4: require("../../../assets/cars/4seat.png"),
};

/* ICON MAP */
const icons = {
  profile: require("../../../assets/icons/profile.png"),
  shield: require("../../../assets/icons/UnActive.png"),
  shieldActive: require("../../../assets/icons/Active.png"),
  notification: require("../../../assets/icons/notiInactive.png"),
  coin: require("../../../assets/icons/kerdit.png"),
  starHalf: require("../../../assets/icons/star3.png"),
  time: require("../../../assets/icons/time.png"),
  ways: require("../../../assets/icons/ways.png"),
};

/* STYLES */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.canvas },
  scrollContent: { paddingBottom: 132 },
  container: { padding: 16 },

  premiumHero: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    ...AppTheme.shadow.floating,
  },
  heroCard: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    ...AppTheme.shadow.floating,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  premiumHeroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  premiumHeroTitleWrap: {
    flex: 1,
    paddingRight: 12,
  },
  premiumHeroEyebrow: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  premiumGreetingText: {
    fontSize: 28,
    fontWeight: "700",
    color: AppTheme.colors.white,
    marginBottom: 10,
  },
  premiumHeroSubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    lineHeight: 20,
  },
  premiumHeroActionRow: {
    flexDirection: "row",
  },
  iconTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  topIcon: {
    width: 20,
    height: 20,
    tintColor: AppTheme.colors.white,
  },
  premiumTopIcon: {
    width: 20,
    height: 20,
    tintColor: AppTheme.colors.white,
  },
  premiumTopIconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  notificationWrap: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.badge,
    borderWidth: 1,
    borderColor: AppTheme.colors.white,
  },
  badgeText: {
    color: AppTheme.colors.white,
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 11,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: "700",
    color: AppTheme.colors.white,
  },
  avatarCenter: {
    alignItems: "flex-start",
  },
  premiumHeroBody: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  premiumAvatarColumn: {
    width: 116,
    marginRight: 14,
  },
  profileWrap: {
    position: "relative",
    overflow: "visible",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.72)",
  },
  premiumProfileWrap: {
    position: "relative",
    overflow: "visible",
  },
  premiumAvatar: {
    width: 96,
    height: 96,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.72)",
  },
  shield: {
    position: "absolute",
    bottom: 0,
    right: -6,
    width: 48,
    height: 48,
  },
  shieldBtn: {
    position: "absolute",
    bottom: 0,
    right: -6,
    width: 48,
    height: 48,
    zIndex: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  premiumShield: {
    position: "absolute",
    bottom: 1,
    right: -4,
    width: 44,
    height: 44,
  },
  premiumShieldBtn: {
    position: "absolute",
    bottom: 1,
    right: -4,
    width: 44,
    height: 44,
    zIndex: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  shieldHintCard: {
    backgroundColor: AppTheme.colors.card,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: "flex-start",
    width: 220,
    ...AppTheme.shadow.card,
    zIndex: 10,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 12,
  },
  premiumRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: 12,
  },
  premiumHeroSide: {
    flex: 1,
    justifyContent: "flex-start",
  },
  premiumWalletCard: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  premiumWalletLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    marginBottom: 6,
  },
  premiumWalletValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  premiumCoinIcon: {
    width: 22,
    height: 22,
    marginRight: 8,
  },
  premiumWalletValue: {
    color: AppTheme.colors.white,
    fontSize: 28,
    fontWeight: "700",
  },
  premiumStatsRow: {
    display: "none",
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  premiumMiniStatCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  premiumMiniStatValue: {
    color: AppTheme.colors.white,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  premiumMiniStatLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
  },
  premiumPillRow: {
    display: "none",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  premiumInfoPill: {
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  premiumInfoPillText: {
    color: AppTheme.colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  trustHintCard: {
    backgroundColor: AppTheme.colors.card,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    ...AppTheme.shadow.card,
  },
  trustHintBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.22)",
    justifyContent: "flex-start",
    paddingTop: 220,
    paddingHorizontal: 16,
  },
  trustHintModalCard: {
    backgroundColor: AppTheme.colors.card,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...AppTheme.shadow.card,
  },
  trustHintTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: AppTheme.colors.text,
    marginBottom: 4,
  },
  premiumShieldHintCard: {
    backgroundColor: AppTheme.colors.card,
    borderColor: AppTheme.colors.border,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    width: 220,
    ...AppTheme.shadow.card,
  },
  premiumShieldHintText: {
    fontSize: 13,
    color: AppTheme.colors.text,
    lineHeight: 18,
    marginBottom: 6,
  },
  premiumHintClose: {
    color: AppTheme.colors.accentDeep,
    fontWeight: "700",
  },
  shieldHintPlainText: {
    fontSize: 14,
    fontWeight: "400",
    color: AppTheme.colors.text,
    marginBottom: 4,
  },
  trustHintText: {
    fontSize: 13,
    color: AppTheme.colors.textMuted,
    marginBottom: 6,
  },
  trustHintClose: {
    color: AppTheme.colors.accentDeep,
    fontWeight: "700",
  },
  star: {
    width: 22,
    height: 22,
  },
  premiumStar: {
    width: 20,
    height: 20,
  },
  card: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  premiumActiveCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  cardIcon: {
    width: 22,
    height: 22,
    marginRight: 6,
    tintColor: AppTheme.colors.accent,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AppTheme.colors.text,
  },
  activeContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeInfo: {
    flex: 1,
    paddingRight: 12,
  },
  activeName: {
    fontSize: 15,
    fontWeight: "700",
    color: AppTheme.colors.text,
    marginBottom: 4,
  },
  activeDate: {
    fontSize: 12,
    color: AppTheme.colors.textMuted,
  },
  activeTime: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: AppTheme.colors.text,
  },
  activeEnd: {
    marginTop: 6,
    fontSize: 13,
    color: AppTheme.colors.textMuted,
    lineHeight: 18,
  },
  activePrice: {
    marginTop: 8,
    fontSize: 13,
    color: AppTheme.colors.text,
    fontWeight: "700",
  },
  activeSeatImage: {
    width: 74,
    height: 84,
    resizeMode: "contain",
  },
  premiumSeatCard: {
    width: 96,
    minHeight: 112,
    borderRadius: 20,
    backgroundColor: AppTheme.colors.cardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  owIcon: {
    width: 22,
    height: 22,
    marginRight: 6,
  },
  owWrap: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  owLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },
  owBalance: {
    color: AppTheme.colors.white,
    fontWeight: "700",
    fontSize: 28,
  },
  premiumCreateBtn: {
    alignSelf: "stretch",
    backgroundColor: AppTheme.colors.accent,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
    ...AppTheme.shadow.card,
  },
  premiumCreateBtnDisabled: {
    backgroundColor: "#93a69a",
  },
  createBtn: {
    alignSelf: "stretch",
    backgroundColor: AppTheme.colors.accent,
    paddingVertical: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 12,
  },
  createBtnText: {
    color: AppTheme.colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  ctaButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  premiumPickupBtn: {
    backgroundColor: AppTheme.colors.cardSoft,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  pickupBtn: {
    backgroundColor: AppTheme.colors.cardSoft,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
  },
  pickupText: {
    color: AppTheme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  premiumPickupSubtext: {
    color: AppTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  bookedWrap: {
    marginBottom: 18,
  },
  premiumSectionCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    ...AppTheme.shadow.card,
  },
  premiumSectionEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: AppTheme.colors.accent,
    marginBottom: 8,
  },
  premiumSectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: AppTheme.colors.text,
    marginBottom: 6,
  },
  premiumSectionText: {
    fontSize: 13,
    lineHeight: 19,
    color: AppTheme.colors.textMuted,
    marginBottom: 14,
  },
  premiumBookedScrollCard: {
    maxHeight: 264,
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 8,
  },
  bookedScrollCard: {
    maxHeight: 220,
    backgroundColor: AppTheme.colors.cardSoft,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: 8,
  },
  bookedScrollContent: {
    paddingBottom: 2,
  },
  bookedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppTheme.colors.text,
    marginBottom: 6,
  },
  premiumBookedRideCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  bookedRideCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppTheme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  bookedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 10,
  },
  bookedInfo: {
    flex: 1,
  },
  bookedName: {
    fontSize: 13,
    fontWeight: "700",
    color: AppTheme.colors.text,
    marginBottom: 2,
  },
  bookedDate: {
    fontSize: 11,
    color: AppTheme.colors.textMuted,
  },
  bookedTime: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: "600",
    color: AppTheme.colors.text,
  },
  bookedEnd: {
    marginTop: 4,
    fontSize: 12,
    color: AppTheme.colors.textMuted,
  },
  bookedPrice: {
    marginTop: 4,
    fontSize: 12,
    color: AppTheme.colors.text,
  },
  bookedBadge: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.accentDeep,
  },
  bookedSeatImage: {
    width: 62,
    height: 62,
    resizeMode: "contain",
    marginLeft: 8,
  },
  premiumEmptyStateCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 18,
    ...AppTheme.shadow.card,
  },
  premiumEmptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AppTheme.colors.text,
    marginBottom: 6,
  },
  premiumEmptyStateText: {
    fontSize: 14,
    color: AppTheme.colors.textMuted,
    fontWeight: "500",
    lineHeight: 20,
  },
  emptyStateCard: {
    backgroundColor: AppTheme.colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  emptyStateText: {
    fontSize: 14,
    color: AppTheme.colors.textMuted,
    fontWeight: "600",
  },
});
