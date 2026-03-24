import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

function InlineError({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View style={errStyles.container}>
      <Ionicons name="alert-circle" size={18} color="#EF4444" />
      <Text style={errStyles.text}>{message}</Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={18} color="#EF4444" />
      </Pressable>
    </View>
  );
}

function InlineSuccess({ message }: { message: string }) {
  return (
    <View style={successStyles.container}>
      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
      <Text style={successStyles.text}>{message}</Text>
    </View>
  );
}

const errStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#B91C1C",
    lineHeight: 20,
  },
});

const successStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#065F46",
    lineHeight: 20,
  },
});

export default function LoginScreen() {
  const { theme } = useTheme();
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (googleResponse?.type === "success") {
      const token = googleResponse.authentication?.accessToken;
      if (token) {
        setGoogleLoading(true);
        loginWithGoogle(token)
          .catch(() => showError("Google sign-in failed. Please try again."))
          .finally(() => setGoogleLoading(false));
      }
    } else if (googleResponse?.type === "error") {
      showError("Google sign-in was cancelled or failed. Please try again.");
    }
  }, [googleResponse]);

  function showError(msg: string) {
    setError(msg);
    setSuccess("");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function handleLogin() {
    setError("");
    setSuccess("");
    if (!email.trim()) { showError("Please enter your email address."); return; }
    if (!password) { showError("Please enter your password."); return; }

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      showError(err?.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      showError("Enter your email address above, then tap Forgot Password again.");
      return;
    }
    setError("");
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch {}
    setSuccess(`Reset link sent to ${email.trim()}. Check your inbox (and spam folder).`);
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Sign in</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <View style={[styles.iconBg, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="shield-checkmark" size={36} color="#2563EB" />
          </View>
          <View>
            <Text style={[styles.welcomeTitle, { color: theme.text }]}>Welcome back</Text>
            <Text style={[styles.welcomeSub, { color: theme.textSecondary }]}>Sign in to SeniorShield</Text>
          </View>
        </View>

        <Pressable
          style={[styles.googleButton, (loading || googleLoading) && styles.disabled]}
          onPress={() => {
            setError("");
            setSuccess("");
            googlePromptAsync();
          }}
          disabled={loading || googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator size="small" color="#374151" />
          ) : (
            <>
              <View style={styles.googleIconCircle}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={[styles.googleButtonText, { color: theme.textSecondary }]}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          <Text style={[styles.dividerText, { color: theme.textTertiary }]}>or sign in with email</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
          <View style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={email}
              onChangeText={v => { setEmail(v); setError(""); setSuccess(""); }}
              placeholder="your@email.com"
              placeholderTextColor={theme.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={[styles.label, { color: theme.text }]}>Password</Text>
            <Pressable onPress={handleForgotPassword} hitSlop={10}>
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </Pressable>
          </View>
          <View style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={password}
              onChangeText={v => { setPassword(v); setError(""); setSuccess(""); }}
              placeholder="Your password"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={theme.textTertiary}
              />
            </Pressable>
          </View>
        </View>

        {!!error && <InlineError message={error} onDismiss={() => setError("")} />}
        {!!success && <InlineSuccess message={success} />}

        <Pressable
          style={({ pressed }) => [styles.loginButton, pressed && styles.pressed, loading && styles.disabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/auth/signup")} style={styles.switchLink}>
          <Text style={[styles.switchText, { color: theme.textSecondary }]}>
            Don't have an account?{" "}
            <Text style={{ color: "#2563EB", fontFamily: "Inter_600SemiBold" }}>Sign up free</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, gap: 18 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 },
  iconBg: { width: 64, height: 64, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  welcomeTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  welcomeSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#F9FAFB",
    paddingVertical: 16,
  },
  googleIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#FFFFFF", lineHeight: 18 },
  googleButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  forgotLink: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#2563EB" },
  input: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  textInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", minWidth: 0 },
  loginButton: { backgroundColor: "#2563EB", borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  loginButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  switchLink: { alignItems: "center", paddingVertical: 4 },
  switchText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
