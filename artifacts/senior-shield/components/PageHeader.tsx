import React from "react";
import { View, Text, StyleSheet, Platform, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreferences } from "@/context/PreferencesContext";

interface PageHeaderProps {
  showTagline?: boolean;
  greeting?: string; // e.g. "Good morning, Margaret"
}

const GRADIENT: [string, string, string] = ["#06102E", "#0E2D6B", "#0B5FAA"];
const H_PAD = 18;
const H_PAD_LEFT = 11; // 7 px less than H_PAD to shift logo+text left

export default function PageHeader({ showTagline = false, greeting }: PageHeaderProps) {
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();

  // Safe-area top + platform offset
  const topOffset = insets.top + (Platform.OS === "web" ? 67 : 12);
  // Raised 6 px more than before (was +11, now +5)
  const badgeTop = topOffset + 5;

  return (
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrapper, { paddingTop: topOffset }]}
    >
      {/* Logo + brand column — full remaining width, no badge competing */}
      <View style={styles.row}>
        <Image
          source={require("../assets/images/logo-shield.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Brand column shifted 3 px left via reduced gap */}
        <View style={styles.brandCol}>
          <Text
            style={[styles.appName, { fontSize: ts.h1, paddingRight: 90 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            SeniorShield
          </Text>
          {showTagline && (
            <Text
              style={[styles.tagline, { fontSize: ts.xs }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              Your voice assistant for tech help and scam protection
            </Text>
          )}
          {!!greeting && (
            <Text
              style={[styles.greeting, { fontSize: ts.sm }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {greeting}
            </Text>
          )}
        </View>
      </View>

      {/* Protected — absolutely positioned top-right, raised 5 px */}
      <View style={[styles.badge, { top: badgeTop, right: H_PAD }]}>
        <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
        <Text style={[styles.badgeText, { fontSize: ts.xs }]}>Protected</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingLeft: H_PAD_LEFT,
    paddingRight: H_PAD,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 74,
    height: 74,
    flexShrink: 0,
    marginLeft: -5,
  },
  brandCol: {
    flex: 1,
    gap: 2,
    marginLeft: -14,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
    lineHeight: 16,
  },
  greeting: {
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.95)",
    lineHeight: 20,
  },
  badge: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
