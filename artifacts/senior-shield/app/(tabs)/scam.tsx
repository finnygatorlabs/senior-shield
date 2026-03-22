import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

interface AnalysisResult {
  id: string;
  risk_score: number;
  risk_level: "safe" | "suspicious" | "high_risk";
  detected_patterns: string[];
  explanation: string;
}

const RISK_CONFIG = {
  safe: { color: "#10B981", bg: "#D1FAE5", label: "Safe", icon: "checkmark-circle" as const },
  suspicious: { color: "#F59E0B", bg: "#FEF3C7", label: "Suspicious", icon: "warning" as const },
  high_risk: { color: "#EF4444", bg: "#FEE2E2", label: "High Risk", icon: "alert-circle" as const },
};

const PATTERN_LABELS: Record<string, string> = {
  phishing_keywords: "Phishing language",
  urgency: "Creates urgency",
  money_request: "Requests money",
  personal_info_request: "Wants personal info",
  bank_impersonation: "Impersonates known brand",
  suspicious_links: "Suspicious links",
};

const QUICK_TESTS = [
  "URGENT: Your bank account has been suspended. Click here to verify: bit.ly/12abc",
  "Hi, it's your grandson! I'm in trouble and need $500 in gift cards. Don't tell Mom.",
  "Congratulations! You've won $5,000. Send your SSN and bank account to claim your prize.",
];

