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

const RELATIONSHIPS = ["Son", "Daughter", "Grandson", "Granddaughter", "Spouse", "Friend", "Caregiver"];

export default function OnboardingStep3() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();

  const [familyEmail, setFamilyEmail] = useState("");
  const [relationship, setRelationship] = useState("Daughter");
  const [loading, setLoading] = useState(false);

  async function complete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(true);

    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";

      if (familyEmail.trim()) {
        await fetch(`${base}/api/family/add-member`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
          body: JSON.stringify({
            adult_child_email: familyEmail.trim().toLowerCase(),
            relationship: relationship.toLowerCase(),
          }),
        });
      }

      await fetch(`${base}/api/user/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ onboarding_completed: true }),
      });

      updateUser({ onboarding_completed: true });
      router.replace("/(tabs)/home");
    } catch (err) {
      router.replace("/(tabs)/home");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <View style={styles.progressDots}>
          {[0, 1, 2].map(i => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i === 2 ? "#2563EB" : theme.border }]}
            />
          ))}
        </View>

        <Text style={[styles.heading, { color: theme.text }]}>Add a{"\n"}family member</Text>
        <Text style={[styles.subheading, { color: theme.textSecondary }]}>
          They'll receive alerts if we detect any scam or danger. You can skip this step.
        </Text>

        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.cardIconRow}>
            <View style={styles.cardIcon}>
              <Ionicons name="people" size={24} color="#8B5CF6" />
            </View>
            <View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Family Alerts</Text>
              <Text style={[styles.cardSub, { color: theme.textSecondary }]}>Get instant notifications</Text>
            </View>
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Family member's email</Text>
          <View style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={familyEmail}
              onChangeText={setFamilyEmail}
              placeholder="family@example.com"
              placeholderTextColor={theme.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Relationship</Text>
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
                  { backgroundColor: theme.inputBackground, borderColor: theme.border },
                  relationship === rel && styles.relChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.relChipText,
                    { color: theme.textSecondary },
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

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24, backgroundColor: theme.background }]}>
        <Pressable
          style={({ pressed }) => [styles.completeButton, pressed && styles.pressed, loading && styles.disabled]}
          onPress={complete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.completeButtonText}>All Done — Let's Go!</Text>
              <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            </>
          )}
        </Pressable>
        <Pressable onPress={() => complete()} style={styles.skipLink}>
          <Text style={[styles.skipText, { color: theme.textSecondary }]}>Skip for now</Text>
        </Pressable>
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
  subheading: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24, marginBottom: 24 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  cardIconRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  field: { gap: 10, marginBottom: 20 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular" },
  relationshipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  relChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  relChipSelected: { borderColor: "#2563EB", backgroundColor: "#DBEAFE" },
  relChipText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  relChipTextSelected: { color: "#2563EB", fontFamily: "Inter_600SemiBold" },
  bottomBar: { paddingHorizontal: 24, paddingTop: 16, gap: 12 },
  completeButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  completeButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  skipLink: { alignItems: "center", paddingVertical: 4 },
  skipText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
