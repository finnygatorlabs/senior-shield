import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { userApi } from "@/services/api";

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

const FONT_SIZES = [
  { label: "Normal", value: "normal" },
  { label: "Large", value: "large" },
  { label: "Extra Large", value: "extra_large" },
];

const VOICE_OPTIONS = [
  { label: "Female Voice", value: "female" },
  { label: "Male Voice", value: "male" },
];

export default function OnboardingStep2() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [fontSize, setFontSize] = useState("large");
  const [voice, setVoice] = useState("female");

  async function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const assistantName = voice === "male" ? "Max" : "Ava";
      const ttsVoice = voice === "male" ? "echo" : "nova";
      await userApi.updatePreferences({
        font_size: fontSize,
        preferred_voice: voice,
        assistant_name: assistantName,
        tts_voice: ttsVoice,
      }, user?.token);
    } catch {}

    router.push("/onboarding/step3");
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <DecoCircle size={260} top={-80} right={-100} opacity={0.08} />
      <DecoCircle size={140} top={30} right={30} opacity={0.06} />
      <DecoCircle size={300} top={-120} left={-150} opacity={0.06} />
      <DecoCircle size={180} top={400} left={-90} opacity={0.04} />
      <DecoLine width={250} top={40} left={-60} rotate="-18deg" opacity={0.08} />
      <DecoLine width={180} top={120} left={width - 100} rotate="22deg" opacity={0.06} />

      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <View style={styles.progressDots}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i === 1 ? "#FFFFFF" : "rgba(255,255,255,0.25)" }]}
            />
          ))}
        </View>

        <Text style={styles.heading}>Customize{"\n"}your experience</Text>
        <Text style={styles.subheading}>
          Let's make SeniorShield perfect for you
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Text Size</Text>
          <View style={styles.optionRow}>
            {FONT_SIZES.map(size => (
              <Pressable
                key={size.value}
                onPress={() => {
                  setFontSize(size.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.sizeOption,
                  fontSize === size.value && styles.selectedOption,
                ]}
              >
                <Text
                  style={[
                    styles.sizeLabel,
                    fontSize === size.value && styles.selectedLabel,
                  ]}
                >
                  {size.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Voice Assistant</Text>
          <View style={styles.optionCol}>
            {VOICE_OPTIONS.map(v => (
              <Pressable
                key={v.value}
                onPress={() => {
                  setVoice(v.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.voiceOption,
                  voice === v.value && styles.selectedOption,
                ]}
              >
                <Ionicons
                  name="volume-high"
                  size={22}
                  color={voice === v.value ? "#34D399" : "rgba(255,255,255,0.5)"}
                />
                <Text
                  style={[
                    styles.voiceLabel,
                    voice === v.value && styles.selectedLabel,
                  ]}
                >
                  {v.label}
                </Text>
                {voice === v.value && (
                  <Ionicons name="checkmark-circle" size={22} color="#34D399" style={{ marginLeft: "auto" }} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.bottomRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.nextButton, { flex: 1 }, pressed && styles.pressed]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#0E2D6B" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, zIndex: 10 },
  progressDots: { flexDirection: "row", gap: 8, marginBottom: 24 },
  dot: { width: 32, height: 4, borderRadius: 2 },
  heading: { fontSize: 32, fontFamily: "Inter_700Bold", lineHeight: 40, marginBottom: 12, color: "#FFFFFF" },
  subheading: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24, marginBottom: 32, color: "rgba(255,255,255,0.7)" },
  section: { gap: 12, marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  optionRow: { flexDirection: "row", gap: 10 },
  optionCol: { gap: 10 },
  sizeOption: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  sizeLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  voiceOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  voiceLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.7)" },
  selectedOption: { borderColor: "rgba(52,211,153,0.5)", backgroundColor: "rgba(52,211,153,0.15)" },
  selectedLabel: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  bottomBar: { paddingHorizontal: 24, paddingTop: 16, zIndex: 10 },
  bottomRow: { flexDirection: "row", gap: 12 },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
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
