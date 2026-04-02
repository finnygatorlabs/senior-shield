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
const userType = "senior";

const shieldLogo = require("@/assets/seniorshield-logo-nobg.png");

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

function InlineInfo({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View style={infoStyles.container}>
      <Ionicons name="information-circle" size={18} color="#93C5FD" />
      <Text style={infoStyles.text}>{message}</Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <Ionicons name="close" size={18} color="#93C5FD" />
      </Pressable>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(59,130,246,0.15)",
    borderColor: "rgba(59,130,246,0.3)",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#93C5FD",
    lineHeight: 20,
  },
});

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

export default function SignupScreen() {
  const { signup, loginWithGoogle, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<"welcome" | "details">("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

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
        loginWithGoogle(token, userType)
          .catch((err) => {
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showError(err?.message || "Google sign-in failed. Please try again.");
          })
          .finally(() => setSocialLoading(false));
      }
    }
  }, [googleResponse]);

  function handleGoogleSignIn() {
    setError("");
    if (!isGoogleConfigured) {
      setInfo("Google sign-in will be available once the app is published. Please use Email for now.");
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
              loginWithGoogle(accessToken, userType)
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
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function handleSignup() {
    setError("");
    if (!firstName.trim()) { showError("Please enter your first name."); return; }
    if (!email.trim()) { showError("Please enter your email address."); return; }
    if (!password) { showError("Please enter a password."); return; }
    if (password.length < 8) { showError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      await signup(email.trim().toLowerCase(), password, userType, firstName.trim(), lastName.trim() || undefined);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      router.replace({
        pathname: "/auth/verify-email",
        params: { email: email.trim().toLowerCase() },
      });
    } catch (err: any) {
      const msg: string = err?.message || "Could not create account. Please try again.";
      if (msg.toLowerCase().includes("already")) {
        showError("This email is already registered. Tap 'Sign in' below to log in instead.");
      } else {
        showError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === "welcome") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

        <Image
          source={require("@/assets/abstract-bg.png")}
          style={styles.bgImage}
          resizeMode="cover"
        />

        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Get Started</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.welcomeContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <Image source={shieldLogo} style={styles.heroLogo} resizeMode="contain" />
            <Text style={styles.heroTitle}>Welcome to SeniorShield</Text>
            <Text style={styles.heroSubtitle}>Please Sign In</Text>
          </View>

          <View style={styles.signInOptions}>
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
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.socialButton, styles.appleBtn]}
              onPress={() => {
                setError("");
                setInfo("Apple sign-in is coming soon! For now, please use Google or Email.");
              }}
            >
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text style={styles.socialButtonText}>Continue with Apple</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or use email</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={[styles.socialButton, styles.emailBtn]}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setStep("details");
              }}
            >
              <Ionicons name="mail-outline" size={20} color="#FFFFFF" />
              <Text style={styles.socialButtonText}>Continue with Email</Text>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 24 }}>
            {!!info && <InlineInfo message={info} onDismiss={() => setInfo("")} />}
            {!!error && <InlineError message={error} onDismiss={() => setError("")} />}
          </View>

          <Pressable onPress={() => router.push("/auth/login")} style={styles.switchLink}>
            <Text style={styles.switchText}>
              Already have an account?{" "}
              <Text style={{ color: "#34D399", fontFamily: "Inter_600SemiBold" }}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => setStep("welcome")} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Create Your Account</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.field}>
          <Text style={styles.label}>First Name</Text>
          <View style={styles.input}>
            <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={styles.textInput}
              value={firstName}
              onChangeText={v => { setFirstName(v); setError(""); }}
              placeholder="Jane"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            Last Name <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.input}>
            <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={styles.textInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Smith"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.input}>
            <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={v => { setEmail(v); setError(""); }}
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
          <Text style={styles.label}>Password</Text>
          <View style={styles.input}>
            <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.5)" />
            <TextInput
              style={styles.textInput}
              value={password}
              onChangeText={v => { setPassword(v); setError(""); }}
              placeholder="Min. 8 characters"
              placeholderTextColor="rgba(255,255,255,0.35)"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSignup}
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

        {!!error && (
          <InlineError message={error} onDismiss={() => setError("")} />
        )}

        <Pressable
          style={({ pressed }) => [styles.signupButton, pressed && styles.pressed, loading && styles.disabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0E2D6B" />
          ) : (
            <Text style={styles.signupButtonText}>Create Account — It's Free</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/auth/login")} style={styles.switchLink}>
          <Text style={styles.switchText}>
            Already have an account?{" "}
            <Text style={{ color: "#34D399", fontFamily: "Inter_600SemiBold" }}>Sign in</Text>
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
  welcomeContent: { paddingHorizontal: 0, paddingTop: 0, gap: 0 },

  bgImage: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%" as any,
    height: "100%" as any,
    opacity: 0.55,
  },

  heroSection: {
    alignItems: "center" as const,
    paddingTop: 32,
    paddingBottom: 40,
  },

  heroLogo: {
    width: 73,
    height: 73,
    marginBottom: 14,
    zIndex: 2,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 6,
    zIndex: 2,
  },
  heroSubtitle: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    zIndex: 2,
  },

  signInOptions: { gap: 14, paddingHorizontal: 24 },
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
  socialButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  content: { paddingHorizontal: 24, paddingTop: 16, gap: 18 },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  optional: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
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
  signupButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 4,
  },
  signupButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#0E2D6B" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  switchLink: { alignItems: "center", paddingVertical: 4 },
  switchText: { fontSize: 15, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.7)" },
});
