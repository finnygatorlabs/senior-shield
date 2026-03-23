import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";

const USER_TYPES = [
  { value: "senior", label: "Senior (65+)", icon: "person" as const, description: "I want tech help & scam protection" },
  { value: "adult_child", label: "Family Member", icon: "people" as const, description: "I want to monitor a loved one" },
  { value: "staff", label: "Senior Center Staff", icon: "business" as const, description: "I manage a senior care program" },
];

export default function SignupScreen() {
  const { theme } = useTheme();
  const { signup, loginWithGoogle } = useAuth();
  const { request, response, promptAsync, getUserInfo, isConfigured } = useGoogleAuth();

  const [step, setStep] = useState<"type" | "details">("type");
  const [userType, setUserType] = useState("senior");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleSuccess(authentication.accessToken);
      }
    }
  }, [response]);

  async function handleGoogleSuccess(accessToken: string) {
    setGoogleLoading(true);
    try {
      await loginWithGoogle(accessToken, userType);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Google sign-in failed", err.message || "Please try again or use email instead.");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGooglePress() {
    if (!isConfigured) {
      Alert.alert("Coming Soon", "Google sign-in is being set up. Please use email for now.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await promptAsync();
  }

  async function handleSignup() {
    if (!email || !password || !firstName) {
      Alert.alert("Missing info", "Please fill in your first name, email, and password.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Password too short", "Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      await signup(email.trim().toLowerCase(), password, userType, firstName, lastName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({
        pathname: "/auth/verify-email",
        params: { email: email.trim().toLowerCase() },
      });
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Signup failed", err.message || "Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const selectedType = USER_TYPES.find(t => t.value === userType)!;

  if (step === "type") {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Create account</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.typeContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.typeTopSection}>
            <Text style={[styles.typeHeading, { color: theme.text }]}>Who are you?</Text>
            <Text style={[styles.typeSubheading, { color: theme.textSecondary }]}>
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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: selected ? "#DBEAFE" : theme.card,
                      borderColor: selected ? "#2563EB" : theme.cardBorder,
                    },
                  ]}
                >
                  <View style={[styles.typeIconBg, { backgroundColor: selected ? "#2563EB" : theme.inputBackground }]}>
                    <Ionicons name={type.icon} size={24} color={selected ? "#FFFFFF" : theme.textSecondary} />
                  </View>
                  <View style={styles.typeCardText}>
                    <Text style={[styles.typeCardLabel, { color: selected ? "#1D4ED8" : theme.text }]}>
                      {type.label}
                    </Text>
                    <Text style={[styles.typeCardDesc, { color: selected ? "#3B82F6" : theme.textSecondary }]}>
                      {type.description}
                    </Text>
                  </View>
                  {selected && <Ionicons name="checkmark-circle" size={24} color="#2563EB" />}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.signInOptions}>
            <Pressable
              style={({ pressed }) => [styles.googleButton, pressed && styles.pressed, googleLoading && styles.disabled]}
              onPress={handleGooglePress}
              disabled={googleLoading || !request}
            >
              {googleLoading ? (
                <ActivityIndicator color="#374151" />
              ) : (
                <>
                  <View style={styles.googleIconCircle}>
                    <Text style={styles.googleG}>G</Text>
                  </View>
                  <Text style={[styles.googleButtonText, { color: theme.text }]}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textTertiary }]}>or use email</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <Pressable
              style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setStep("details");
              }}
            >
              <Text style={styles.continueButtonText}>Continue with Email</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          <Pressable onPress={() => router.push("/auth/login")} style={styles.switchLink}>
            <Text style={[styles.switchText, { color: theme.textSecondary }]}>
              Already have an account?{" "}
              <Text style={{ color: "#2563EB", fontFamily: "Inter_600SemiBold" }}>Sign in</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => setStep("type")} style={styles.backButton} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Your details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.selectedTypeBadge, { backgroundColor: "#DBEAFE" }]}>
          <Ionicons name={selectedType.icon} size={16} color="#2563EB" />
          <Text style={styles.selectedTypeBadgeText}>{selectedType.label}</Text>
          <Pressable onPress={() => setStep("type")} hitSlop={8}>
            <Text style={styles.changeBadgeLink}>Change</Text>
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>First Name</Text>
          <View style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Ionicons name="person-outline" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Jane"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="words"
              returnKeyType="next"
              autoFocus
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>
            Last Name <Text style={[styles.optional, { color: theme.textTertiary }]}>(optional)</Text>
          </Text>
          <View style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Ionicons name="person-outline" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Smith"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Email Address</Text>
          <View style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Ionicons name="mail-outline" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={email}
              onChangeText={setEmail}
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
          <Text style={[styles.label, { color: theme.text }]}>Password</Text>
          <View style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <Ionicons name="lock-closed-outline" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 characters"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSignup}
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

        <Pressable
          style={({ pressed }) => [styles.signupButton, pressed && styles.pressed, loading && styles.disabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFFFFF" /> : (
            <Text style={styles.signupButtonText}>Create Account — It's Free</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/auth/login")} style={styles.switchLink}>
          <Text style={[styles.switchText, { color: theme.textSecondary }]}>
            Already have an account?{" "}
            <Text style={{ color: "#2563EB", fontFamily: "Inter_600SemiBold" }}>Sign in</Text>
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
  typeContent: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 32, gap: 0 },
  typeTopSection: { paddingTop: 8, paddingBottom: 24 },
  typeHeading: { fontSize: 26, fontFamily: "Inter_700Bold", marginBottom: 8 },
  typeSubheading: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  typeList: { gap: 12, marginBottom: 28 },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 16,
    borderWidth: 2,
    padding: 18,
  },
  typeIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  typeCardText: { flex: 1 },
  typeCardLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  typeCardDesc: { fontSize: 13, fontFamily: "Inter_400Regular" },
  signInOptions: { gap: 14 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
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
  continueButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  continueButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40, gap: 18 },
  selectedTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  selectedTypeBadgeText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#1D4ED8" },
  changeBadgeLink: { fontSize: 13, fontFamily: "Inter_500Medium", color: "#3B82F6", marginLeft: 4 },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  optional: { fontSize: 12, fontFamily: "Inter_400Regular" },
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
  signupButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 4,
  },
  signupButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  switchLink: { alignItems: "center", paddingVertical: 4 },
  switchText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
