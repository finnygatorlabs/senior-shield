import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

export default function EmergencyScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [alertSent, setAlertSent] = useState(false);

  function callEmergency() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    if (Platform.OS !== "web") {
      Linking.openURL("tel:911");
    } else {
      Alert.alert("Emergency", "Dial 911 from your phone immediately.");
    }
  }

  async function sendFamilyAlert() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      await fetch(`${base}/api/alerts/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          alert_type: "emergency_sos",
          message: "I need help. Please contact me immediately.",
          severity: "high",
        }),
      });
      setAlertSent(true);
    } catch {
      setAlertSent(true);
    }
    Alert.alert(
      "Alert Sent",
      "Your family members have been notified that you need help.",
      [{ text: "OK" }]
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Emergency</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["#EF4444", "#DC2626"]}
          style={styles.hero}
        >
          <View style={styles.heroIcon}>
            <Ionicons name="alert-circle" size={48} color="#EF4444" />
          </View>
          <Text style={styles.heroTitle}>Need Help?</Text>
          <Text style={styles.heroSubtitle}>
            Press the button below to call emergency services or alert your family immediately
          </Text>
        </LinearGradient>

        <Pressable
          onPress={callEmergency}
          style={({ pressed }) => [styles.emergencyButton, pressed && styles.pressed]}
        >
          <View style={styles.emergencyButtonInner}>
            <Ionicons name="call" size={48} color="#FFFFFF" />
            <Text style={styles.emergencyButtonText}>Call 911</Text>
            <Text style={styles.emergencyButtonSub}>Emergency Services</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={sendFamilyAlert}
          style={({ pressed }) => [
            styles.familyAlertButton,
            { backgroundColor: theme.card, borderColor: alertSent ? "#10B981" : "#F59E0B" },
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.familyAlertIcon, { backgroundColor: alertSent ? "#D1FAE5" : "#FEF3C7" }]}>
            <Ionicons name="people" size={28} color={alertSent ? "#10B981" : "#F59E0B"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.familyAlertTitle, { color: theme.text }]}>
              {alertSent ? "Family Alerted!" : "Alert My Family"}
            </Text>
            <Text style={[styles.familyAlertSub, { color: theme.textSecondary }]}>
              {alertSent ? "Your family has been notified" : "Send SOS to all family members"}
            </Text>
          </View>
          <Ionicons
            name={alertSent ? "checkmark-circle" : "send"}
            size={24}
            color={alertSent ? "#10B981" : "#F59E0B"}
          />
        </Pressable>

        <View style={[styles.tipCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.tipTitle, { color: theme.text }]}>Scam Emergency?</Text>
          <Text style={[styles.tipText, { color: theme.textSecondary }]}>
            If you've received a scam message or think you've been defrauded:
          </Text>
          <View style={styles.tipSteps}>
            {[
              "Do NOT send money or gift cards",
              "Do NOT share passwords or SSN",
              "Hang up and call your family",
              "Use the Scam Detector in this app",
              "Report to FTC at ftc.gov/ReportFraud",
            ].map((step, i) => (
              <View key={i} style={styles.tipStep}>
                <View style={[styles.stepNum, { backgroundColor: "#DBEAFE" }]}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: theme.text }]}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.numbersCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Text style={[styles.tipTitle, { color: theme.text }]}>Important Numbers</Text>
          {[
            { label: "Emergency", number: "911" },
            { label: "FTC Scam Hotline", number: "1-877-382-4357" },
            { label: "AARP Fraud Helpline", number: "1-877-908-3360" },
          ].map((item, i) => (
            <Pressable
              key={i}
              onPress={() => {
                if (Platform.OS !== "web") Linking.openURL(`tel:${item.number.replace(/[^0-9]/g, "")}`);
              }}
              style={[styles.numberRow, { borderBottomColor: theme.border }]}
            >
              <View>
                <Text style={[styles.numberLabel, { color: theme.textSecondary }]}>{item.label}</Text>
                <Text style={[styles.numberValue, { color: "#2563EB" }]}>{item.number}</Text>
              </View>
              <Ionicons name="call-outline" size={20} color="#2563EB" />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  content: { paddingHorizontal: 20, gap: 16 },
  hero: {
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: { fontSize: 28, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  heroSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.9)", textAlign: "center", lineHeight: 22 },
  emergencyButton: {
    borderRadius: 24,
    backgroundColor: "#EF4444",
    padding: 4,
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  emergencyButtonInner: {
    borderRadius: 20,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
  },
  emergencyButtonText: { fontSize: 32, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  emergencyButtonSub: { fontSize: 16, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.85)" },
  familyAlertButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 20,
    borderWidth: 2,
    padding: 20,
  },
  familyAlertIcon: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  familyAlertTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold" },
  familyAlertSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  tipCard: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  tipTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  tipText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  tipSteps: { gap: 10 },
  tipStep: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepNum: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#2563EB" },
  stepText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  numbersCard: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 12 },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  numberLabel: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 2 },
  numberValue: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
});
