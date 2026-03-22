import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

const FONT_SIZES = [
  { label: "Normal", value: "normal" },
  { label: "Large", value: "large" },
  { label: "Extra Large", value: "extra_large" },
];

const VOICE_OPTIONS = [
  { label: "Female Voice", value: "female", icon: "person" as const },
  { label: "Male Voice", value: "male", icon: "person" as const },
];

export default function OnboardingStep2() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [fontSize, setFontSize] = useState("large");
  const [voice, setVoice] = useState("female");
  const [loading, setLoading] = useState(false);

  async function handleNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/onboarding/step3");
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <View style={styles.progressDots}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i === 1 ? "#2563EB" : theme.border }]}
            />
          ))}
        </View>

        <Text style={[styles.heading, { color: theme.text }]}>Customize{"\n"}your experience</Text>
        <Text style={[styles.subheading, { color: theme.textSecondary }]}>
          Let's make SeniorShield perfect for you
        </Text>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Text Size</Text>
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
                  { backgroundColor: theme.inputBackground, borderColor: theme.border },
                  fontSize === size.value && styles.selectedOption,
                ]}
              >
                <Text
                  style={[
                    styles.sizeLabel,
                    { color: theme.text },
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Voice Assistant</Text>
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
                  { backgroundColor: theme.inputBackground, borderColor: theme.border },
                  voice === v.value && styles.selectedOption,
                ]}
              >
                <Ionicons
                  name="volume-high"
                  size={22}
                  color={voice === v.value ? "#2563EB" : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.voiceLabel,
                    { color: theme.text },
                    voice === v.value && styles.selectedLabel,
                  ]}
                >
                  {v.label}
                </Text>
                {voice === v.value && (
                  <Ionicons name="checkmark-circle" size={22} color="#2563EB" style={{ marginLeft: "auto" }} />
                )}
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24, backgroundColor: theme.background }]}>
        <View style={styles.bottomRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: theme.inputBackground }]}
          >
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.nextButton, { flex: 1 }, pressed && styles.pressed]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  progressDots: { flexDirection: "row", gap: 8, marginBottom: 24 },
  dot: { width: 32, height: 4, borderRadius: 2 },
  heading: { fontSize: 32, fontFamily: "Inter_700Bold", lineHeight: 40, marginBottom: 12 },
  subheading: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24, marginBottom: 32 },
  section: { gap: 12, marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  optionRow: { flexDirection: "row", gap: 10 },
  optionCol: { gap: 10 },
  sizeOption: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
  },
  sizeLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  voiceOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  voiceLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  selectedOption: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  selectedLabel: { color: "#2563EB", fontFamily: "Inter_600SemiBold" },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  bottomRow: { flexDirection: "row", gap: 12 },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
