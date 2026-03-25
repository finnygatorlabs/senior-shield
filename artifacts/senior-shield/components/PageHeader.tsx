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

function DecoCircle({ size, top, left, right, opacity }: { size: number; top?: number; left?: number; right?: number; opacity: number }) {
  return (
    <View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: `rgba(255,255,255,${opacity})`,
        top,
        left,
        right,
      }}
    />
  );
}

function DecoLine({ width, top, left, rotate, opacity }: { width: number; top: number; left: number; rotate: string; opacity: number }) {
  return (
    <View
      style={{
        position: "absolute",
        width,
        height: 1,
        backgroundColor: `rgba(255,255,255,${opacity})`,
        top,
        left,
        transform: [{ rotate }],
      }}
    />
  );
}

export default function PageHeader({ showTagline = false, greeting }: PageHeaderProps) {
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();

  const topPad = insets.top + (Platform.OS === "web" ? 52 : 0);

  return (
    <LinearGradient
      colors={GRADIENT}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrapper, { paddingTop: topPad + 8 }]}
    >
      {/* Abstract decorative elements — more visible */}
      <DecoCircle size={180} top={-50} right={-60} opacity={0.12} />
      <DecoCircle size={100} top={5} right={20} opacity={0.08} />
      <DecoCircle size={220} top={-90} left={-110} opacity={0.08} />
      <DecoCircle size={60} top={40} right={80} opacity={0.06} />
      <DecoLine width={200} top={15} left={-50} rotate="-22deg" opacity={0.1} />
      <DecoLine width={140} top={60} left={200} rotate="18deg" opacity={0.08} />
      <DecoLine width={100} top={90} left={30} rotate="-10deg" opacity={0.06} />
      <View style={styles.decoDotsRow}>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={styles.decoDot} />
        ))}
      </View>

      {/* Badge above the brand row */}
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={12} color="#34D399" />
          <Text style={[styles.badgeText, { fontSize: ts.xs }]}>Protected</Text>
        </View>
      </View>

      {/* Top row: logo + brand name */}
      <View style={styles.topRow}>
        <Image
          source={require("../assets/images/logo-shield.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.brandCol}>
          <Text
            style={styles.appName}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            SeniorShield{"\u2122"}
          </Text>
        </View>
      </View>

      {/* Tagline */}
      {showTagline && (
        <Text
          style={[styles.tagline, { marginTop: 2, paddingLeft: 74 }]}
          numberOfLines={1}
        >
          Your voice assistant for tech help & scam protection
        </Text>
      )}

      {/* Greeting row */}
      {!!greeting && (
        <View style={[styles.greetingRow, { marginTop: showTagline ? 6 : 10 }]}>
          <View style={styles.greetingDivider} />
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
    paddingBottom: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 62,
    height: 62,
    flexShrink: 0,
  },
  brandCol: {
    flex: 1,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
    fontSize: 28,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    lineHeight: 16,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16,185,129,0.2)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.4)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 74,
    gap: 0,
  },
  greetingDivider: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: "rgba(96,165,250,0.6)",
    marginRight: 8,
  },
  greeting: {
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.95)",
    lineHeight: 24,
  },
  decoDotsRow: {
    position: "absolute",
    bottom: 8,
    right: 16,
    flexDirection: "row",
    gap: 5,
  },
  decoDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
});
