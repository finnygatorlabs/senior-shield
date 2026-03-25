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
  Image,
  Linking,
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

const APP_VERSION = "1.0.0";
const CONTACT_EMAIL = "admin@finnygator.com";

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

function InfoRow({ label, value, theme, ts }: { label: string; value: string; theme: any; ts: any }) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.infoLabel, { color: theme.textSecondary, fontSize: ts.xs }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text, fontSize: ts.sm }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, logout, updateUser } = useAuth();
  const { prefs, loaded, ts, updatePref } = usePreferences();

  const [nameInput, setNameInput] = useState(prefs.assistant_name);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<TtsVoice | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [deviceInfo, setDeviceInfo] = useState({ platform: "", model: "", osVersion: "" });
  const [editingName, setEditingName] = useState(false);
  const [firstNameEdit, setFirstNameEdit] = useState(user?.first_name || "");
  const [lastNameEdit, setLastNameEdit] = useState(user?.last_name || "");
  const webFileInputRef = React.useRef<HTMLInputElement | null>(null);
  const prevBlobUrlRef = React.useRef<string | null>(null);

  const apiBase = (() => {
    const d = process.env.EXPO_PUBLIC_DOMAIN;
    return d ? `https://${d}` : "";
  })();

  useEffect(() => {
    if (!user?.token) return;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/user/profile`, {
          headers: { Authorization: `Bearer ${user.token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setProfileData(data);
        }
      } catch {}
    })();
  }, [user?.token]);

  useEffect(() => {
    (async () => {
      let platform = Platform.OS;
      let model = "";
      let osVersion = String(Platform.Version || "");
      if (Platform.OS !== "web") {
        try {
          const Device = await import("expo-device");
          model = Device.modelName || Device.deviceName || "";
          platform = Platform.OS;
        } catch {}
      } else if (typeof navigator !== "undefined") {
        const ua = navigator.userAgent;
        if (/iPhone/.test(ua)) { platform = "ios"; model = "iPhone"; }
        else if (/iPad/.test(ua)) { platform = "ios"; model = "iPad"; }
        else if (/Android/.test(ua)) { platform = "android"; model = "Android"; }
        else { platform = "web"; model = "Browser"; }
      }
      setDeviceInfo({ platform, model, osVersion });
    })();
  }, []);

  useEffect(() => {
    return () => {
      if (Platform.OS === "web") {
        if (webFileInputRef.current) {
          try { document.body.removeChild(webFileInputRef.current); } catch {}
          webFileInputRef.current = null;
        }
        if (prevBlobUrlRef.current) {
          URL.revokeObjectURL(prevBlobUrlRef.current);
          prevBlobUrlRef.current = null;
        }
      }
    };
  }, []);

  function pickProfilePhoto() {
    if (Platform.OS === "web") {
      if (!webFileInputRef.current) {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.style.display = "none";
        input.onchange = (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            if (prevBlobUrlRef.current) {
              URL.revokeObjectURL(prevBlobUrlRef.current);
            }
            const url = URL.createObjectURL(file);
            prevBlobUrlRef.current = url;
            setProfilePhoto(url);
          }
          input.value = "";
        };
        document.body.appendChild(input);
        webFileInputRef.current = input;
      }
      webFileInputRef.current.click();
    } else {
      (async () => {
        try {
          const ImagePicker = await import("expo-image-picker");
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert(
              "Photo Access Needed",
              "SeniorShield needs permission to access your photo library so you can set a profile picture. You can enable this in your phone's Settings app.",
              [
                { text: "OK", style: "default" },
                {
                  text: "Open Settings",
                  onPress: () => { try { Linking.openSettings(); } catch {} },
                },
              ]
            );
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
          });
          if (!result.canceled && result.assets[0]) {
            setProfilePhoto(result.assets[0].uri);
          }
        } catch {}
      })();
    }
  }

  async function saveProfileName() {
    const fn = firstNameEdit.trim();
    const ln = lastNameEdit.trim();
    if (!fn) {
      Alert.alert("Name required", "Please enter at least a first name.");
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/user/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}` },
        body: JSON.stringify({ first_name: fn, last_name: ln }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfileData(updated);
        updateUser({ first_name: fn, last_name: ln });
        setEditingName(false);
      } else {
        Alert.alert("Save failed", "Could not update your name. Please try again.");
      }
    } catch {
      Alert.alert("Connection error", "Unable to save your name. Check your internet connection and try again.");
    }
  }

  async function selectAndPreviewVoice(voice: TtsVoice) {
    if (previewingVoice) return;
    handlePrefChange("tts_voice", voice);
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
      const response = await fetch(`${apiBase}/api/auth/account`, {
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

  const serverModel = profileData?.device_model;
  const serverPlatform = profileData?.device_platform;
  const serverOsVer = profileData?.device_os_version;
  const dModel = serverModel || deviceInfo.model;
  const dPlatform = serverPlatform || deviceInfo.platform;
  const dOsVer = serverOsVer || deviceInfo.osVersion;
  const deviceLabel = dModel
    ? `${dModel}${dOsVer ? ` (${dPlatform === "ios" ? "iOS" : dPlatform === "android" ? "Android" : "Web"} ${dOsVer})` : ""}`
    : "Detecting...";

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

      {/* ── PROFILE SECTION ── */}
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>PROFILE</Text>
        <View style={styles.profileSection}>
          <Pressable onPress={pickProfilePhoto} style={styles.profilePhotoWrap}>
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <View style={[styles.profileAvatar, { backgroundColor: "#DBEAFE" }]}>
                <Text style={[styles.profileAvatarText, { fontSize: 28 }]}>
                  {user?.first_name ? user.first_name[0].toUpperCase() : "U"}
                </Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </Pressable>
          <View style={{ flex: 1 }}>
            {editingName ? (
              <View style={{ gap: 6 }}>
                <TextInput
                  style={[styles.nameEditInput, { color: theme.text, borderColor: theme.cardBorder, fontSize: ts.base }]}
                  value={firstNameEdit}
                  onChangeText={setFirstNameEdit}
                  placeholder="First name"
                  placeholderTextColor={theme.textSecondary}
                  autoFocus
                />
                <TextInput
                  style={[styles.nameEditInput, { color: theme.text, borderColor: theme.cardBorder, fontSize: ts.base }]}
                  value={lastNameEdit}
                  onChangeText={setLastNameEdit}
                  placeholder="Last name"
                  placeholderTextColor={theme.textSecondary}
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                  <Pressable
                    onPress={saveProfileName}
                    style={[styles.nameEditBtn, { backgroundColor: "#3B82F6" }]}
                  >
                    <Text style={{ color: "#FFF", fontSize: ts.sm, fontWeight: "600" }}>Save</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setEditingName(false);
                      setFirstNameEdit(user?.first_name || "");
                      setLastNameEdit(user?.last_name || "");
                    }}
                    style={[styles.nameEditBtn, { backgroundColor: theme.cardBorder }]}
                  >
                    <Text style={{ color: theme.text, fontSize: ts.sm }}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable onPress={() => {
                setFirstNameEdit(user?.first_name || "");
                setLastNameEdit(user?.last_name || "");
                setEditingName(true);
              }} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.profileName, { color: theme.text, fontSize: ts.lg }]}>
                  {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Your Account"}
                </Text>
                <Ionicons name="pencil" size={14} color={theme.textSecondary} />
              </Pressable>
            )}
            {!editingName && (
              <View style={[styles.planBadge, { backgroundColor: "#DBEAFE" }]}>
                <Text style={[styles.planBadgeText, { fontSize: ts.xs }]}>Free Plan</Text>
              </View>
            )}
          </View>
          {!editingName && (
            <Pressable onPress={() => router.push("/subscription")} style={styles.upgradeButton}>
              <Text style={[styles.upgradeText, { fontSize: ts.sm }]}>Upgrade</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.profileInfoList}>
          <InfoRow label="Email" value={profileData?.email || "Loading..."} theme={theme} ts={ts} />
          <InfoRow label="Account Type" value={profileData?.user_type === "senior" ? "Senior" : profileData?.user_type === "family" ? "Family Member" : profileData?.user_type || "Senior"} theme={theme} ts={ts} />
          <InfoRow label="Device" value={deviceLabel} theme={theme} ts={ts} />
          <InfoRow label="Plan" value="Free (No Expiration)" theme={theme} ts={ts} />
          <InfoRow label="App Version" value={`SeniorShield v${APP_VERSION}`} theme={theme} ts={ts} />
        </View>
      </View>

      {/* VOICE & AUDIO */}
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>VOICE & AUDIO</Text>

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

        <View style={[styles.voiceScreener, { borderTopColor: theme.border }]}>
          <Text style={[styles.voiceScreenerLabel, { color: theme.textSecondary, fontSize: ts.tiny }]}>
            CHOOSE A VOICE — TAP TO SELECT &amp; HEAR A SAMPLE
          </Text>
          <View style={styles.voiceGrid}>
            {TTS_VOICES.filter(v => v.gender === prefs.preferred_voice).map(v => {
              const isSelected = prefs.tts_voice === v.value;
              const isPreviewing = previewingVoice === v.value;
              return (
                <Pressable
                  key={v.value}
                  onPress={() => selectAndPreviewVoice(v.value)}
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
                        name={isSelected ? "checkmark-circle" : "ellipse-outline"}
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

      {/* LEGAL */}
      <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary, fontSize: ts.tiny }]}>LEGAL & SECURITY</Text>
        <SettingRow icon="lock-closed" label="Privacy Policy" subtitle="GDPR, CCPA & ADA compliant" onPress={() => router.push("/legal?page=privacy")} theme={theme} ts={ts} iconColor="#6366F1" iconBg="#EDE9FE" />
        <SettingRow icon="document-text" label="Terms of Service" onPress={() => router.push("/legal?page=terms")} theme={theme} ts={ts} iconColor="#6366F1" iconBg="#EDE9FE" />
        <SettingRow icon="information-circle" label="Cookie Policy" onPress={() => router.push("/legal?page=cookies")} theme={theme} ts={ts} iconColor="#6366F1" iconBg="#EDE9FE" />
        <SettingRow icon="shield-checkmark" label="Security Checklist" subtitle="AES-256, TLS, audit logs" onPress={() => router.push("/legal?page=security")} theme={theme} ts={ts} iconColor="#6366F1" iconBg="#EDE9FE" />
        <SettingRow
          icon="mail"
          label="Contact Us"
          subtitle={CONTACT_EMAIL}
          onPress={() => router.push("/legal?page=contact")}
          theme={theme}
          ts={ts}
          iconColor="#6366F1"
          iconBg="#EDE9FE"
        />
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

      <Text style={[styles.version, { color: theme.textTertiary, fontSize: ts.xs }]}>
        SeniorShield™ v{APP_VERSION}
      </Text>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20, gap: 16, paddingTop: 16 },
  section: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  profilePhotoWrap: {
    position: "relative",
  },
  profilePhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: { fontFamily: "Inter_700Bold", color: "#2563EB" },
  cameraIcon: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileName: { fontFamily: "Inter_700Bold", marginBottom: 4 },
  nameEditInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: "Inter_500Medium",
  },
  nameEditBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: "center" as const,
  },
  planBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  planBadgeText: { fontFamily: "Inter_600SemiBold", color: "#2563EB" },
  upgradeButton: { backgroundColor: "#2563EB", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  upgradeText: { fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  profileInfoList: {
    borderTopWidth: 0.5,
    borderTopColor: "rgba(0,0,0,0.06)",
    marginHorizontal: 16,
    paddingTop: 4,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  infoLabel: { fontFamily: "Inter_500Medium" },
  infoValue: { fontFamily: "Inter_400Regular", flexShrink: 1, textAlign: "right", maxWidth: "60%" },
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
  version: { fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
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
