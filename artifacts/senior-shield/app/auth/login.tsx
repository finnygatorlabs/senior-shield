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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import GoogleLogo from "@/components/GoogleLogo";

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get("window");
const GRADIENT: [string, string, string] = ["#06102E", "#0E2D6B", "#0B5FAA"];


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
  const { login, loginWithGoogle, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const FALLBACK_ID = "not-configured";
  const isGoogleConfigured = Platform.select({
    ios: !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    android: !!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    default: !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || FALLBACK_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || FALLBACK_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || FALLBACK_ID,
    redirectUri: makeRedirectUri({
      scheme: "senior-shield",
      path: "auth/google-callback",
    }),
  });

  useEffect(() => {
    if (!googleResponse) return;
    if (googleResponse.type === "success") {
      const token = googleResponse.authentication?.accessToken;
      if (token) {
        setSocialLoading(true);
        loginWithGoogle(token)
          .catch((err) => showError(err?.message || "Google sign-in failed. Please try again."))
          .finally(() => setSocialLoading(false));
      }
    }
  }, [googleResponse]);

  function handleGoogleSignIn() {
    setError("");
    if (!isGoogleConfigured) {
      setSuccess("Google sign-in will be available once the app is published. Please use Email for now.");
      return;
    }
    if (Platform.OS === "web") {
      setSocialLoading(true);
      const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}/auth/google-callback`;
      const url = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=token&` +
        `scope=${encodeURIComponent("openid email profile")}&` +
        `prompt=select_account`;

      const popup = window.open(url, "google-auth", "width=500,height=600,menubar=no,toolbar=no");

      if (!popup) {
        showError("Popup was blocked. Please allow popups for this site.");
        setSocialLoading(false);
        return;
      }

      const poll = setInterval(async () => {
        try {
          if (popup.closed) {
            clearInterval(poll);
            setSocialLoading(false);
            return;
          }
          const popupUrl = popup.location.href;
          if (popupUrl && popupUrl.includes("access_token")) {
            clearInterval(poll);
            const hashStr = popup.location.hash;
            const params = new URLSearchParams(hashStr.substring(1));
            const accessToken = params.get("access_token");
            popup.close();
            if (accessToken) {
              loginWithGoogle(accessToken)
                .catch((err) => showError(err?.message || "Google sign-in failed."))
                .finally(() => setSocialLoading(false));
            } else {
              setSocialLoading(false);
              showError("Could not get access token from Google.");
            }
          }
        } catch (e) {
        }
      }, 500);
    } else {
      googlePromptAsync();
    }
  }

  function showError(msg: string) {
    setError(msg);
    setSuccess("");
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function handleAppleSignIn() {
    setError("");
    setSuccess("Apple sign-in is coming soon! For now, please use Google or Email.");
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
      <Image
        source={require("@/assets/abstract-login-bg.png")}
        style={styles.bgImage}
        resizeMode="cover"
      />

      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable
          onPress={() => showEmailForm ? setShowEmailForm(false) : router.back()}
          style={styles.backButton}
          hitSlop={12}
        >
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
        <View style={styles.heroSection}>
          <Image
            source={require("../../assets/images/logo-shield.png")}
            style={styles.heroLogo}
            resizeMode="contain"
          />
          <Text style={styles.heroTitle}>Welcome Back</Text>
          <Text style={styles.heroSubtitle}>Sign in to SeniorShield</Text>
        </View>

        {!showEmailForm ? (
          <View style={styles.socialSection}>
            <Pressable
              style={[styles.socialButton, styles.googleBtn, (socialLoading || !isGoogleConfigured) && styles.disabled]}
              onPress={handleGoogleSignIn}
              disabled={socialLoading}
            >
              {socialLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <View style={styles.socialIconCircle}>
                    <GoogleLogo size={18} />
                  </View>
                  <Text style={styles.socialButtonText}>Sign In with Google</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.socialButton, styles.appleBtn]}
              onPress={handleAppleSignIn}
            >
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text style={styles.socialButtonText}>Sign In with Apple</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={[styles.socialButton, styles.emailBtn]}
              onPress={() => setShowEmailForm(true)}
            >
              <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
              <Text style={styles.socialButtonText}>Sign In with Email</Text>
            </Pressable>

            {!!error && <InlineError message={error} onDismiss={() => setError("")} />}
            {!!success && <InlineSuccess message={success} />}
          </View>
        ) : (
          <>
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
                  autoFocus
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
              style={({ pressed }) => [styles.signInButton, pressed && styles.pressed, loading && styles.disabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#0E2D6B" /> : (
                <Text style={styles.signInButtonText}>Sign In</Text>
              )}
            </Pressable>
          </>
        )}

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
  bgImage: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%" as any,
    height: "100%" as any,
    opacity: 0.55,
  },
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
  content: { paddingHorizontal: 24, paddingTop: 0, gap: 18 },
  heroSection: {
    alignItems: "center" as const,
    paddingTop: 32,
    paddingBottom: 24,
  },
  heroLogo: {
    width: 73,
    height: 73,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center" as const,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center" as const,
  },
  socialSection: { gap: 14 },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 14,
    paddingVertical: 16,
  },
  googleBtn: {
    backgroundColor: "#4285F4",
  },
  appleBtn: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  emailBtn: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  socialIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#4285F4", lineHeight: 17 },
  socialButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
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
  signInButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  signInButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0E2D6B" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  switchLink: { alignItems: "center", paddingVertical: 4 },
  switchText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
});
