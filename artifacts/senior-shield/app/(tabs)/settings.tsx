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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

interface Preferences {
  preferred_voice: string;
  voice_speed: number;
  voice_volume: number;
  color_scheme: string;
  high_contrast_enabled: boolean;
  font_size: string;
  haptic_feedback: boolean;
  captions_enabled: boolean;
  data_collection_enabled: boolean;
}

function SettingRow({
  icon,
  label,
  subtitle,
  value,
  onPress,
  rightContent,
  iconColor = "#2563EB",
  iconBg = "#DBEAFE",
  theme,
}: {
  icon: any;
  label: string;
  subtitle?: string;
  value?: boolean;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  iconColor?: string;
  iconBg?: string;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.settingRow, { borderBottomColor: theme.border }]}
      disabled={!onPress && value === undefined}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingText}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>{label}</Text>
        {subtitle && <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightContent ?? (value !== undefined ? null : <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />)}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, logout } = useAuth();

  const [prefs, setPrefs] = useState<Preferences>({
    preferred_voice: "female",
    voice_speed: 1.0,
    voice_volume: 0.8,
    color_scheme: "light",
    high_contrast_enabled: false,
    font_size: "large",
    haptic_feedback: true,
    captions_enabled: true,
    data_collection_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchPrefs();
  }, []);

  async function fetchPrefs() {
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      const response = await fetch(`${base}/api/user/preferences`, {
        headers: { Authorization: `Bearer ${user?.token}` },
      });
      const data = await response.json();
      if (!data.error) {
        setPrefs({
          preferred_voice: data.preferred_voice || "female",
          voice_speed: parseFloat(data.voice_speed) || 1.0,
          voice_volume: parseFloat(data.voice_volume) || 0.8,
          color_scheme: data.color_scheme || "light",
          high_contrast_enabled: data.high_contrast_enabled || false,
          font_size: data.font_size || "large",
          haptic_feedback: data.haptic_feedback !== false,
          captions_enabled: data.captions_enabled !== false,
          data_collection_enabled: data.data_collection_enabled !== false,
        });
      }
    } catch {}
    setLoading(false);
  }

  async function updatePref(key: keyof Preferences, val: any) {
    const newPrefs = { ...prefs, [key]: val };
    setPrefs(newPrefs);
    if (newPrefs.haptic_feedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      await fetch(`${base}/api/user/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ [key]: val }),
      });
    } catch {}
  }

  function handleLogout() {
    if (Platform.OS !== "web") {
      Alert.alert("Log Out", "Are you sure you want to log out of SeniorShield?", [
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
      const data = await response.json();
      if (response.ok) {
        logout();
      } else {
        if (Platform.OS !== "web") {
          Alert.alert("Error", data.message || "Could not delete account. Please try again.");
        }
      }
    } catch {
      if (Platform.OS !== "web") {
        Alert.alert("Error", "Could not reach server. Please try again.");
      }
    }
    setDeleting(false);
    setConfirmingDelete(false);
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 16),
          paddingBottom: tabBarHeight + insets.bottom + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>

      <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={[styles.profileAvatar, { backgroundColor: "#DBEAFE" }]}>
          <Text style={styles.profileAvatarText}>
            {user?.first_name ? user.first_name[0].toUpperCase() : "U"}
          </Text>
        </View>
        <View>
          <Text style={[styles.profileName, { color: theme.text }]}>
            {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Your Account"}
          </Text>
          <View style={[styles.freeBadge, { backgroundColor: "#DBEAFE" }]}>
            <Text style={styles.freeBadgeText}>Free Plan</Text>
          </View>
        </View>
        <Pressable
          onPress={() => router.push("/subscription")}
          style={styles.upgradeButton}
        >
          <Text style={styles.upgradeText}>Upgrade</Text>
        </Pressable>
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>VOICE & AUDIO</Text>

        <SettingRow
          icon="mic"
          label="Voice Gender"
          subtitle={prefs.preferred_voice === "female" ? "Female voice" : "Male voice"}
          onPress={() => updatePref("preferred_voice", prefs.preferred_voice === "female" ? "male" : "female")}
          theme={theme}
        />
        <SettingRow
          icon="speedometer"
          label="Speaking Speed"
          subtitle={prefs.voice_speed <= 0.8 ? "Slow" : prefs.voice_speed <= 1.0 ? "Normal" : "Fast"}
          onPress={() => {
            const speeds = [0.7, 0.85, 1.0, 1.15, 1.3];
            const current = speeds.findIndex(s => Math.abs(s - prefs.voice_speed) < 0.1);
            const next = speeds[(current + 1) % speeds.length];
            updatePref("voice_speed", next);
          }}
          theme={theme}
        />
        <SettingRow
          icon="text"
          label="Captions"
          subtitle="Show text for voice responses"
          rightContent={
            <Switch
              value={prefs.captions_enabled}
              onValueChange={v => updatePref("captions_enabled", v)}
              trackColor={{ false: theme.border, true: "#BFDBFE" }}
              thumbColor={prefs.captions_enabled ? "#2563EB" : "#9CA3AF"}
            />
          }
          theme={theme}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCESSIBILITY</Text>
        <SettingRow
          icon="text-outline"
          label="Text Size"
          subtitle={prefs.font_size === "extra_large" ? "Extra Large" : prefs.font_size === "large" ? "Large" : "Normal"}
          onPress={() => {
            const sizes = ["normal", "large", "extra_large"];
            const next = sizes[(sizes.indexOf(prefs.font_size) + 1) % sizes.length];
            updatePref("font_size", next);
          }}
          theme={theme}
        />
        <SettingRow
          icon="contrast"
          label="High Contrast"
          subtitle="Easier to read colors"
          rightContent={
            <Switch
              value={prefs.high_contrast_enabled}
              onValueChange={v => updatePref("high_contrast_enabled", v)}
              trackColor={{ false: theme.border, true: "#BFDBFE" }}
              thumbColor={prefs.high_contrast_enabled ? "#2563EB" : "#9CA3AF"}
            />
          }
          theme={theme}
        />
        <SettingRow
          icon="phone-portrait"
          label="Haptic Feedback"
          subtitle="Phone vibrations on taps"
          rightContent={
            <Switch
              value={prefs.haptic_feedback}
              onValueChange={v => updatePref("haptic_feedback", v)}
              trackColor={{ false: theme.border, true: "#BFDBFE" }}
              thumbColor={prefs.haptic_feedback ? "#2563EB" : "#9CA3AF"}
            />
          }
          theme={theme}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PRIVACY</Text>
        <SettingRow
          icon="analytics"
          label="Usage Analytics"
          subtitle="Help us improve SeniorShield"
          rightContent={
            <Switch
              value={prefs.data_collection_enabled}
              onValueChange={v => updatePref("data_collection_enabled", v)}
              trackColor={{ false: theme.border, true: "#BFDBFE" }}
              thumbColor={prefs.data_collection_enabled ? "#2563EB" : "#9CA3AF"}
            />
          }
          theme={theme}
        />
      </View>

      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SUPPORT</Text>
        <SettingRow
          icon="help-circle"
          label="Help & Support"
          onPress={() => router.push("/support")}
          theme={theme}
        />
        <SettingRow
          icon="shield-checkmark"
          label="Emergency"
          iconColor="#EF4444"
          iconBg="#FEE2E2"
          onPress={() => router.push("/emergency")}
          theme={theme}
        />
        <SettingRow
          icon="card"
          label="Subscription"
          onPress={() => router.push("/subscription")}
          theme={theme}
        />
      </View>

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [styles.logoutButton, { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" }, pressed && styles.pressed]}
      >
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </Pressable>

      {!confirmingDelete ? (
        <Pressable
          onPress={() => setConfirmingDelete(true)}
          style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
        >
          <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </Pressable>
      ) : (
        <View style={styles.deleteConfirmBox}>
          <Text style={styles.deleteConfirmTitle}>Delete your account?</Text>
          <Text style={styles.deleteConfirmSubtitle}>This will permanently remove all your data and cannot be undone.</Text>
          <View style={styles.deleteConfirmRow}>
            <Pressable
              onPress={() => setConfirmingDelete(false)}
              style={[styles.deleteConfirmCancel, { borderColor: theme.border }]}
              disabled={deleting}
            >
              <Text style={[styles.deleteConfirmCancelText, { color: theme.text }]}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleDeleteAccount}
              style={[styles.deleteConfirmYes, deleting && { opacity: 0.6 }]}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.deleteConfirmYesText}>Yes, Delete</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      <Text style={[styles.version, { color: theme.textTertiary }]}>SeniorShield v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, gap: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  profileAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#2563EB" },
  profileName: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  freeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  freeBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#2563EB" },
  upgradeButton: { marginLeft: "auto", backgroundColor: "#2563EB", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  upgradeText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  section: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  settingRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14, borderBottomWidth: 0.5 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingText: { flex: 1 },
  settingLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  settingSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
  },
  logoutText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#EF4444" },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  version: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  deleteButtonText: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#9CA3AF" },
  deleteConfirmBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    padding: 20,
    gap: 8,
  },
  deleteConfirmTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#DC2626" },
  deleteConfirmSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: "#6B7280", lineHeight: 18 },
  deleteConfirmRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  deleteConfirmCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  deleteConfirmCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  deleteConfirmYes: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  deleteConfirmYesText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FFFFFF" },
});
