import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import PageHeader from "@/components/PageHeader";
import { remindersApi } from "@/services/api";

interface Preset {
  key: string;
  label: string;
  prompt: string;
  icon: string;
}

interface Reminder {
  id: string;
  reminder_key: string;
  label: string;
  prompt: string;
  icon: string;
  is_active: boolean;
  is_custom: boolean;
}

const MAX_ACTIVE = 3;

export default function RemindersScreen() {
  const { theme } = useTheme();
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();

  const [presets, setPresets] = useState<Preset[]>([]);
  const [myReminders, setMyReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customLabel, setCustomLabel] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  const activeCount = myReminders.filter((r) => r.is_active).length;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [presetsRes, remindersRes] = await Promise.all([
        remindersApi.getPresets(user?.token),
        remindersApi.getAll(user?.token),
      ]);
      setPresets(presetsRes.presets || []);
      setMyReminders(remindersRes.reminders || []);
    } catch {
      Alert.alert("Error", "Could not load reminders. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isPresetAdded = (key: string) => myReminders.some((r) => r.reminder_key === key);
  const getReminder = (key: string) => myReminders.find((r) => r.reminder_key === key);

  async function addPreset(preset: Preset) {
    if (activeCount >= MAX_ACTIVE) {
      Alert.alert(
        "Limit Reached",
        `You can have up to ${MAX_ACTIVE} active reminders. Please turn one off before adding another.`
      );
      return;
    }

    try {
      setSaving(true);
      const res = await remindersApi.add(
        {
          reminder_key: preset.key,
          label: preset.label,
          prompt: preset.prompt,
          icon: preset.icon,
        },
        user?.token
      );
      if (res.reminder) {
        setMyReminders((prev) => {
          const existing = prev.findIndex((r) => r.reminder_key === preset.key);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = res.reminder;
            return updated;
          }
          return [...prev, res.reminder];
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.data?.message || "Could not add reminder.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleReminder(reminder: Reminder) {
    const newActive = !reminder.is_active;

    if (newActive && activeCount >= MAX_ACTIVE) {
      Alert.alert(
        "Limit Reached",
        `You can have up to ${MAX_ACTIVE} active reminders. Please turn one off first.`
      );
      return;
    }

    try {
      setToggling(reminder.id);
      const res = await remindersApi.toggle(reminder.id, newActive, user?.token);
      if (res.reminder) {
        setMyReminders((prev) =>
          prev.map((r) => (r.id === reminder.id ? res.reminder : r))
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.data?.message || "Could not toggle reminder.");
    } finally {
      setToggling(null);
    }
  }

  async function removeReminder(reminder: Reminder) {
    Alert.alert("Remove Reminder", `Remove "${reminder.label}" from your list?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await remindersApi.remove(reminder.id, user?.token);
            setMyReminders((prev) => prev.filter((r) => r.id !== reminder.id));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch {
            Alert.alert("Error", "Could not remove reminder.");
          }
        },
      },
    ]);
  }

  async function addCustom() {
    if (!customLabel.trim() || !customPrompt.trim()) {
      Alert.alert("Missing Info", "Please enter both a name and a reminder message.");
      return;
    }

    if (activeCount >= MAX_ACTIVE) {
      Alert.alert(
        "Limit Reached",
        `You can have up to ${MAX_ACTIVE} active reminders. Please turn one off first.`
      );
      return;
    }

    try {
      setSaving(true);
      const key = `custom_${Date.now()}`;
      const res = await remindersApi.add(
        {
          reminder_key: key,
          label: customLabel.trim(),
          prompt: customPrompt.trim(),
          icon: "create-outline",
          is_custom: true,
        },
        user?.token
      );
      if (res.reminder) {
        setMyReminders((prev) => [...prev, res.reminder]);
        setCustomLabel("");
        setCustomPrompt("");
        setShowCustomModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.data?.message || "Could not add custom reminder.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <PageHeader />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent || "#2563EB"} />
          <Text style={[styles.loadingText, { color: theme.textSecondary, fontSize: ts.sm }]}>Loading reminders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + insets.bottom + 24, paddingTop: 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.infoCardHeader}>
            <View style={[styles.infoIconBox, { backgroundColor: (theme.accent || "#2563EB") + "20" }]}>
              <Ionicons name="notifications" size={22} color={theme.accent || "#2563EB"} />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={[styles.infoTitle, { color: theme.text, fontSize: ts.lg }]}>Daily Reminders</Text>
              <Text style={[styles.infoSubtitle, { color: theme.textSecondary, fontSize: ts.sm }]}>
                Choose up to {MAX_ACTIVE} reminders. Your AI assistant will check in with you each day.
              </Text>
            </View>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: activeCount >= MAX_ACTIVE ? "#FEF3C7" : "#D1FAE5" }]}>
            <Text style={[styles.counterText, { color: activeCount >= MAX_ACTIVE ? "#92400E" : "#065F46", fontSize: ts.sm }]}>
              {activeCount} of {MAX_ACTIVE} active
            </Text>
          </View>
        </View>

        {myReminders.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: ts.base }]}>My Reminders</Text>
            {myReminders.map((reminder) => (
              <View
                key={reminder.id}
                style={[
                  styles.reminderCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: reminder.is_active ? (theme.accent || "#2563EB") + "40" : theme.cardBorder,
                  },
                ]}
              >
                <View style={styles.reminderCardTop}>
                  <View style={[styles.reminderIcon, { backgroundColor: reminder.is_active ? (theme.accent || "#2563EB") + "20" : theme.inputBackground }]}>
                    <Ionicons
                      name={reminder.icon as any}
                      size={20}
                      color={reminder.is_active ? (theme.accent || "#2563EB") : theme.textTertiary}
                    />
                  </View>
                  <View style={styles.reminderInfo}>
                    <Text style={[styles.reminderLabel, { color: theme.text, fontSize: ts.base }]}>{reminder.label}</Text>
                    <Text style={[styles.reminderPrompt, { color: theme.textSecondary, fontSize: ts.xs }]} numberOfLines={2}>
                      {reminder.prompt.replace("{name}", user?.first_name || "there")}
                    </Text>
                  </View>
                  <Switch
                    value={reminder.is_active}
                    onValueChange={() => toggleReminder(reminder)}
                    disabled={toggling === reminder.id}
                    trackColor={{ false: theme.inputBackground, true: "#34D399" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                {reminder.is_custom && (
                  <Pressable
                    onPress={() => removeReminder(reminder)}
                    style={[styles.removeBtn, { borderColor: theme.cardBorder }]}
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    <Text style={[styles.removeBtnText, { fontSize: ts.xs }]}>Remove</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text, fontSize: ts.base }]}>Available Reminders</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, fontSize: ts.xs }]}>
            Tap to add a reminder to your daily check-in
          </Text>
          {presets
            .filter((p) => !isPresetAdded(p.key))
            .map((preset) => (
              <Pressable
                key={preset.key}
                onPress={() => addPreset(preset)}
                disabled={saving}
                style={({ pressed }) => [
                  styles.presetCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <View style={[styles.presetIcon, { backgroundColor: (theme.accent || "#2563EB") + "15" }]}>
                  <Ionicons name={preset.icon as any} size={22} color={theme.accent || "#2563EB"} />
                </View>
                <View style={styles.presetInfo}>
                  <Text style={[styles.presetLabel, { color: theme.text, fontSize: ts.base }]}>{preset.label}</Text>
                  <Text style={[styles.presetPrompt, { color: theme.textSecondary, fontSize: ts.xs }]} numberOfLines={2}>
                    "{preset.prompt.replace("{name}", user?.first_name || "there")}"
                  </Text>
                </View>
                <View style={[styles.addBadge, { backgroundColor: (theme.accent || "#2563EB") + "15" }]}>
                  <Ionicons name="add" size={18} color={theme.accent || "#2563EB"} />
                </View>
              </Pressable>
            ))}

          {presets.filter((p) => !isPresetAdded(p.key)).length === 0 && myReminders.length > 0 && (
            <View style={[styles.emptyPresets, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Ionicons name="checkmark-circle" size={24} color="#34D399" />
              <Text style={[styles.emptyPresetsText, { color: theme.textSecondary, fontSize: ts.sm }]}>
                You've added all available reminders!
              </Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={() => setShowCustomModal(true)}
          style={({ pressed }) => [
            styles.customButton,
            {
              borderColor: theme.cardBorder,
              backgroundColor: theme.card,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons name="create-outline" size={20} color={theme.accent || "#2563EB"} />
          <Text style={[styles.customButtonText, { color: theme.accent || "#2563EB", fontSize: ts.base }]}>
            Create Custom Reminder
          </Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showCustomModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text, fontSize: ts.lg }]}>Custom Reminder</Text>
              <Pressable onPress={() => setShowCustomModal(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.modalLabel, { color: theme.textSecondary, fontSize: ts.sm }]}>Reminder Name</Text>
            <TextInput
              style={[styles.modalInput, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.cardBorder, fontSize: ts.base }]}
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder="e.g., Evening Prayer"
              placeholderTextColor={theme.placeholder}
              maxLength={50}
            />

            <Text style={[styles.modalLabel, { color: theme.textSecondary, fontSize: ts.sm }]}>
              What should the assistant say?
            </Text>
            <TextInput
              style={[styles.modalTextArea, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.cardBorder, fontSize: ts.base }]}
              value={customPrompt}
              onChangeText={setCustomPrompt}
              placeholder="e.g., Have you said your evening prayer today?"
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={200}
            />
            <Text style={[styles.charCount, { color: theme.textTertiary, fontSize: ts.xs }]}>
              {customPrompt.length}/200
            </Text>

            <Pressable
              onPress={addCustom}
              disabled={saving || !customLabel.trim() || !customPrompt.trim()}
              style={({ pressed }) => [
                styles.modalSaveButton,
                (saving || !customLabel.trim() || !customPrompt.trim()) && styles.modalSaveDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.modalSaveText, { fontSize: ts.base }]}>Add Reminder</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontFamily: "Inter_400Regular" },

  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  infoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  infoTextBox: { flex: 1 },
  infoTitle: { fontFamily: "Inter_700Bold", marginBottom: 4 },
  infoSubtitle: { fontFamily: "Inter_400Regular", lineHeight: 20 },
  counterBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  counterText: { fontFamily: "Inter_600SemiBold" },

  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  sectionSubtitle: { fontFamily: "Inter_400Regular", marginBottom: 12 },

  reminderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  reminderCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reminderIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  reminderInfo: { flex: 1 },
  reminderLabel: { fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  reminderPrompt: { fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  removeBtnText: { fontFamily: "Inter_500Medium", color: "#EF4444" },

  presetCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  presetIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  presetInfo: { flex: 1 },
  presetLabel: { fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  presetPrompt: { fontFamily: "Inter_400Regular", lineHeight: 18, fontStyle: "italic" },
  addBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyPresets: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyPresetsText: { fontFamily: "Inter_400Regular", flex: 1 },

  customButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginBottom: 8,
  },
  customButtonText: { fontFamily: "Inter_600SemiBold" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: { fontFamily: "Inter_700Bold" },
  modalLabel: { fontFamily: "Inter_500Medium", marginBottom: 8, marginTop: 4 },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  modalTextArea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Inter_400Regular",
    minHeight: 80,
    lineHeight: 22,
  },
  charCount: {
    fontFamily: "Inter_400Regular",
    textAlign: "right",
    marginTop: 4,
    marginBottom: 16,
  },
  modalSaveButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveDisabled: { opacity: 0.5 },
  modalSaveText: { fontFamily: "Inter_700Bold", color: "#FFFFFF" },
});
