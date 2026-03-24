import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/PageHeader";
import { usePreferences, DEFAULT_NAMES, Preferences, TTS_VOICES, TtsVoice } from "@/context/PreferencesContext";

function SettingRow({
  icon,
  label,
  subtitle,
  onPress,
  rightContent,
  iconColor = "#2563EB",
  iconBg = "#DBEAFE",
  theme,
  ts,
}: {
  icon: any;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  theme: any;
  ts: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.settingRow, { borderBottomColor: theme.border }]}
      disabled={!onPress && rightContent === undefined}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingLabel, { color: theme.text, fontSize: ts.base }]}>{label}</Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: theme.textSecondary, fontSize: ts.xs }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {rightContent ?? (onPress ? <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} /> : null)}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, logout } = useAuth();
  const { prefs, loaded, ts, updatePref } = usePreferences();

  const [nameInput, setNameInput] = useState(prefs.assistant_name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<TtsVoice | null>(null);

  const apiBase = (() => {
    const d = process.env.EXPO_PUBLIC_DOMAIN;
    return d ? `https://${d}` : "";
  })();

  async function previewVoice(voice: TtsVoice) {
    if (previewingVoice) return;
    setPreviewingVoice(voice);
    try {
      const res = await fetch(`${apiBase}/api/voice/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ text: "Hi there! I'm here to help you today.", voice }),
      });
      if (res.ok) {
        const { audio } = await res.json();
        if (Platform.OS === "web") {
          const el = new (window as any).Audio(`data:audio/mpeg;base64,${audio}`);
          await el.play();
          el.onended = () => setPreviewingVoice(null);
          el.onerror = () => setPreviewingVoice(null);
          return;
        } else {
          const { Audio } = await import("expo-av");
          const { sound } = await Audio.Sound.createAsync(
            { uri: `data:audio/mpeg;base64,${audio}` },
            { shouldPlay: true }
          );
          sound.setOnPlaybackStatusUpdate((s: any) => {
            if (s.didJustFinish) { sound.unloadAsync(); setPreviewingVoice(null); }
          });
          return;
        }
      }
    } catch {}
    setPreviewingVoice(null);
  }

  useEffect(() => {
    setNameInput(prefs.assistant_name);
  }, [prefs.assistant_name]);

  function hapticTap() {
    if (prefs.haptic_feedback && Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function handlePrefChange(key: keyof Preferences, value: any) {
    hapticTap();
    updatePref(key, value);
  }

  function handleLogout() {
    if (Platform.OS !== "web") {
      Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: logout },
      ]);
    } else {
      logout();
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      const response = await fetch(`${base}/api/auth/account`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      if (response.ok) logout();
    } catch {}
    setDeleting(false);
    setConfirmingDelete(false);
  }

  const textSizeLabel =
    prefs.font_size === "extra_large"
      ? "Extra Large"
      : prefs.font_size === "large"
      ? "Large"
      : "Normal";

  if (!loaded) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
    <PageHeader />
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingBottom: tabBarHeight + insets.bottom + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >

      {/* Profile card */}
      <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={[styles.profileAvatar, { backgroundColor: "#DBEAFE" }]}>
          <Text style={[styles.profileAvatarText, { fontSize: ts.xl }]}>
            {user?.first_name ? user.first_name[0].toUpperCase() : "U"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: theme.text, fontSize: ts.md }]}>
            {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Your Account"}
          </Text>
          <View style={[styles.freeBadge, { backgroundColor: "#DBEAFE" }]}>
            <Text style={[styles.freeBadgeText, { fontSize: ts.xs }]}>Free Plan</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push("/subscription")} style={styles.upgradeButton}>
          <Text style={[styles.upgradeText, { fontSize: ts.sm }]}>Upgrade</Text>
        </Pressable>
      </View>

      {/* VOICE & AUDIO */}
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>VOICE & AUDIO</Text>

        {/* Gender toggle */}
        <SettingRow
          icon="mic"
          label="Assistant Voice"
          subtitle={prefs.preferred_voice === "female" ? "Female (Ava)" : "Male (Max)"}
          onPress={() => {
            const newGender = prefs.preferred_voice === "female" ? "male" : "female";
            handlePrefChange("preferred_voice", newGender);
            const defaultVoice = newGender === "female" ? "nova" : "echo";
            handlePrefChange("tts_voice", defaultVoice);
            if (prefs.assistant_name === DEFAULT_NAMES[prefs.preferred_voice]) {
              const newName = DEFAULT_NAMES[newGender];
              handlePrefChange("assistant_name", newName);
              setNameInput(newName);
            }
          }}
          theme={theme}
          ts={ts}
        />

        {/* Voice screener — preview and select any voice for the current gender */}
        <View style={[styles.voiceScreener, { borderTopColor: theme.border }]}>
          <Text style={[styles.voiceScreenerLabel, { color: theme.textSecondary, fontSize: ts.tiny }]}>
            TRY A VOICE — TAP TO PREVIEW, HOLD TO SELECT
          </Text>
          <View style={styles.voiceGrid}>
            {TTS_VOICES.filter(v => v.gender === prefs.preferred_voice).map(v => {
              const isSelected = prefs.tts_voice === v.value;
              const isPreviewing = previewingVoice === v.value;
              return (
                <Pressable
                  key={v.value}
                  onPress={() => previewVoice(v.value)}
                  onLongPress={() => {
                    handlePrefChange("tts_voice", v.value);
                    hapticTap();
                  }}
                  style={[
                    styles.voiceCard,
                    {
                      backgroundColor: isSelected ? "#2563EB" : theme.surface,
                      borderColor: isSelected ? "#2563EB" : theme.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.voiceCardTop}>
                    {isPreviewing ? (
                      <ActivityIndicator size="small" color={isSelected ? "#FFF" : "#2563EB"} />
                    ) : (
                      <Ionicons
                        name={isSelected ? "checkmark-circle" : "play-circle-outline"}
                        size={20}
                        color={isSelected ? "#FFF" : "#2563EB"}
                      />
                    )}
                  </View>
                  <Text style={[styles.voiceCardName, { color: isSelected ? "#FFF" : theme.text, fontSize: ts.sm }]}>
                    {v.label}
                  </Text>
                  <Text style={[styles.voiceCardDesc, { color: isSelected ? "rgba(255,255,255,0.8)" : theme.textSecondary, fontSize: ts.tiny }]}>
                    {v.description}
                  </Text>
                  {isSelected && (
                    <View style={styles.voiceSelectedBadge}>
                      <Text style={{ color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 9 }}>ACTIVE</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.voiceHint, { color: theme.textSecondary, fontSize: ts.tiny }]}>
            Tap to hear • Hold to set as active voice
          </Text>
        </View>

        <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
          <View style={[styles.settingIcon, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="person" size={20} color="#2563EB" />
          </View>
          <View style={styles.settingText}>
            <Text style={[styles.settingLabel, { color: theme.text, fontSize: ts.base }]}>Assistant Name</Text>
            <Text style={[styles.settingSubtitle, { color: theme.textSecondary, fontSize: ts.xs }]}>
              What your assistant is called
            </Text>
          </View>
          <TextInput
            style={[
              styles.nameInput,
              {
                color: theme.text,
                borderColor: "#2563EB",
                backgroundColor: theme.inputBackground,
                fontSize: ts.sm,
              },
            ]}
            value={nameInput}
            onChangeText={setNameInput}
            maxLength={20}
            placeholder={DEFAULT_NAMES[prefs.preferred_voice]}
            placeholderTextColor={theme.placeholder}
            returnKeyType="done"
            onEndEditing={() => {
              const trimmed = nameInput.trim() || DEFAULT_NAMES[prefs.preferred_voice];
              setNameInput(trimmed);
              handlePrefChange("assistant_name", trimmed);
            }}
          />
        </View>

        <SettingRow
          icon="text"
          label="Captions"
          subtitle="Show text for voice responses"
          rightContent={
            <Switch
              value={prefs.captions_enabled}
              onValueChange={v => handlePrefChange("captions_enabled", v)}
              trackColor={{ false: theme.border, true: "#BFDBFE" }}
              thumbColor={prefs.captions_enabled ? "#2563EB" : "#9CA3AF"}
            />
          }
          theme={theme}
          ts={ts}
        />
      </View>

      {/* APPEARANCE */}
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>APPEARANCE</Text>

        <SettingRow
          icon={prefs.color_scheme === "dark" ? "moon" : "sunny"}
          label="Theme"
          subtitle={prefs.color_scheme === "dark" ? "Dark mode" : "Light mode"}
          onPress={() =>
            handlePrefChange("color_scheme", prefs.color_scheme === "dark" ? "light" : "dark")
          }
          iconColor={prefs.color_scheme === "dark" ? "#818CF8" : "#F59E0B"}
          iconBg={prefs.color_scheme === "dark" ? "#EDE9FE" : "#FEF3C7"}
          theme={theme}
          ts={ts}
        />

        <SettingRow
          icon="text-outline"
          label="Text Size"
          subtitle={textSizeLabel}
          onPress={() => {
            const sizes: Preferences["font_size"][] = ["normal", "large", "extra_large"];
            const next = sizes[(sizes.indexOf(prefs.font_size) + 1) % sizes.length];
            handlePrefChange("font_size", next);
          }}
          theme={theme}
          ts={ts}
        />

        <SettingRow
          icon="contrast"
          label="High Contrast"
          subtitle="Bolder, easier-to-read colors"
          rightContent={
            <Switch
              value={prefs.high_contrast_enabled}
              onValueChange={v => handlePrefChange("high_contrast_enabled", v)}
              trackColor={{ false: theme.border, true: "#BFDBFE" }}
              thumbColor={prefs.high_contrast_enabled ? "#2563EB" : "#9CA3AF"}
            />
          }
          theme={theme}
          ts={ts}
        />
      </View>

      {/* ACCESSIBILITY */}
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>ACCESSIBILITY</Text>
        <SettingRow
          icon="phone-portrait"
          label="Haptic Feedback"
          subtitle="Vibration on button taps"
          rightContent={
            <Switch
              value={prefs.haptic_feedback}
              onValueChange={v => handlePrefChange("haptic_feedback", v)}
              trackColor={{ false: theme.border, true: "#BFDBFE" }}
              thumbColor={prefs.haptic_feedback ? "#2563EB" : "#9CA3AF"}
            />
          }
          theme={theme}
          ts={ts}
        />
      </View>

      {/* PRIVACY */}
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>PRIVACY</Text>
        <SettingRow
          icon="analytics"
          label="Usage Analytics"
          subtitle="Help us improve SeniorShield"
          rightContent={
            <Switch
              value={prefs.data_collection_enabled}
              onValueChange={v => handlePrefChange("data_collection_enabled", v)}
              trackColor={{ false: theme.border, true: "#BFDBFE" }}
              thumbColor={prefs.data_collection_enabled ? "#2563EB" : "#9CA3AF"}
            />
          }
          theme={theme}
          ts={ts}
        />
      </View>

      {/* SUPPORT */}
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>SUPPORT</Text>
        <SettingRow icon="help-circle" label="Help & Support" onPress={() => router.push("/support")} theme={theme} ts={ts} />
        <SettingRow icon="shield-checkmark" label="Emergency" iconColor="#EF4444" iconBg="#FEE2E2" onPress={() => router.push("/emergency")} theme={theme} ts={ts} />
        <SettingRow icon="card" label="Subscription" onPress={() => router.push("/subscription")} theme={theme} ts={ts} />
      </View>

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={[styles.logoutText, { fontSize: ts.md }]}>Log Out</Text>
      </Pressable>

      {!confirmingDelete ? (
        <Pressable
          onPress={() => setConfirmingDelete(true)}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
          <Text style={[styles.deleteButtonText, { fontSize: ts.sm }]}>Delete Account</Text>
        </Pressable>
      ) : (
        <View style={styles.deleteConfirmBox}>
          <Text style={[styles.deleteConfirmTitle, { fontSize: ts.md }]}>Delete your account?</Text>
          <Text style={[styles.deleteConfirmSubtitle, { fontSize: ts.sm }]}>
            This will permanently remove all your data and cannot be undone.
          </Text>
          <View style={styles.deleteConfirmRow}>
            <Pressable
              onPress={() => setConfirmingDelete(false)}
              style={[styles.deleteConfirmCancel, { borderColor: theme.border }]}
              disabled={deleting}
            >
              <Text style={[styles.deleteConfirmCancelText, { color: theme.text, fontSize: ts.sm }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleDeleteAccount}
              style={[styles.deleteConfirmYes, deleting && { opacity: 0.6 }]}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={[styles.deleteConfirmYesText, { fontSize: ts.sm }]}>Yes, Delete</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <Text style={[styles.version, { color: theme.textTertiary, fontSize: ts.xs }]}>SeniorShield v1.0.0</Text>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, gap: 16, paddingTop: 16 },
  title: { fontFamily: "Inter_700Bold", marginBottom: 4 },
  profileCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20, borderRadius: 20, borderWidth: 1 },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontFamily: "Inter_700Bold", color: "#2563EB" },
  profileName: { fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  freeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  freeBadgeText: { fontFamily: "Inter_600SemiBold", color: "#2563EB" },
  upgradeButton: { backgroundColor: "#2563EB", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  upgradeText: { fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  section: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14, borderBottomWidth: 0.5 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingText: { flex: 1 },
  settingLabel: { fontFamily: "Inter_500Medium" },
  settingSubtitle: { fontFamily: "Inter_400Regular", marginTop: 2 },
  nameInput: { fontFamily: "Inter_500Medium", borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, width: 100, flexShrink: 0, textAlign: "center" },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 16, borderWidth: 1, paddingVertical: 16 },
  logoutText: { fontFamily: "Inter_600SemiBold", color: "#EF4444" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  deleteButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12 },
  deleteButtonText: { fontFamily: "Inter_400Regular", color: "#9CA3AF" },
  deleteConfirmBox: { borderRadius: 16, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: "#FEF2F2", padding: 20, gap: 8 },
  deleteConfirmTitle: { fontFamily: "Inter_700Bold", color: "#DC2626" },
  deleteConfirmSubtitle: { fontFamily: "Inter_400Regular", color: "#6B7280", lineHeight: 18 },
  deleteConfirmRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  deleteConfirmCancel: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  deleteConfirmCancelText: { fontFamily: "Inter_600SemiBold" },
  deleteConfirmYes: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: "#DC2626", alignItems: "center" },
  deleteConfirmYesText: { fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
  version: { fontFamily: "Inter_400Regular", textAlign: "center" },
  voiceScreener: { borderTopWidth: 0.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  voiceScreenerLabel: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 10 },
  voiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  voiceCard: { borderRadius: 14, borderWidth: 1.5, padding: 12, minWidth: 90, flex: 1, alignItems: "center" },
  voiceCardTop: { height: 24, justifyContent: "center", marginBottom: 4 },
  voiceCardName: { fontFamily: "Inter_600SemiBold", textAlign: "center" },
  voiceCardDesc: { fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 2, lineHeight: 14 },
  voiceSelectedBadge: { backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  voiceHint: { fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 10 },
});
