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
  StatusBar,
  Dimensions,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useAuth } from "@/context/AuthContext";

WebBrowser.maybeCompleteAuthSession();

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

function InlineError({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View style={errStyles.container}>
      <Ionicons name="alert-circle" size={18} color="#FCA5A5" />
      <Text style={errStyles.text}>{message}</Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={18} color="#FCA5A5" />
      </Pressable>
    </View>
  );
}

function InlineSuccess({ message }: { message: string }) {
  return (
    <View style={successStyles.container}>
      <Ionicons name="checkmark-circle" size={18} color="#34D399" />
      <Text style={successStyles.text}>{message}</Text>
    </View>
  );
}

const errStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.3)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#FCA5A5",
    lineHeight: 20,
  },
});

const successStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderColor: "rgba(16,185,129,0.3)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#34D399",
    lineHeight: 20,
  },
});

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri: makeRedirectUri({ path: "/auth/google-callback" }),
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
      const base = domain ? `https://${domain}` : "http://localhost:8080";
      await fetch(`${base}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch {}
    setSuccess(`Reset link sent to ${email.trim()}. Check your inbox (and spam folder).`);
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

      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Sign in</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <Image
            source={require("../../assets/images/logo-shield.png")}
            style={styles.logoImg}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSub}>Sign in to SeniorShield</Text>
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
            <ActivityIndicator size="small" color="#0E2D6B" />
          ) : (
            <>
              <View style={styles.googleIconCircle}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign in with email</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.input}>
            <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={v => { setEmail(v); setError(""); setSuccess(""); }}
              placeholder="your@email.com"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Password</Text>
            <Pressable onPress={handleForgotPassword} hitSlop={10}>
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </Pressable>
          </View>
          <View style={styles.input}>
            <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={v => { setPassword(v); setError(""); setSuccess(""); }}
              placeholder="Your password"
              placeholderTextColor="rgba(255,255,255,0.35)"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="rgba(255,255,255,0.5)"
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
          {loading ? <ActivityIndicator color="#0E2D6B" /> : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/auth/signup")} style={styles.switchLink}>
          <Text style={styles.switchText}>
            Don't have an account?{" "}
            <Text style={{ color: "#34D399", fontFamily: "Inter_600SemiBold" }}>Sign up free</Text>
          </Text>
        </Pressable>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 10,
  },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 12, gap: 18 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 },
  logoImg: { width: 56, height: 56 },
  welcomeTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  welcomeSub: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 2, color: "rgba(255,255,255,0.7)" },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingVertical: 18,
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
  googleButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0E2D6B" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  forgotLink: { fontSize: 14, fontFamily: "Inter_500Medium", color: "#34D399" },
  input: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  textInput: { flex: 1, fontSize: 16, fontFamily: "Inter_400Regular", minWidth: 0, color: "#FFFFFF" },
  loginButton: { backgroundColor: "#FFFFFF", borderRadius: 16, paddingVertical: 18, alignItems: "center" },
  loginButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0E2D6B" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  switchLink: { alignItems: "center", paddingVertical: 4 },
  switchText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
});
