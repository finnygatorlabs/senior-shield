import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  StatusBar,
  Dimensions,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";

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

export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const resolvedEmail = email || (user as any)?.email || "";
  const displayEmail = resolvedEmail || "your email";

  async function resendVerification() {
    if (!resolvedEmail) return;
    setResending(true);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "http://localhost:8080";
      await fetch(`${base}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resolvedEmail }),
      });
      setResent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not resend. Please try again.");
    } finally {
      setResending(false);
    }
  }

  function continueAnyway() {
    router.replace("/onboarding/step1");
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

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.iconWrapper}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={48} color="#FFFFFF" />
          </View>
          {!resent && (
            <View style={styles.checkBadge}>
              <Ionicons name="paper-plane" size={14} color="#FFFFFF" />
            </View>
          )}
          {resent && (
            <View style={[styles.checkBadge, { backgroundColor: "#34D399" }]}>
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            </View>
          )}
        </View>

        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>We sent a verification link to</Text>
        <Text style={styles.emailText}>{displayEmail}</Text>

        <Text style={styles.instruction}>
          Open the link in your email to verify your account. If you don't see it, check your spam or junk folder.
        </Text>

        <View style={styles.tipCard}>
          <Ionicons name="information-circle" size={20} color="#34D399" />
          <Text style={styles.tipText}>
            You can still use SeniorShield while waiting to verify your email.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
          onPress={continueAnyway}
        >
          <Text style={styles.continueButtonText}>Continue to App</Text>
          <Ionicons name="arrow-forward" size={20} color="#0E2D6B" />
        </Pressable>

        <View style={styles.resendRow}>
          <Text style={styles.resendLabel}>Didn't receive it?</Text>
          {resending ? (
            <ActivityIndicator size="small" color="#34D399" />
          ) : resent ? (
            <Text style={styles.resentText}>Sent! Check your inbox.</Text>
          ) : (
            <Pressable onPress={resendVerification} hitSlop={10}>
              <Text style={styles.resendLink}>Resend email</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: "center",
    zIndex: 10,
  },
  iconWrapper: { marginBottom: 32, position: "relative" },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  checkBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(6,16,46,0.5)",
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 10,
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    color: "rgba(255,255,255,0.7)",
  },
  emailText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    marginBottom: 20,
    marginTop: 4,
    color: "#34D399",
  },
  instruction: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    color: "rgba(255,255,255,0.65)",
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 32,
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    color: "rgba(255,255,255,0.7)",
  },
  continueButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    marginBottom: 20,
  },
  continueButtonText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#0E2D6B",
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  resendLabel: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  resendLink: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#34D399",
  },
  resentText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#34D399",
  },
});
