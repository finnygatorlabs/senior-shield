import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { familyApi, userApi } from "@/services/api";

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

const RELATIONSHIPS = ["Son", "Daughter", "Brother", "Sister", "Grandson", "Granddaughter", "Significant Other", "Spouse", "Friend", "Caregiver"];

export default function OnboardingStep3() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const [familyEmail, setFamilyEmail] = useState("");
  const [relationship, setRelationship] = useState("Daughter");
  const [loading, setLoading] = useState(false);

  async function complete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);

    try {
      if (familyEmail.trim()) {
        await familyApi.addMember(familyEmail.trim().toLowerCase(), relationship.toLowerCase(), user?.token);
      }

      await userApi.updateProfile({ onboarding_completed: true }, user?.token);

      router.replace("/onboarding/welcome-tour");
    } catch (err) {
      router.replace("/onboarding/welcome-tour");
    } finally {
      setLoading(false);
    }
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
              style={[styles.dot, { backgroundColor: i === 2 ? "#FFFFFF" : "rgba(255,255,255,0.25)" }]}
            />
          ))}
        </View>

        <Text style={styles.heading}>Add a{"\n"}family member</Text>
        <Text style={styles.subheading}>
          They'll receive alerts if we detect any scam or danger. You can skip this step.
        </Text>

        <View style={styles.card}>
          <View style={styles.cardIconRow}>
            <View style={styles.cardIcon}>
              <Ionicons name="people" size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Family Alerts</Text>
              <Text style={styles.cardSub}>Get instant notifications</Text>
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Family member's email</Text>
          <View style={styles.input}>
            <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={styles.textInput}
              value={familyEmail}
              onChangeText={setFamilyEmail}
              placeholder="family@example.com"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Relationship</Text>
          <View style={styles.relationshipGrid}>
            {RELATIONSHIPS.map(rel => (
              <Pressable
                key={rel}
                onPress={() => {
                  setRelationship(rel);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.relChip,
                  relationship === rel && styles.relChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.relChipText,
                    relationship === rel && styles.relChipTextSelected,
                  ]}
                >
                  {rel}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <Pressable
          style={({ pressed }) => [styles.completeButton, pressed && styles.pressed, loading && styles.disabled]}
          onPress={complete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0E2D6B" />
          ) : (
            <>
              <Text style={styles.completeButtonText}>All Done — Let's Go!</Text>
              <Ionicons name="checkmark-circle" size={22} color="#0E2D6B" />
            </>
          )}
        </Pressable>
        <Pressable onPress={() => complete()} style={styles.skipLink}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
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
  subheading: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24, marginBottom: 24, color: "rgba(255,255,255,0.7)" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  cardIconRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(139,92,246,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  field: { gap: 10, marginBottom: 20 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  textInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", color: "#FFFFFF" },
  relationshipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  relChipSelected: { borderColor: "rgba(52,211,153,0.5)", backgroundColor: "rgba(52,211,153,0.15)" },
  relChipText: { fontSize: 14, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.6)" },
  relChipTextSelected: { color: "#FFFFFF", fontFamily: "Inter_600SemiBold" },
  bottomBar: { paddingHorizontal: 24, paddingTop: 16, gap: 12, zIndex: 10 },
  completeButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  completeButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0E2D6B" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  skipLink: { alignItems: "center", paddingVertical: 4 },
  skipText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
});
