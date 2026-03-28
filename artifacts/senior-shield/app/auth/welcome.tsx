import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
  Image,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

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

function DecoLine({ width: w, top, left, rotate, opacity }: { width: number; top: number; left: number; rotate: string; opacity: number }) {
  return (
    <View
      style={{
        position: "absolute",
        width: w,
        height: 1,
        backgroundColor: `rgba(255,255,255,${opacity})`,
        top,
        left,
        transform: [{ rotate }],
      }}
    />
  );
}

const FEATURES = [
  { icon: "mic" as const, text: "Voice-Guided Tech Help", desc: "Plain-language answers to any question" },
  { icon: "shield-checkmark" as const, text: "Real-Time Scam Detection", desc: "Instant risk analysis on any message" },
  { icon: "people" as const, text: "Family Alert System", desc: "Loved ones get notified of threats" },
  { icon: "warning" as const, text: "Emergency SOS", desc: "One-tap 911 and family alerts" },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={GRADIENT}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <DecoCircle size={260} top={-80} right={-100} opacity={0.08} />
      <DecoCircle size={140} top={30} right={30} opacity={0.06} />
      <DecoCircle size={300} top={-120} left={-150} opacity={0.06} />
      <DecoCircle size={80} top={160} right={100} opacity={0.05} />
      <DecoCircle size={180} top={400} left={-90} opacity={0.04} />
      <DecoCircle size={100} top={550} right={-30} opacity={0.05} />
      <DecoLine width={250} top={40} left={-60} rotate="-18deg" opacity={0.08} />
      <DecoLine width={180} top={120} left={width - 100} rotate="22deg" opacity={0.06} />
      <DecoLine width={140} top={200} left={20} rotate="-12deg" opacity={0.05} />
      <DecoLine width={200} top={480} left={width - 140} rotate="-25deg" opacity={0.04} />

      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.logoSection}>
          <Image
            source={require("../../assets/images/logo-shield.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>SeniorShield{"\u2122"}</Text>
          <Text style={styles.tagline}>Your voice assistant for tech help{"\n"}& scam protection</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((item, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={item.icon} size={19} color="#FFFFFF" />
              </View>
              <View style={styles.featureTextCol}>
                <Text style={styles.featureTitle}>{item.text}</Text>
                <Text style={styles.featureDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.verifiedSection}>
          <View style={styles.verifiedDivider} />
          <View style={styles.verifiedInner}>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={15} color="#34D399" />
              <Text style={styles.verifiedLabel}>VERIFIED ACCURACY</Text>
            </View>
            <Text style={styles.verifiedStat}>95% Scam Detection Rate</Text>
            <Text style={styles.verifiedDesc}>
              82 scam categories tested across 25+ industries
            </Text>
          </View>
          <View style={styles.verifiedDivider} />
        </View>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => router.push("/auth/signup")}
          >
            <Text style={styles.primaryButtonText}>Get Started — It's Free</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "space-between",
  },
  logoSection: {
    alignItems: "center",
    marginTop: 8,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 14,
  },
  appName: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 23,
  },
  features: {
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  featureDesc: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    marginTop: 1,
  },
  verifiedSection: {
    alignItems: "center",
    gap: 0,
  },
  verifiedDivider: {
    width: "55%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  verifiedInner: {
    alignItems: "center",
    paddingVertical: 10,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  verifiedLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    color: "#34D399",
    letterSpacing: 1.2,
  },
  verifiedStat: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    color: "#FFFFFF",
    marginTop: 3,
  },
  verifiedDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginTop: 2,
  },
  buttons: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#0E2D6B",
  },
  secondaryButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
