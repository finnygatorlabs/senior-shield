import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Dimensions,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

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
  {
    icon: "mic" as const,
    title: "Voice Assistance",
    desc: "Ask any question and get step-by-step guidance in plain language",
  },
  {
    icon: "shield-checkmark" as const,
    title: "Scam Protection",
    desc: "Instantly detect suspicious messages, emails, and calls",
  },
  {
    icon: "people" as const,
    title: "Family Alerts",
    desc: "Your family gets notified instantly if we detect any danger",
  },
];

export default function OnboardingStep1() {
  const insets = useSafeAreaInsets();

  function next() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/onboarding/step2");
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <DecoCircle size={260} top={-80} right={-100} opacity={0.08} />
      <DecoCircle size={140} top={30} right={30} opacity={0.06} />
      <DecoCircle size={300} top={-120} left={-150} opacity={0.06} />
      <DecoCircle size={80} top={160} right={100} opacity={0.05} />
      <DecoCircle size={180} top={500} left={-90} opacity={0.04} />
      <DecoLine width={250} top={40} left={-60} rotate="-18deg" opacity={0.08} />
      <DecoLine width={180} top={120} left={width - 100} rotate="22deg" opacity={0.06} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.progressDots}>
            {[0, 1, 2].map(i => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: i === 0 ? "#FFFFFF" : "rgba(255,255,255,0.25)" }]}
              />
            ))}
          </View>

          <Image
            source={require("../../assets/images/logo-shield.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.heading}>Your protection{"\n"}starts here</Text>
          <Text style={styles.subheading}>
            SeniorShield keeps you safe and confident with technology
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={styles.featureIconBg}>
                <Ionicons name={f.icon} size={28} color="#FFFFFF" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
          onPress={next}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#0E2D6B" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  header: { marginBottom: 32 },
  progressDots: { flexDirection: "row", gap: 8, marginBottom: 24 },
  dot: { width: 32, height: 4, borderRadius: 2 },
  logo: { width: 60, height: 60, marginBottom: 20 },
  heading: { fontSize: 32, fontFamily: "Inter_700Bold", lineHeight: 40, marginBottom: 12, color: "#FFFFFF" },
  subheading: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24, color: "rgba(255,255,255,0.7)" },
  features: { gap: 16 },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  featureIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  featureText: { flex: 1, gap: 4 },
  featureTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  featureDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, color: "rgba(255,255,255,0.6)" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  nextButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0E2D6B" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
