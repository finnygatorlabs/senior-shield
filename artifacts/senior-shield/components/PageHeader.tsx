import React from "react";
import { View, Text, StyleSheet, Platform, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreferences } from "@/context/PreferencesContext";

interface PageHeaderProps {
  showTagline?: boolean;
  greeting?: string;
}

const GRADIENT: [string, string, string] = ["#06102E", "#0E2D6B", "#0B5FAA"];

export default function PageHeader({ showTagline = false, greeting }: PageHeaderProps) {
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();

  const topPad = insets.top + (Platform.OS === "web" ? 52 : 0);

  return (
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrapper, { paddingTop: topPad + 12 }]}
    >
      {/* Top row: logo + brand + badge — evenly spaced */}
      <View style={styles.topRow}>
        <Image
          source={require("../assets/images/logo-shield.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.brandCol}>
          <Text
            style={[styles.appName, { fontSize: ts.h1 }]}
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
        </View>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
          <Text style={[styles.badgeText, { fontSize: ts.xs }]}>Protected</Text>
        </View>
      </View>

      {/* Greeting row — full width, breathing room */}
      {!!greeting && (
        <View style={styles.greetingRow}>
          <Text
            style={[styles.greeting, { fontSize: ts.md }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {greeting}
          </Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 52,
    height: 52,
    flexShrink: 0,
  },
  brandCol: {
    flex: 1,
    gap: 1,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    lineHeight: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16,185,129,0.25)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.5)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  greetingRow: {
    marginTop: 10,
    paddingLeft: 64,
  },
  greeting: {
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.95)",
    lineHeight: 24,
  },
});
