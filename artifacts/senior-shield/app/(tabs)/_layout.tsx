import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { userApi } from "@/services/api";

const TAB_BG = "#06102E";
const TAB_ACTIVE = "#FFFFFF";
const TAB_INACTIVE = "#6B8CC7";

const TAB_LABEL_STYLE = {
  fontFamily: "Inter_500Medium",
  fontSize: 11,
  lineHeight: 14,
  textAlign: "center" as const,
};

function TabLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text style={[TAB_LABEL_STYLE, { color }]}>
      {label}
    </Text>
  );
}

function PremiumTabIcon({
  name,
  color,
  size,
  showBadge,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  showBadge: boolean;
}) {
  return (
    <View>
      <Ionicons name={name} size={size} color={color} />
      {showBadge && (
        <View style={badgeStyles.dot}>
          <Ionicons name="star" size={7} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  dot: {
    position: "absolute",
    top: -2,
    right: -6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await userApi.getFeatureUsage(user?.token);
        setIsPremium(!!data.isPremium);
      } catch {}
    })();
  }, [user?.token]);

  const showBadge = !isPremium;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : TAB_BG,
          borderTopWidth: 0,
          elevation: 0,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 6,
          height: 76 + (insets.bottom > 0 ? insets.bottom : 8),
        },
        tabBarBackground: () => (
          isIOS ? (
            <BlurView
              intensity={95}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: TAB_BG }]} />
          )
        ),
        tabBarLabelStyle: TAB_LABEL_STYLE,
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarLabel: ({ color }) => <TabLabel label="Home" color={color} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="scam"
        options={{
          title: "Scam Analyzer",
          tabBarLabel: ({ color }) => (
            <Text style={[TAB_LABEL_STYLE, { color }]}>
              Scam{"\n"}Analyzer
            </Text>
          ),
          tabBarIcon: ({ color, size }) => (
            <PremiumTabIcon name="shield-checkmark" color={color} size={size} showBadge={showBadge} />
          ),
        }}
      />
      <Tabs.Screen
        name="reminders"
        options={{
          title: "Reminders",
          tabBarLabel: ({ color }) => <TabLabel label="Reminders" color={color} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: "Family",
          tabBarLabel: ({ color }) => <TabLabel label="Family" color={color} />,
          tabBarIcon: ({ color, size }) => (
            <PremiumTabIcon name="people" color={color} size={size} showBadge={showBadge} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarLabel: ({ color }) => <TabLabel label="History" color={color} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarLabel: ({ color }) => <TabLabel label="Settings" color={color} />,
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
