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
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

const USER_TYPES = [
  { value: "senior", label: "Senior (65+)", icon: "person" as const },
  { value: "adult_child", label: "Family Member", icon: "people" as const },
  { value: "staff", label: "Senior Center Staff", icon: "business" as const },
];

export default function SignupScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [userType, setUserType] = useState("senior");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Signup failed", err.message || "Could not create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignup() {
    Alert.alert(
      "Google Sign-In",
      "Google sign-in requires connecting your Google account. Please ask your family member to help set this up, or use the email option below.",
      [{ text: "OK" }]
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
        <Text style={[styles.title, { color: theme.text }]}>Create your account</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Join thousands of protected seniors
        </Text>
      </View>

      <View style={styles.form}>
        <Pressable
          onPress={handleGoogleSignup}
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
          <Text style={[styles.dividerText, { color: theme.textTertiary }]}>or sign up with email</Text>
          <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>I am a</Text>
          <View style={styles.typeSelector}>
            {USER_TYPES.map(type => (
              <Pressable
                key={type.value}
                onPress={() => {
                  setUserType(type.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.typeOption,
                  { backgroundColor: theme.inputBackground, borderColor: theme.border },
                  userType === type.value && styles.typeOptionSelected,
                ]}
              >
                <Ionicons
                  name={type.icon}
                  size={18}
                  color={userType === type.value ? "#2563EB" : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.typeLabel,
                    { color: theme.textSecondary },
                    userType === type.value && styles.typeLabelSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </Pressable>
            ))}
          </View>
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
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Last Name <Text style={[styles.optional, { color: theme.textTertiary }]}>(optional)</Text></Text>
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
            styles.signupButton,
            pressed && styles.pressed,
            loading && styles.disabled,
          ]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.signupButtonText}>Create Account — Free</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.push("/auth/login")} style={styles.switchLink}>
          <Text style={[styles.switchText, { color: theme.textSecondary }]}>
            Already have an account?{" "}
            <Text style={{ color: "#2563EB", fontFamily: "Inter_600SemiBold" }}>Sign in</Text>
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
  header: { marginTop: 16, marginBottom: 28 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 8 },
  subtitle: { fontSize: 16, fontFamily: "Inter_400Regular" },
  form: { gap: 18 },
  field: { gap: 8 },
  label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  optional: { fontSize: 12, fontFamily: "Inter_400Regular" },
  typeSelector: { gap: 8 },
  typeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  typeOptionSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#DBEAFE",
  },
  typeLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  typeLabelSelected: { color: "#2563EB", fontFamily: "Inter_600SemiBold" },
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
  switchLink: { alignItems: "center", paddingVertical: 8 },
  switchText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
