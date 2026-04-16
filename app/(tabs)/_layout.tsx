import HeaderBackButton from "@/components/HeaderBackButton";
import { AppFontFamily, AppTheme } from "@/constants/theme";
import { apiFetch } from "@/services/apiClient";
import { getToken } from "@/services/authStorage";
import { subscribeProfileBadge } from "@/services/profileBadge";
import { Tabs, usePathname } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

function TabIcon({ focused, active, inactive, badgeCount = 0 }: any) {
  return (
    <View
      style={[
        styles.tabIconWrap,
        focused && styles.tabIconWrapFocused,
      ]}
    >
      <Image
        source={focused ? active : inactive}
        style={[
          styles.tabIcon,
          focused && styles.tabIconFocused,
        ]}
        resizeMode="contain"
      />
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 9 ? "9+" : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const pathname = usePathname();
  const [profileBadgeCount, setProfileBadgeCount] = useState(0);

  const loadProfileBadgeCount = useCallback(async () => {
    const token = await getToken();

    if (!token) {
      setProfileBadgeCount(0);
      return;
    }

    try {
      const me = await apiFetch("/users/me");
      let pendingCount = 0;

      if (!me?.email_verified) pendingCount += 1;
      if (!me?.phone_verified) pendingCount += 1;
      if (!me?.payment_linked) pendingCount += 1;

      if (me?.role === "driver") {
        if (!me?.vehicle_verified) pendingCount += 1;
        if (!me?.driver_verified) pendingCount += 1;
      }

      setProfileBadgeCount(pendingCount);
    } catch (err) {
      console.log("Failed to load profile badge count", err);
      setProfileBadgeCount(0);
    }
  }, []);

  useEffect(() => {
    loadProfileBadgeCount();
  }, [loadProfileBadgeCount, pathname]);

  useEffect(() => {
    return subscribeProfileBadge(() => {
      loadProfileBadgeCount();
    });
  }, [loadProfileBadgeCount]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: AppTheme.colors.canvas },
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              active={require("../../assets/icons/HomeActive.png")}
              inactive={require("../../assets/icons/HomeInactive.png")}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="rides/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              active={require("../../assets/icons/WaysActive.png")}
              inactive={require("../../assets/icons/WaysInactive.png")}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              active={require("../../assets/icons/ProfileActive.png")}
              inactive={require("../../assets/icons/ProfileInactive.png")}
              badgeCount={profileBadgeCount}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications/index"
        options={{
          href: null,
          headerShown: true,
          title: "Мэдэгдэл",
          headerTintColor: AppTheme.colors.text,
          headerStyle: { backgroundColor: AppTheme.colors.card },
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontFamily: AppFontFamily,
            fontSize: 17,
            fontWeight: "700",
            color: AppTheme.colors.text,
          },
          headerLeft: ({ tintColor }) => (
            <HeaderBackButton tintColor={tintColor} fallbackPath="/home" />
          ),
        }}
      />
      <Tabs.Screen
        name="history/index"
        options={{
          href: null,
          headerShown: true,
          title: "Түүх",
          headerTintColor: AppTheme.colors.text,
          headerStyle: { backgroundColor: AppTheme.colors.card },
          headerShadowVisible: false,
          headerTitleAlign: "center",
          headerTitleStyle: {
            fontFamily: AppFontFamily,
            fontSize: 17,
            fontWeight: "700",
            color: AppTheme.colors.text,
          },
          headerLeft: ({ tintColor }) => (
            <HeaderBackButton tintColor={tintColor} fallbackPath="/home" />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
    height: 72,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 0,
    borderRadius: 28,
    backgroundColor: AppTheme.colors.tabBar,
    ...AppTheme.shadow.floating,
  },
  tabBarItem: {
    marginHorizontal: 6,
  },
  tabIconWrap: {
    position: "relative",
    width: 52,
    height: 44,
    borderRadius: AppTheme.radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrapFocused: {
    backgroundColor: AppTheme.colors.accentSoft,
  },
  tabIcon: {
    width: 22,
    height: 22,
  },
  tabIconFocused: {
    width: 28,
    height: 28,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
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
});
