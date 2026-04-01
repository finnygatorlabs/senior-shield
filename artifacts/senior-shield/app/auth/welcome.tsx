import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
  Image,
  ScrollView,
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
  { icon: "mic" as const, text: "Voice-guided tech help", desc: "Ask anything, get plain-language answers" },
  { icon: "shield-checkmark" as const, text: "Real-time scam detection", desc: "Paste any message for instant risk analysis" },
  { icon: "people" as const, text: "Family alert system", desc: "Loved ones get notified of threats" },
  { icon: "warning" as const, text: "Emergency SOS", desc: "One-tap 911 and family alerts" },
  { icon: "medkit" as const, text: "Medication & Wellness Reminders", desc: "Stay on top of your health routine" },
  { icon: "bulb" as const, text: "Adaptive Learning", desc: "Gets smarter the more you use it" },
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

      <View style={{ position: "absolute", top: 65, right: 20, flexDirection: "row", gap: 4 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <View key={i} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)" }} />
        ))}
      </View>

      <View style={{ position: "absolute", top: insets.top + 23, right: 20, zIndex: 20 }}>
        <View style={styles.protectedBadge}>
          <Ionicons name="shield-checkmark" size={11} color="#34D399" />
          <Text style={styles.protectedText}>Protected</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoSection}>
          <Image
            source={require("../../assets/images/logo-shield.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>SeniorShield{"\u2122"}</Text>
          <Text style={styles.tagline}>Your voice assistant for tech help & scam protection</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((item, i) => (
            <View key={i} style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Ionicons name={item.icon} size={20} color="#FFFFFF" />
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
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#34D399" />
            <Text style={styles.verifiedLabel}>VERIFIED ACCURACY</Text>
          </View>
          <Text style={styles.verifiedStat}>95% Scam Detection Accuracy</Text>
          <Text style={styles.verifiedDesc}>
            Tested on 82 scam categories across 25+ industries
          </Text>
          <Text style={styles.verifiedDesc}>
            Real-world tested on actual scams targeting seniors
          </Text>
          <View style={styles.verifiedDivider} />
        </View>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => router.push("/auth/signup")}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => router.push("/auth/login")}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </Pressable>
          <Text style={styles.freeNote}>Free version available  •  Premium includes additional family members</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 28,
    justifyContent: "space-between",
    flexGrow: 1,
  },
  logoSection: {
    alignItems: "center",
    marginTop: 0,
  },
  badgeRow: {
    marginBottom: 8,
  },
  protectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16,185,129,0.2)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  protectedText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
    fontSize: 11,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: 12,
  },
  appName: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 20,
  },
  features: {
    gap: 10,
    marginVertical: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
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
    color: "rgba(255,255,255,0.6)",
    marginTop: 1,
  },
  verifiedSection: {
    alignItems: "center",
    marginVertical: 4,
    gap: 6,
  },
  verifiedDivider: {
    width: "60%",
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  verifiedLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    color: "#34D399",
    letterSpacing: 1.2,
  },
  verifiedStat: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#FFFFFF",
    marginTop: 2,
  },
  verifiedDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 18,
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    flexWrap: "wrap",
  },
  primaryButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#0E2D6B",
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  freeNote: {
    width: "100%",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginTop: 6,
    letterSpacing: 0.2,
  },
});
