import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";

const FEATURES = [
  {
    icon: "mic" as const,
    color: "#2563EB",
    bg: "#DBEAFE",
    title: "Voice Assistance",
    desc: "Ask any question and get step-by-step guidance in plain language",
  },
  {
    icon: "shield-checkmark" as const,
    color: "#10B981",
    bg: "#D1FAE5",
    title: "Scam Protection",
    desc: "Instantly detect suspicious messages, emails, and calls",
  },
  {
    icon: "people" as const,
    color: "#8B5CF6",
    bg: "#EDE9FE",
    title: "Family Alerts",
    desc: "Your family gets notified instantly if we detect any danger",
  },
];

export default function OnboardingStep1() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  function next() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/onboarding/step2");
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.progressDots}>
            {[0, 1, 2].map(i => (
              <View
                key={i}
                style={[styles.dot, { backgroundColor: i === 0 ? "#2563EB" : theme.border }]}
              />
            ))}
          </View>
          <Text style={[styles.heading, { color: theme.text }]}>Your protection{"\n"}starts here</Text>
          <Text style={[styles.subheading, { color: theme.textSecondary }]}>
            SeniorShield keeps you safe and confident with technology
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View
              key={i}
              style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <View style={[styles.featureIconBg, { backgroundColor: f.bg }]}>
                <Ionicons name={f.icon} size={28} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: theme.text }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24, backgroundColor: theme.background }]}>
        <Pressable
          style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
          onPress={next}
        >
          <Text style={styles.nextButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
  heading: { fontSize: 32, fontFamily: "Inter_700Bold", lineHeight: 40, marginBottom: 12 },
  subheading: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24 },
  features: { gap: 16 },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  featureIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: { flex: 1, gap: 4 },
  featureTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  featureDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  nextButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
