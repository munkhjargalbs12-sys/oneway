import { getToken } from "@/services/authStorage";
import { apiFetch } from "@/services/apiClient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

function extractBookedRideIds(payload: any): number[] {
  const raw =
    (Array.isArray(payload?.ride_ids) && payload.ride_ids) ||
    (Array.isArray(payload?.bookings) && payload.bookings) ||
    (Array.isArray(payload?.items) && payload.items) ||
    (Array.isArray(payload) && payload) ||
    [];

  const ids = raw
    .map((entry: any) => Number(entry?.ride_id ?? entry?.ride?.id ?? entry?.id ?? entry))
    .filter((id: number) => Number.isFinite(id));

  return Array.from(new Set(ids));
}

function extractRideList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rides)) return payload.rides;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  return [];
}

function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);
  const [bookedRides, setBookedRides] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const params = useLocalSearchParams<{
  startLat?: string;
  startLng?: string;
}>();

const startLat = params.startLat;
const startLng = params.startLng;

  const loadHome = useCallback(async () => {
      const token = await getToken();
      if (!token) {
        setUser(null);
        setActiveRide(null);
        setBookedRides([]);
        setUnreadCount(0);
        return;
      }

      try {
        const [userData, rideData, myBookings, allRidesRaw, myRidesRaw, notifications] = await Promise.all([
          apiFetch("/users/me"),
          apiFetch("/rides/active"),
          apiFetch("/bookings/mine").catch(() => ({ ride_ids: [] })),
          apiFetch("/rides").catch(() => []),
          apiFetch("/rides/mine").catch(() => []),
          apiFetch("/notifications").catch(() => []),
        ]);
        setUser(userData);
        const allRides = extractRideList(allRidesRaw);
        const myRides = extractRideList(myRidesRaw);

        const bookedIds = extractBookedRideIds(myBookings);

        const matched = Array.isArray(allRides)
          ? allRides.filter((r: any) => bookedIds.includes(Number(r?.id)))
          : [];

        setBookedRides(matched);

        const enrichedActiveRide =
          Array.isArray(allRides) && rideData?.id
            ? allRides.find((r: any) => Number(r?.id) === Number(rideData.id)) || rideData
            : rideData;

        const hiddenStatuses = new Set(["completed", "cancelled", "canceled"]);
        const pickLatestRide = (list: any[]) =>
          list
            .filter((r: any) => {
              const s = String(r?.status || "").toLowerCase();
              // Keep rides unless explicitly finished/cancelled.
              return !s || !hiddenStatuses.has(s);
            })
            .sort((a: any, b: any) => Number(b?.id || 0) - Number(a?.id || 0))[0] || null;

        const mineList = Array.isArray(myRides) ? myRides : [];
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

        setActiveRide(enrichedActiveRide?.id ? enrichedActiveRide : mineFallback);

        const unread = Array.isArray(notifications)
          ? notifications.filter((n: any) => !n?.is_read).length
          : 0;
        setUnreadCount(unread);
      } catch (err) {
        console.log("Home load error", err);
      }
    }, []);

  useEffect(() => {
    loadHome();
  }, [loadHome]);

  useFocusEffect(
    useCallback(() => {
      loadHome();
    }, [loadHome])
  );

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

  return (
    <View style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>

        {/* 👋 HEADER */}
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

        {/* 👤 AVATAR */}
        <View style={styles.avatarCenter}>
  <View style={styles.profileWrap}>
    <Image source={getAvatarSource()} style={styles.avatar} />
    <Image source={icons.shield} style={styles.shield} />

    {/* 💰 OW COIN */}
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


        {/* ⭐ RATING */}
        <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Image
                  key={i}
                  source={icons.starHalf}
                  style={[
                  styles.star,
                {
                  tintColor:
                  i <= (user?.rating ?? 3) ? "#FFC107" : "#D9D9D9",
                },
              ]}
           />
          ))}
        </View>

        {bookedRides.length > 0 && (
          <View style={styles.bookedWrap}>
            <Text style={styles.bookedTitle}>
              Таны үүсгэсэн суудал ({bookedRides.length})
            </Text>
            <View style={styles.bookedScrollCard}>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.bookedScrollContent}
              >
            {bookedRides.map((ride) => (
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
                  <Text style={styles.bookedPrice}>Суудал: {ride.price ?? 0}₮</Text>
                  <Text style={styles.bookedBadge}>✓ Суудал захиалсан</Text>
                  <Text style={styles.bookedPending}>⏳ Жолоочийн зөвшөөрөл хүлээгдэж байна</Text>
                </View>

                <Image
                  source={seatImages[getAvailableSeats(ride)] || seatImages[1]}
                  style={styles.bookedSeatImage}
                />
              </TouchableOpacity>
            ))}
              </ScrollView>
            </View>
          </View>
        )}
        {bookedRides.length === 0 && (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateText}>Та суудал захиалаагүй байна.</Text>
          </View>
        )}

        {/* 🚗 ACTIVE ROUTE */}
        {activeRide ? (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/ride/${activeRide.id}`)}
          >
            <View style={styles.cardHeader}>
              <Image source={icons.ways} style={styles.cardIcon} />
              <Text style={styles.cardTitle}>Таны үүсгэсэн чиглэл</Text>
            </View>
            <View style={styles.activeContentRow}>
              <View style={styles.activeInfo}>
                {getRideOwnerName(activeRide) ? (
                  <Text style={styles.activeName}>{getRideOwnerName(activeRide)}</Text>
                ) : null}
                <Text style={styles.activeDate}>
                  Огноо: 📅 {activeRide.ride_date || "-"}
                </Text>
                <Text style={styles.activeTime}>⏰ {activeRide.start_time || "-"}</Text>
                <Text style={styles.activeEnd} numberOfLines={2}>
                  📍 Очих газар: {activeRide.end_location ?? activeRide.to_location ?? "Тодорхойгүй"}
                </Text>
                <Text style={styles.activePrice}>Суудал: {activeRide.price ?? 0}₮</Text>
              </View>
              <Image
                source={seatImages[getAvailableSeats(activeRide)] || seatImages[1]}
                style={styles.activeSeatImage}
              />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.emptyStateCard}>
            <Text style={styles.emptyStateText}>Та чиглэл үүсгээгүй байна.</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.pickupBtn}
          onPress={() => router.push("/location")}
        >
          <Text style={styles.pickupText}>
            📍 Та хаанаас явах вэ?
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.createBtn,
            (!startLat || !startLng) && { backgroundColor: "#94a3b8" }
          ]}
          onPress={() => {
            if (!startLat || !startLng) {
              alert("Эхлээд явах байршлаа сонгоно уу");
              return;
            }

            router.push({
              pathname: "/ride/create/map",
              params: {
                startLat,
                startLng,
              },
            });
          }}
        >
          <Text style={styles.createBtnText}>
            очих байршил
          </Text>
        </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

export default HomeScreen;

/* 🧑 AVATAR MAP */
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

/* 📦 ICON MAP */
const icons = {
  profile: require("../../../assets/icons/profile.png"),
  shield: require("../../../assets/icons/UnActive.png"),
  notification: require("../../../assets/icons/notiInactive.png"),
  coin: require("../../../assets/icons/kerdit.png"),
  starHalf: require("../../../assets/icons/star3.png"),
  time: require("../../../assets/icons/time.png"),
  ways: require("../../../assets/icons/ways.png"),
};

/* 🎨 STYLES */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6F5" },
  scrollContent: { paddingBottom: 120 },
  container: { padding: 16 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  iconTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  topIcon: {
    width: 30,
    height: 30,
    marginLeft: 16,
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
    backgroundColor: "#ef4444",
    borderWidth: 1,
    borderColor: "#ffffff",
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 11,
  },

  greetingText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111",
  },

  avatarCenter: {
    alignItems: "flex-start",
    marginBottom: 16,
  },

  profileWrap: {
    position: "relative",
  },

  avatar: {
    width: 105,
    height: 105,
    borderRadius: 40,
  },

  shield: {
    position: "absolute",
    bottom: -14,
    right: -14,
    width: 56,
    height: 56,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 12,
  },

  star: {
    width: 22,
    height: 22,
   
  },

  ratingText: {
    fontSize: 18,
    fontWeight: "600",
  
   
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    elevation: 3,
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
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    flexWrap: "wrap",
  },

  from: { color: "#4CAF8C", fontWeight: "600" },
  to: { color: "#111", fontWeight: "600" },
  arrow: { marginHorizontal: 6, color: "#4CAF8C" },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },

  timeIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
  },

  timeText: {
    color: "#555",
  },
  activeContentRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeInfo: {
    flex: 1,
  },
  activeName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  activeDate: {
    fontSize: 12,
    color: "#64748b",
  },
  activeTime: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  activeEnd: {
    marginTop: 4,
    fontSize: 12,
    color: "#334155",
  },
  activePrice: {
    marginTop: 4,
    fontSize: 12,
    color: "#0f172a",
    fontWeight: "600",
  },
  activeSeatImage: {
    width: 74,
    height: 84,
    resizeMode: "contain",
    marginLeft: 8,
  },
  owWrap: {
  position: "absolute",
  top: 70,
  left: 300,
  backgroundColor: "#fcf6f6",
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 10,
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 0.5,
  borderColor: "#4CAF8C",
  transform: [{ scale: 1.4 }],
},

owIcon: {
  width: 22,
  height: 22,
  marginRight: 6,
},

owLabel: {
  fontSize: 10,
  color: "#aaa",
},

owBalance: {
  color: "#4CAF8C",
  fontWeight: "700",
  fontSize: 24,
},
createBtn: {
  alignSelf: "stretch",
  backgroundColor: "#2563eb",
  paddingVertical: 18,
  borderRadius: 16,
  alignItems: "center",
  marginBottom: 12,
  elevation: 6,          // Android shadow
  shadowColor: "#000",   // iOS shadow
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 6,
},

createBtnText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "700",
},
pickupBtn: {
  backgroundColor: "#4CAF8C",
  paddingVertical: 16,
  borderRadius: 16,
  alignItems: "center",
  marginBottom: 20,
},

pickupText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "700",
},
bookedWrap: {
  marginBottom: 12,
},
bookedScrollCard: {
  maxHeight: 220,
  backgroundColor: "#ffffff",
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#e2e8f0",
  padding: 8,
},
bookedScrollContent: {
  paddingBottom: 2,
},
bookedTitle: {
  fontSize: 14,
  fontWeight: "700",
  color: "#334155",
  marginBottom: 8,
},
bookedRideCard: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#ffffff",
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#e2e8f0",
  paddingHorizontal: 10,
  paddingVertical: 10,
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
  color: "#0f172a",
  marginBottom: 2,
},
bookedDate: {
  fontSize: 11,
  color: "#64748b",
},
bookedTime: {
  marginTop: 2,
  fontSize: 13,
  fontWeight: "600",
},
bookedEnd: {
  marginTop: 4,
  fontSize: 12,
  color: "#334155",
},
bookedPrice: {
  marginTop: 3,
  fontSize: 12,
  color: "#0f172a",
},
bookedBadge: {
  marginTop: 4,
  fontSize: 12,
  fontWeight: "700",
  color: "#16a34a",
},
bookedPending: {
  marginTop: 2,
  fontSize: 11,
  color: "#64748b",
},
bookedSeatImage: {
  width: 62,
  height: 62,
  resizeMode: "contain",
  marginLeft: 8,
},
emptyStateCard: {
  backgroundColor: "#ffffff",
  borderRadius: 14,
  borderWidth: 1,
  borderColor: "#e2e8f0",
  paddingVertical: 14,
  paddingHorizontal: 12,
  marginBottom: 12,
},
emptyStateText: {
  fontSize: 14,
  color: "#334155",
  fontWeight: "600",
},
bookedMain: {
  fontSize: 14,
  fontWeight: "600",
  color: "#0f172a",
},
bookedMeta: {
  marginTop: 2,
  fontSize: 12,
  color: "#64748b",
},
});