export default function ScamScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();

  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  async function analyze(textToAnalyze?: string) {
    const target = textToAnalyze || text;
    if (!target.trim()) {
      Alert.alert("Empty message", "Please paste or type a message to analyze.");
      return;
    }

    setLoading(true);
    setResult(null);
    setFeedbackSent(false);

    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      const response = await fetch(`${base}/api/scam/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ text: target }),
      });

      const data = await response.json();
      setResult(data);
      Haptics.notificationAsync(
        data.risk_level === "high_risk"
          ? Haptics.NotificationFeedbackType.Error
          : data.risk_level === "suspicious"
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );
    } catch (err) {
      Alert.alert("Error", "Could not analyze message. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(type: "correct" | "false_positive" | "false_negative") {
    if (!result) return;
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      await fetch(`${base}/api/scam/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ scam_analysis_id: result.id, feedback_type: type }),
      });
      setFeedbackSent(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {}
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: tabBarHeight + insets.bottom + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.title, { color: theme.text }]}>Scam Detector</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        Paste a suspicious message below and we'll check if it's a scam
      </Text>

      <View style={[styles.inputCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.inputHeader}>
          <Ionicons name="clipboard-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Paste message here</Text>
        </View>
        <TextInput
          style={[styles.textArea, { color: theme.text, backgroundColor: theme.inputBackground }]}
          value={text}
          onChangeText={setText}
          placeholder="Paste or type the suspicious message, email, or text..."
          placeholderTextColor={theme.placeholder}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
        <Pressable
          style={({ pressed }) => [styles.analyzeButton, loading && styles.disabled, pressed && styles.pressed]}
          onPress={() => analyze()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>Analyze Message</Text>
            </>
          )}
        </Pressable>
      </View>

      {!result && !loading && (
        <View style={styles.quickTests}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Try a sample</Text>
          {QUICK_TESTS.map((test, i) => (
            <Pressable
              key={i}
              onPress={() => { setText(test); analyze(test); }}
              style={[styles.quickTestCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
            >
              <Ionicons name="flask-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.quickTestText, { color: theme.textSecondary }]} numberOfLines={2}>
                {test}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
            </Pressable>
          ))}
        </View>
      )}

      {result && (
        <View style={[styles.resultCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={[styles.riskBanner, { backgroundColor: RISK_CONFIG[result.risk_level].bg }]}>
            <Ionicons
              name={RISK_CONFIG[result.risk_level].icon}
              size={32}
              color={RISK_CONFIG[result.risk_level].color}
            />
            <View style={styles.riskInfo}>
              <Text style={[styles.riskLabel, { color: RISK_CONFIG[result.risk_level].color }]}>
                {RISK_CONFIG[result.risk_level].label}
              </Text>
              <Text style={[styles.riskScore, { color: RISK_CONFIG[result.risk_level].color }]}>
                Risk Score: {result.risk_score}/100
              </Text>
            </View>
            <View style={[styles.scoreCircle, { borderColor: RISK_CONFIG[result.risk_level].color }]}>
              <Text style={[styles.scoreNumber, { color: RISK_CONFIG[result.risk_level].color }]}>
                {result.risk_score}
              </Text>
            </View>
          </View>

          <View style={styles.resultBody}>
            <Text style={[styles.resultSectionTitle, { color: theme.text }]}>Analysis</Text>
            <Text style={[styles.explanation, { color: theme.textSecondary }]}>{result.explanation}</Text>

            {result.detected_patterns.length > 0 && (
              <>
                <Text style={[styles.resultSectionTitle, { color: theme.text, marginTop: 16 }]}>
                  Warning Signs Detected
                </Text>
                {result.detected_patterns.map((pattern, i) => (
                  <View key={i} style={styles.patternRow}>
                    <Ionicons name="alert-circle" size={16} color="#F59E0B" />
                    <Text style={[styles.patternText, { color: theme.text }]}>
                      {PATTERN_LABELS[pattern] || pattern}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {!feedbackSent ? (
              <View style={styles.feedbackSection}>
                <Text style={[styles.feedbackTitle, { color: theme.textSecondary }]}>Was this accurate?</Text>
                <View style={styles.feedbackButtons}>
                  <Pressable
                    style={[styles.feedbackBtn, { backgroundColor: "#D1FAE5", borderColor: "#10B981" }]}
                    onPress={() => sendFeedback("correct")}
                  >
                    <Ionicons name="checkmark" size={16} color="#10B981" />
                    <Text style={[styles.feedbackBtnText, { color: "#10B981" }]}>Yes</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.feedbackBtn, { backgroundColor: "#FEE2E2", borderColor: "#EF4444" }]}
                    onPress={() => sendFeedback(result.risk_level === "safe" ? "false_negative" : "false_positive")}
                  >
                    <Ionicons name="close" size={16} color="#EF4444" />
                    <Text style={[styles.feedbackBtnText, { color: "#EF4444" }]}>No, this is wrong</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.feedbackThankYou}>
                <Ionicons name="heart" size={16} color="#2563EB" />
                <Text style={[styles.feedbackThanks, { color: "#2563EB" }]}>Thanks for the feedback!</Text>
              </View>
            )}

            <Pressable
              onPress={() => { setResult(null); setText(""); }}
              style={[styles.analyzeAnotherBtn, { borderColor: theme.border }]}
            >
              <Text style={[styles.analyzeAnotherText, { color: theme.textSecondary }]}>Check another message</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 8 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginBottom: 24 },
  inputCard: { borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24, gap: 14 },
  inputHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  inputLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  textArea: {
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    minHeight: 120,
    lineHeight: 24,
  },
  analyzeButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  analyzeButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  quickTests: { gap: 10 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  quickTestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickTestText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  resultCard: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  riskBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    gap: 14,
  },
  riskInfo: { flex: 1 },
  riskLabel: { fontSize: 20, fontFamily: "Inter_700Bold" },
  riskScore: { fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 2 },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: { fontSize: 18, fontFamily: "Inter_700Bold" },
  resultBody: { padding: 20, gap: 4 },
  resultSectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginBottom: 8 },
  explanation: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 23 },
  patternRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  patternText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  feedbackSection: { marginTop: 20, gap: 10 },
  feedbackTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  feedbackButtons: { flexDirection: "row", gap: 10 },
  feedbackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedbackBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  feedbackThankYou: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 },
  feedbackThanks: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  analyzeAnotherBtn: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  analyzeAnotherText: { fontSize: 15, fontFamily: "Inter_500Medium" },
});
