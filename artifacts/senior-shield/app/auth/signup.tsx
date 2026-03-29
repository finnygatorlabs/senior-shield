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

const USER_TYPES = [
  { value: "senior", label: "Senior (65+)", icon: "person" as const, description: "I want tech help & scam protection" },
  { value: "adult_child", label: "Family Member", icon: "people" as const, description: "I want to monitor a loved one" },
  { value: "staff", label: "Senior Center Staff", icon: "business" as const, description: "I manage a senior care program" },
];

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

  const [step, setStep] = useState<"type" | "details">("type");
  const [userType, setUserType] = useState("senior");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [, googleResponse, googlePromptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
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

  useEffect(() => {
    if (Platform.OS !== "web") return;

    function handleStorage(e: StorageEvent) {
      if (e.key === "seniorshield_google_auth_complete" && e.newValue) {
        refreshUser();
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  function handleGoogleSignIn() {
    setError("");
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

      let popupClosed = false;
      const poll = setInterval(async () => {
        if (popup.closed && !popupClosed) {
          popupClosed = true;
          clearInterval(poll);
          let found = false;
          for (let i = 0; i < 15; i++) {
            await new Promise(r => setTimeout(r, 400));
            const stored = localStorage.getItem("seniorshield_google_auth_complete");
            if (stored) {
              try {
                const userData = JSON.parse(stored);
                if (userData.token) {
                  await AsyncStorage.setItem("seniorshield_user", JSON.stringify(userData));
                  await refreshUser();
                  found = true;
                  break;
                }
              } catch (e) {}
            }
            await refreshUser();
          }
          setSocialLoading(false);
          if (!found) {
            showError("Sign in did not complete. Please try again.");
          }
        }
      }, 300);
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

  const selectedType = USER_TYPES.find(t => t.value === userType)!;

  if (step === "type") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <DecoCircle size={260} top={-80} right={-100} opacity={0.08} />
        <DecoCircle size={140} top={30} right={30} opacity={0.06} />
        <DecoCircle size={300} top={-120} left={-150} opacity={0.06} />
        <DecoLine width={250} top={40} left={-60} rotate="-18deg" opacity={0.08} />
        <DecoLine width={180} top={120} left={width - 100} rotate="22deg" opacity={0.06} />

        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Create account</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.typeContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.typeTopSection}>
            <Text style={styles.typeHeading}>Who are you?</Text>
            <Text style={styles.typeSubheading}>
              This helps us personalise your experience
            </Text>
          </View>

          <View style={styles.typeList}>
            {USER_TYPES.map(type => {
              const selected = userType === type.value;
              return (
                <Pressable
                  key={type.value}
                  onPress={() => {
                    setUserType(type.value);
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.typeCard,
                    selected && styles.typeCardSelected,
                  ]}
                >
                  <View style={[styles.typeIconBg, selected && styles.typeIconBgSelected]}>
                    <Ionicons name={type.icon} size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.typeCardText}>
                    <Text style={styles.typeCardLabel}>{type.label}</Text>
                    <Text style={styles.typeCardDesc}>{type.description}</Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={24} color="#34D399" />}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.signInOptions}>
            <Pressable
              style={[styles.socialButton, styles.googleBtn, socialLoading && styles.disabled]}
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

          {!!info && <InlineInfo message={info} onDismiss={() => setInfo("")} />}
          {!!error && <InlineError message={error} onDismiss={() => setError("")} />}

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
      <DecoCircle size={260} top={-80} right={-100} opacity={0.08} />
      <DecoCircle size={140} top={30} right={30} opacity={0.06} />
      <DecoCircle size={180} top={400} left={-90} opacity={0.04} />
      <DecoLine width={250} top={40} left={-60} rotate="-18deg" opacity={0.08} />

      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => setStep("type")} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Your details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.selectedTypeBadge}>
          <Ionicons name={selectedType.icon} size={16} color="#FFFFFF" />
          <Text style={styles.selectedTypeBadgeText}>{selectedType.label}</Text>
          <Pressable onPress={() => setStep("type")} hitSlop={8}>
            <Text style={styles.changeBadgeLink}>Change</Text>
          </Pressable>
        </View>

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
  typeContent: { paddingHorizontal: 24, paddingTop: 8, gap: 0 },
  typeTopSection: { paddingTop: 8, paddingBottom: 24 },
  typeHeading: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 8, color: "#FFFFFF" },
  typeSubheading: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, color: "rgba(255,255,255,0.7)" },
  typeList: { gap: 12, marginBottom: 28 },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  typeCardSelected: {
    backgroundColor: "rgba(52,211,153,0.15)",
    borderColor: "rgba(52,211,153,0.5)",
  },
  typeIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  typeIconBgSelected: {
    backgroundColor: "rgba(52,211,153,0.25)",
  },
  typeCardText: { flex: 1 },
  typeCardLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 2, color: "#FFFFFF" },
  typeCardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.6)" },
  signInOptions: { gap: 14 },
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
  content: { paddingHorizontal: 24, paddingTop: 16, gap: 18 },
  selectedTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: "flex-start",
    marginBottom: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  selectedTypeBadgeText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  changeBadgeLink: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#34D399", marginLeft: 4 },
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
