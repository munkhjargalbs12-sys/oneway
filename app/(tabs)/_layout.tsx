import { Tabs } from "expo-router";
import { Image } from "react-native";

function TabIcon({ focused, active, inactive }: any) {
  return (
    <Image
      source={focused ? active : inactive}
      style={{
        width: focused ? 28 : 22,
        height: focused ? 28 : 22,
      }}
      resizeMode="contain"
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarShowLabel: false }}>

      {/* 🏠 HOME */}
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

      {/* 🧭 RIDES */}
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

    

      {/* 👤 PROFILE */}
      <Tabs.Screen
        name="profile/index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              active={require("../../assets/icons/ProfileActive.png")}
              inactive={require("../../assets/icons/ProfileInactive.png")}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="history/index"
        options={{
          href: null,
        }}
      />

    </Tabs>
  );
}
