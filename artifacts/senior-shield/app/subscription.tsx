import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

const PLANS = [
  {
    id: "monthly",
    name: "Monthly",
    price: "$4.99",
    period: "/month",
    description: "No commitment",
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "$39.99",
    period: "/year",
    description: "Save 33% — Best Value",
    badge: "BEST VALUE",
    badgeColor: "#10B981",
  },
];

const PRO_FEATURES = [
  { icon: "mic", label: "Unlimited voice assistance" },
  { icon: "shield-checkmark", label: "Advanced scam detection" },
  { icon: "people", label: "Up to 10 family members" },
  { icon: "notifications", label: "Instant family alerts" },
  { icon: "analytics", label: "Monthly safety reports" },
  { icon: "phone-portrait", label: "Priority support" },
];

export default function SubscriptionScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [selected, setSelected] = useState("yearly");
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      const response = await fetch(`${base}/api/billing/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ plan: selected }),
      });
      const data = await response.json();
      if (data.checkout_url) {
        Alert.alert(
          "Upgrade to Pro",
          `You'll be redirected to complete payment for the ${selected} plan.`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert("Stripe Not Configured", "Billing is not configured yet. Set STRIPE_SECRET_KEY to enable payments.");
      }
    } catch (err) {
      Alert.alert("Error", "Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (Platform.OS === "web" ? 24 : 16), paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>

      <LinearGradient
        colors={["#1D4ED8", "#2563EB"]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
        <Text style={styles.heroTitle}>SeniorShield Pro</Text>
        <Text style={styles.heroSubtitle}>Complete protection for you and your family</Text>
      </LinearGradient>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>What you get</Text>
      <View style={[styles.featuresCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {PRO_FEATURES.map((f, i) => (
          <View key={i} style={[styles.featureRow, i < PRO_FEATURES.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: theme.border }]}>
            <View style={[styles.featureIconBg]}>
              <Ionicons name={f.icon as any} size={18} color="#2563EB" />
            </View>
            <Text style={[styles.featureText, { color: theme.text }]}>{f.label}</Text>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Choose your plan</Text>
      <View style={styles.planCards}>
        {PLANS.map(plan => (
          <Pressable
            key={plan.id}
            onPress={() => { setSelected(plan.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[
              styles.planCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
              selected === plan.id && styles.planCardSelected,
            ]}
          >
            {plan.badge && (
              <View style={[styles.planBadge, { backgroundColor: plan.badgeColor }]}>
                <Text style={styles.planBadgeText}>{plan.badge}</Text>
              </View>
            )}
            <View style={styles.planRow}>
              <View style={[styles.planRadio, selected === plan.id && styles.planRadioSelected]}>
                {selected === plan.id && <View style={styles.planRadioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.planName, { color: theme.text }]}>{plan.name}</Text>
                <Text style={[styles.planDescription, { color: theme.textSecondary }]}>{plan.description}</Text>
              </View>
              <View style={styles.planPricing}>
                <Text style={[styles.planPrice, { color: selected === plan.id ? "#2563EB" : theme.text }]}>
                  {plan.price}
                </Text>
                <Text style={[styles.planPeriod, { color: theme.textSecondary }]}>{plan.period}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.subscribeButton, loading && styles.disabled, pressed && styles.pressed]}
        onPress={handleSubscribe}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.subscribeButtonText}>Start Pro Plan</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </>
        )}
      </Pressable>

      <Text style={[styles.legalText, { color: theme.textTertiary }]}>
        Cancel anytime. No hidden fees. Secure payment via Stripe.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  backButton: { width: 44, height: 44, justifyContent: "center", marginBottom: 8 },
  hero: { borderRadius: 24, padding: 28, alignItems: "center", gap: 12 },
  heroTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  heroSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)", textAlign: "center" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  featuresCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  featureIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#DBEAFE", alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium" },
  planCards: { gap: 12 },
  planCard: { borderRadius: 16, borderWidth: 1.5, padding: 18, overflow: "hidden" },
  planCardSelected: { borderColor: "#2563EB", backgroundColor: "#EFF6FF" },
  planBadge: { position: "absolute", top: -1, right: 16, paddingHorizontal: 10, paddingVertical: 5, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  planBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  planRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  planRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  planRadioSelected: { borderColor: "#2563EB" },
  planRadioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#2563EB" },
  planName: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  planDescription: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  planPricing: { alignItems: "flex-end" },
  planPrice: { fontSize: 22, fontFamily: "Inter_700Bold" },
  planPeriod: { fontSize: 12, fontFamily: "Inter_400Regular" },
  subscribeButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  subscribeButtonText: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  legalText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
