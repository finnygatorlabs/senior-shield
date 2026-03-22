import React, { useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

export default function LoginScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Missing info", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Login failed", err.message || "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    Alert.alert(
      "Google Sign-In",
      "Google sign-in requires connecting your Google account. Please ask your family member to help set this up, or use your email and password below.",
      [{ text: "OK" }]
    );
  }

  function handleForgotPassword() {
    Alert.prompt(
      "Forgot Password?",
      "Enter your email address and we'll send you a link to reset your password.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Reset Link",
          onPress: async (inputEmail?: string) => {
            if (!inputEmail?.trim()) {
              Alert.alert("Email required", "Please enter your email address.");
              return;
            }
            try {
              const domain = process.env.EXPO_PUBLIC_DOMAIN;
              const base = domain ? `https://${domain}` : "";
              await fetch(`${base}/api/auth/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: inputEmail.trim().toLowerCase() }),
              });
              Alert.alert(
                "Check your email",
                `If an account exists for ${inputEmail.trim()}, you'll receive a password reset link shortly.`
              );
            } catch {
              Alert.alert(
                "Check your email",
                "If an account exists, you'll receive a password reset link shortly."
              );
            }
          },
        },
      ],
      "plain-text",
      email
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 },
      ]}
      keyboardShouldPersistTaps="handled"
      horizontal={false}
      showsHorizontalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>

      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: "#DBEAFE" }]}>
          <Ionicons name="shield-checkmark" size={36} color="#2563EB" />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Sign in to SeniorShield</Text>
      </View>

      <View style={styles.form}>
        <Pressable
          onPress={handleGoogleLogin}
          style={({ pressed }) => [
            styles.googleButton,
            { backgroundColor: theme.card, borderColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.googleIcon}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text style={[styles.googleButtonText, { color: theme.text }]}>Continue with Google</Text>
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
          <View style={styles.passwordLabelRow}>
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
              onChangeText={setPassword}
              placeholder="Your password"
              placeholderTextColor={theme.placeholder}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={theme.textTertiary}
              />
            </Pressable>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.loginButton,
            pressed && styles.pressed,
            loading && styles.disabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/auth/signup")} style={styles.switchLink}>
          <Text style={[styles.switchText, { color: theme.textSecondary }]}>
            Don't have an account?{" "}
            <Text style={{ color: "#2563EB", fontFamily: "Inter_600SemiBold" }}>Sign up</Text>
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  header: { alignItems: "center", marginTop: 24, marginBottom: 36 },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: "Inter_400Regular" },
  form: { gap: 18 },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  passwordLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  forgotLink: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "#2563EB",
  },
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
  eyeButton: { padding: 4 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  googleG: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 16,
  },
  googleButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  loginButton: {
    backgroundColor: "#2563EB",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 4,
  },
  loginButtonText: { fontSize: 17, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.6 },
  switchLink: { alignItems: "center", paddingVertical: 8 },
  switchText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
