import { getToken } from "@/services/authStorage";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const API_URL = "http://192.168.1.78:3000";

function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [activeRide, setActiveRide] = useState<any>(null);

  useEffect(() => {
    const loadHome = async () => {
      const token = await getToken();
      if (!token) return;

      try {
        const userRes = await fetch(`${API_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userData = await userRes.json();
        setUser(userData);

        const rideRes = await fetch(`${API_URL}/rides/active`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rideData = await rideRes.json();
        setActiveRide(rideData);
      } catch (err) {
        console.log("Home load error", err);
      }
    };

    loadHome();
  }, []);

  const getAvatarSource = () => {
    if (!user?.avatar_id) return icons.profile;
    return avatars[user.avatar_id as keyof typeof avatars] || icons.profile;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* 🔔 TOP RIGHT ICONS */}
        <View style={styles.iconTopRow}>
          <TouchableOpacity onPress={() => router.push("/notifications")}>
            <Image source={icons.notification} style={styles.topIcon} />
          </TouchableOpacity>

          
        </View>

        {/* 👋 GREETING */}
        <View style={styles.greetingWrap}>
          <Text style={styles.greetingText}>
            Сайн уу, {user?.name} 
          </Text>
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



        {/* 🚗 ACTIVE ROUTE */}
        {activeRide ? (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/ride/${activeRide.id}`)}
          >
            <View style={styles.cardHeader}>
              <Image source={icons.ways} style={styles.cardIcon} />
              <Text style={styles.cardTitle}>Идэвхтэй чиглэл</Text>
            </View>

            <View style={styles.routeRow}>
              <Text style={styles.from}>
                {activeRide.start_lat}, {activeRide.start_lng}
              </Text>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.to}>{activeRide.to_location}</Text>
            </View>

            <View style={styles.timeRow}>
              <Image source={icons.time} style={styles.timeIcon} />
              <Text style={styles.timeText}>
                {activeRide.ride_date} · {activeRide.start_time}
              </Text>
            </View>
          </TouchableOpacity>
        ) : null}

      </View>
    </SafeAreaView>
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

/* 📦 ICON MAP */
const icons = {
  profile: require("../../../assets/icons/profile.png"),
  shield: require("../../../assets/icons/UnActive.png"),
  notification: require("../../../assets/icons/notfication.png"),
  coin: require("../../../assets/icons/kerdit.png"),
  starHalf: require("../../../assets/icons/star3.png"),
  time: require("../../../assets/icons/time.png"),
  ways: require("../../../assets/icons/ways.png"),
};

/* 🎨 STYLES */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F4F6F5" },
  container: { flex: 1, padding: 16 },

  iconTopRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 16,
  },

  topIcon: {
    width: 30,
    height: 30,
    marginLeft: 16,
  },

  greetingWrap: {
    marginBottom: 16,
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
    width: 130,
    height: 130,
    borderRadius: 50,
  },

  shield: {
    position: "absolute",
    bottom: -20,
    right: -20,
    width: 70,
    height: 70,
  },

  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    marginBottom: 20,
  },

  star: {
    width: 30,
    height: 30,
   
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

});
