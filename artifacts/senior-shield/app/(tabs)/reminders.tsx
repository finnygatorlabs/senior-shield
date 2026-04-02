import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Switch,
  Pressable,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import PageHeader from "@/components/PageHeader";
import ConfirmModal from "@/components/ConfirmModal";
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
  scheduled_time?: string | null;
  frequency?: string | null;
  days_of_week?: string | null;
}

const MAX_ACTIVE = 5;

const FALLBACK_PRESETS: Preset[] = [
  { key: "medication", label: "Medication Reminder", prompt: "Good morning {name}, have you taken your medication today?", icon: "medkit-outline" },
  { key: "family_call", label: "Family Check-in", prompt: "Hi {name}, have you called your family today? It would make their day to hear from you.", icon: "call-outline" },
  { key: "morning_walk", label: "Morning Walk", prompt: "{name}, did you take your morning walk today? A short walk can do wonders for your health.", icon: "walk-outline" },
  { key: "wellness_check", label: "Wellness Check", prompt: "Hi {name}, do you need to check any of the following: Blood Pressure, Insulin, Blood Glucose, Your Weight, or Other today?", icon: "heart-outline" },
  { key: "hydration", label: "Hydration Reminder", prompt: "{name}, have you had enough water today? Staying hydrated is so important.", icon: "water-outline" },
  { key: "meals", label: "Meal Reminder", prompt: "{name}, have you eaten today? A good meal will help keep your energy up.", icon: "restaurant-outline" },
  { key: "appointments", label: "Appointment Check", prompt: "{name}, do you have any appointments today? Let me help you stay on track.", icon: "calendar-outline" },
  { key: "prayer_meditation", label: "Prayer or Meditation", prompt: "Hi {name}, want to set aside some time to pray or meditate today?", icon: "leaf-outline" },
  { key: "gratitude", label: "Gratitude Moment", prompt: "{name}, what's one thing you're grateful for today?", icon: "sunny-outline" },
];

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 15, 30, 45];
const DAYS = [
  { id: 0, short: "Sun", label: "Sunday" },
  { id: 1, short: "Mon", label: "Monday" },
  { id: 2, short: "Tue", label: "Tuesday" },
  { id: 3, short: "Wed", label: "Wednesday" },
  { id: 4, short: "Thu", label: "Thursday" },
  { id: 5, short: "Fri", label: "Friday" },
  { id: 6, short: "Sat", label: "Saturday" },
];

function formatTime12(hh: number, mm: number): string {
  const ampm = hh >= 12 ? "PM" : "AM";
  const h = hh % 12 || 12;
  return `${h}:${mm.toString().padStart(2, "0")} ${ampm}`;
}

function parseScheduledTime(t?: string | null): { hour: number; minute: number; ampm: "AM" | "PM" } {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return { hour: 8, minute: 0, ampm: "AM" };
  const [h24, m] = t.split(":").map(Number);
  const ampm: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12 || 12;
  if (!HOURS.includes(h12)) h12 = 8;
  return { hour: h12, minute: m, ampm };
}

function to24Hour(displayHour: number, ampm: "AM" | "PM"): number {
  if (ampm === "AM") return displayHour === 12 ? 0 : displayHour;
  return displayHour === 12 ? 12 : displayHour + 12;
}

function parseDaysOfWeek(d?: string | null): number[] {
  if (!d) return [1, 2, 3, 4, 5];
  return d.split(",").map(Number).filter((n) => !isNaN(n));
}

function formatFrequencyLabel(freq?: string | null, days?: string | null): string {
  if (!freq || freq === "daily") return "Every day";
  if (freq === "once") return "One time";
  if (freq === "weekly") {
    const dayNums = parseDaysOfWeek(days);
    if (dayNums.length === 7) return "Every day";
    if (dayNums.length === 0) return "No days selected";
    return dayNums.map((d) => DAYS[d]?.short || "").join(", ");
  }
  return freq;
}

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
  const [removingReminder, setRemovingReminder] = useState<Reminder | null>(null);
  const [authError, setAuthError] = useState(false);

  const [schedHour, setSchedHour] = useState(8);
  const [schedMinute, setSchedMinute] = useState(0);
  const [schedAmPm, setSchedAmPm] = useState<"AM" | "PM">("AM");
  const [schedFrequency, setSchedFrequency] = useState<"daily" | "weekly" | "once">("daily");
  const [schedDays, setSchedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [scheduleReminder, setScheduleReminder] = useState<Reminder | null>(null);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const activeCount = myReminders.filter((r) => r.is_active).length;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setAuthError(false);

      const presetsPromise = remindersApi.getPresets().catch(() => null);
      const remindersPromise = remindersApi.getAll(user?.token).catch((err: any) => {
        if (err?.status === 401) setAuthError(true);
        return null;
      });

      const [presetsRes, remindersRes] = await Promise.all([presetsPromise, remindersPromise]);

      const loadedPresets = presetsRes?.presets;
      setPresets(loadedPresets?.length ? loadedPresets : FALLBACK_PRESETS);
      setMyReminders(remindersRes?.reminders || []);
    } catch {
      if (Platform.OS !== "web") {
        Alert.alert("Error", "Could not load reminders. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isPresetAdded = (key: string) => myReminders.some((r) => r.reminder_key === key);

  async function addPreset(preset: Preset) {
    if (schedFrequency === "weekly" && schedDays.length === 0) {
      if (Platform.OS !== "web") {
        Alert.alert("Missing Days", "Please select at least one day for weekly reminders.");
      }
      return;
    }
    if (activeCount >= MAX_ACTIVE) {
      if (Platform.OS !== "web") {
        Alert.alert("Limit Reached", `You can have up to ${MAX_ACTIVE} active reminders. Please turn one off before adding another.`);
      }
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
          scheduled_time: `${to24Hour(schedHour, schedAmPm).toString().padStart(2, "0")}:${schedMinute.toString().padStart(2, "0")}`,
          frequency: schedFrequency,
          days_of_week: schedFrequency === "weekly" ? schedDays.join(",") : undefined,
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
      if (Platform.OS !== "web") {
        Alert.alert("Error", err?.data?.message || "Could not add reminder.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleReminder(reminder: Reminder) {
    const newActive = !reminder.is_active;
    if (newActive && activeCount >= MAX_ACTIVE) {
      if (Platform.OS !== "web") {
        Alert.alert("Limit Reached", `You can have up to ${MAX_ACTIVE} active reminders. Please turn one off first.`);
      }
      return;
    }

    try {
      setToggling(reminder.id);
      const res = await remindersApi.toggle(reminder.id, newActive, user?.token);
      if (res.reminder) {
        setMyReminders((prev) => prev.map((r) => (r.id === reminder.id ? res.reminder : r)));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (err: any) {
      if (Platform.OS !== "web") {
        Alert.alert("Error", err?.data?.message || "Could not toggle reminder.");
      }
    } finally {
      setToggling(null);
    }
  }

  function removeReminder(reminder: Reminder) {
    setRemovingReminder(reminder);
  }

  async function confirmRemoveReminder() {
    if (!removingReminder) return;
    try {
      await remindersApi.remove(removingReminder.id, user?.token);
      setMyReminders((prev) => prev.filter((r) => r.id !== removingReminder.id));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      if (Platform.OS !== "web") {
        Alert.alert("Error", "Could not remove reminder.");
      }
    }
    setRemovingReminder(null);
  }

  function openScheduleModal(reminder: Reminder) {
    const { hour, minute, ampm } = parseScheduledTime(reminder.scheduled_time);
    setSchedHour(hour);
    setSchedMinute(minute);
    setSchedAmPm(ampm);
    setSchedFrequency((reminder.frequency as any) || "daily");
    setSchedDays(parseDaysOfWeek(reminder.days_of_week));
    setScheduleReminder(reminder);
  }

  async function saveSchedule() {
    if (!scheduleReminder) return;
    if (schedFrequency === "weekly" && schedDays.length === 0) {
      if (Platform.OS !== "web") {
        Alert.alert("Missing Days", "Please select at least one day of the week.");
      }
      return;
    }
    try {
      setSavingSchedule(true);
      const timeStr = `${to24Hour(schedHour, schedAmPm).toString().padStart(2, "0")}:${schedMinute.toString().padStart(2, "0")}`;
      const res = await remindersApi.updateSchedule(
        scheduleReminder.id,
        {
          scheduled_time: timeStr,
          frequency: schedFrequency,
          days_of_week: schedFrequency === "weekly" ? schedDays.join(",") : undefined,
        },
        user?.token
      );
      if (res.reminder) {
        setMyReminders((prev) => prev.map((r) => (r.id === scheduleReminder.id ? res.reminder : r)));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setScheduleReminder(null);
    } catch (err: any) {
      if (Platform.OS !== "web") {
        Alert.alert("Error", err?.data?.message || "Could not update schedule.");
      }
    } finally {
      setSavingSchedule(false);
    }
  }

  function resetScheduleFields() {
    setSchedHour(8);
    setSchedMinute(0);
    setSchedAmPm("AM");
    setSchedFrequency("daily");
    setSchedDays([1, 2, 3, 4, 5]);
  }

  async function addCustom() {
    if (!customLabel.trim() || !customPrompt.trim()) {
      if (Platform.OS !== "web") {
        Alert.alert("Missing Info", "Please enter both a name and a reminder message.");
      }
      return;
    }

    if (activeCount >= MAX_ACTIVE) {
      if (Platform.OS !== "web") {
        Alert.alert("Limit Reached", `You can have up to ${MAX_ACTIVE} active reminders. Please turn one off first.`);
      }
      return;
    }

    try {
      setSaving(true);
      const key = `custom_${Date.now()}`;
      const timeStr = `${to24Hour(schedHour, schedAmPm).toString().padStart(2, "0")}:${schedMinute.toString().padStart(2, "0")}`;
      const res = await remindersApi.add(
        {
          reminder_key: key,
          label: customLabel.trim(),
          prompt: customPrompt.trim(),
          icon: "create-outline",
          is_custom: true,
          scheduled_time: timeStr,
          frequency: schedFrequency,
          days_of_week: schedFrequency === "weekly" ? schedDays.join(",") : undefined,
        },
        user?.token
      );
      if (res.reminder) {
        setMyReminders((prev) => [...prev, res.reminder]);
        setCustomLabel("");
        setCustomPrompt("");
        resetScheduleFields();
        setShowCustomModal(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err: any) {
      if (Platform.OS !== "web") {
        Alert.alert("Error", err?.data?.message || "Could not add custom reminder.");
      }
    } finally {
      setSaving(false);
    }
  }

  function toggleDay(d: number) {
    setSchedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  function renderScheduleFields() {
    const accent = theme.accent || "#2563EB";
    return (
      <View>
        <Text style={[styles.modalLabel, { color: theme.textSecondary, fontSize: ts.sm, marginTop: 12 }]}>
          Time
        </Text>
        <Pressable
          onPress={() => setShowTimePicker(!showTimePicker)}
          style={[styles.timePickerBtn, { backgroundColor: theme.inputBackground, borderColor: theme.cardBorder }]}
        >
          <Ionicons name="time-outline" size={22} color={accent} />
          <Text style={[styles.timePickerText, { color: theme.text, fontSize: ts.lg }]}>
            {schedHour}:{schedMinute.toString().padStart(2, "0")} {schedAmPm}
          </Text>
          <Ionicons name={showTimePicker ? "chevron-up" : "chevron-down"} size={20} color={theme.textSecondary} />
        </Pressable>

        {showTimePicker && (
          <View style={[styles.timeGrid, { backgroundColor: theme.inputBackground, borderColor: theme.cardBorder }]}>
            <Text style={[styles.timeGridLabel, { color: theme.textSecondary, fontSize: ts.xs }]}>AM / PM</Text>
            <View style={styles.minuteRow}>
              {(["AM", "PM"] as const).map((ap) => (
                <Pressable
                  key={ap}
                  onPress={() => setSchedAmPm(ap)}
                  style={[
                    styles.timePill,
                    { backgroundColor: schedAmPm === ap ? accent : "transparent", borderColor: schedAmPm === ap ? accent : theme.cardBorder, minWidth: 64 },
                  ]}
                >
                  <Text style={[styles.timePillText, { color: schedAmPm === ap ? "#FFF" : theme.text, fontSize: ts.sm }]}>
                    {ap}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.timeGridLabel, { color: theme.textSecondary, fontSize: ts.xs, marginTop: 8 }]}>Hour</Text>
            <View style={styles.hourGrid}>
              {HOURS.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => setSchedHour(h)}
                  style={[
                    styles.hourPill,
                    { backgroundColor: schedHour === h ? accent : "transparent", borderColor: schedHour === h ? accent : theme.cardBorder },
                  ]}
                >
                  <Text style={[styles.timePillText, { color: schedHour === h ? "#FFF" : theme.text, fontSize: ts.sm }]}>
                    {h}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.timeGridLabel, { color: theme.textSecondary, fontSize: ts.xs, marginTop: 8 }]}>Minute</Text>
            <View style={styles.minuteRow}>
              {MINUTES.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setSchedMinute(m)}
                  style={[
                    styles.minutePill,
                    { backgroundColor: schedMinute === m ? accent : "transparent", borderColor: schedMinute === m ? accent : theme.cardBorder },
                  ]}
                >
                  <Text style={[styles.timePillText, { color: schedMinute === m ? "#FFF" : theme.text, fontSize: ts.sm }]}>
                    :{m.toString().padStart(2, "0")}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Text style={[styles.modalLabel, { color: theme.textSecondary, fontSize: ts.sm, marginTop: 14 }]}>
          How often?
        </Text>
        <View style={styles.freqRow}>
          {([
            { id: "daily" as const, label: "Every Day", icon: "sunny-outline" as const },
            { id: "weekly" as const, label: "Specific Days", icon: "calendar-outline" as const },
            { id: "once" as const, label: "One Time", icon: "flag-outline" as const },
          ]).map((opt) => (
            <Pressable
              key={opt.id}
              onPress={() => setSchedFrequency(opt.id)}
              style={[
                styles.freqPill,
                {
                  backgroundColor: schedFrequency === opt.id ? accent + "18" : "transparent",
                  borderColor: schedFrequency === opt.id ? accent : theme.cardBorder,
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={16}
                color={schedFrequency === opt.id ? accent : theme.textSecondary}
              />
              <Text style={[styles.freqPillText, { color: schedFrequency === opt.id ? accent : theme.text, fontSize: ts.xs }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {schedFrequency === "weekly" && (
          <View style={styles.daysRow}>
            {DAYS.map((day) => (
              <Pressable
                key={day.id}
                onPress={() => toggleDay(day.id)}
                style={[
                  styles.dayBtn,
                  {
                    backgroundColor: schedDays.includes(day.id) ? accent : "transparent",
                    borderColor: schedDays.includes(day.id) ? accent : theme.cardBorder,
                  },
                ]}
              >
                <Text style={[styles.dayBtnText, { color: schedDays.includes(day.id) ? "#FFF" : theme.text, fontSize: ts.sm }]}>
                  {day.short}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <PageHeader screenTitle="Daily Reminders" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent || "#2563EB"} />
          <Text style={[styles.loadingText, { color: theme.textSecondary, fontSize: ts.sm }]}>Loading reminders...</Text>
        </View>
      </View>
    );
  }

  const accent = theme.accent || "#2563EB";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <PageHeader screenTitle="Daily Reminders" />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + insets.bottom + 24, paddingTop: 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.infoCardHeader}>
            <View style={[styles.infoIconBox, { backgroundColor: accent + "20" }]}>
              <Ionicons name="notifications" size={22} color={accent} />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={[styles.infoTitle, { color: theme.text, fontSize: ts.lg }]}>Daily Reminders</Text>
              <Text style={[styles.infoSubtitle, { color: theme.textSecondary, fontSize: ts.sm }]}>
                Choose up to {MAX_ACTIVE} reminders. Set a time and your AI assistant will check in with you.
              </Text>
            </View>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: activeCount >= MAX_ACTIVE ? "#FEF3C7" : "#D1FAE5" }]}>
            <Text style={[styles.counterText, { color: activeCount >= MAX_ACTIVE ? "#92400E" : "#065F46", fontSize: ts.sm }]}>
              {activeCount} of {MAX_ACTIVE} active
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setShowHowItWorks(!showHowItWorks)}
          style={[styles.howItWorksToggle, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
        >
          <View style={[styles.howItWorksIcon, { backgroundColor: "#34D39915" }]}>
            <Ionicons name="information-circle" size={20} color="#34D399" />
          </View>
          <Text style={[styles.howItWorksToggleText, { color: "#34D399", fontSize: ts.sm }]}>
            How do reminders work?
          </Text>
          <Ionicons name={showHowItWorks ? "chevron-up" : "chevron-down"} size={18} color="#34D399" />
        </Pressable>

        {showHowItWorks && (
          <View style={[styles.howItWorksCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.howItWorksStep}>
              <View style={[styles.stepNumber, { backgroundColor: accent + "18" }]}>
                <Text style={[styles.stepNumberText, { color: accent, fontSize: ts.sm }]}>1</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.text, fontSize: ts.sm }]}>
                Pick a reminder from the list below, or create your own with the "Create Custom Reminder" button.
              </Text>
            </View>
            <View style={styles.howItWorksStep}>
              <View style={[styles.stepNumber, { backgroundColor: accent + "18" }]}>
                <Text style={[styles.stepNumberText, { color: accent, fontSize: ts.sm }]}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.text, fontSize: ts.sm }]}>
                Set the time you'd like to be reminded by tapping the clock button on your reminder card.
              </Text>
            </View>
            <View style={styles.howItWorksStep}>
              <View style={[styles.stepNumber, { backgroundColor: accent + "18" }]}>
                <Text style={[styles.stepNumberText, { color: accent, fontSize: ts.sm }]}>3</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.text, fontSize: ts.sm }]}>
                Choose how often: every day, specific days of the week, or just one time.
              </Text>
            </View>
            <View style={styles.howItWorksStep}>
              <View style={[styles.stepNumber, { backgroundColor: "#34D39918" }]}>
                <Text style={[styles.stepNumberText, { color: "#059669", fontSize: ts.sm }]}>
                  <Ionicons name="checkmark" size={14} color="#059669" />
                </Text>
              </View>
              <Text style={[styles.stepText, { color: theme.text, fontSize: ts.sm }]}>
                Your AI assistant will check in with you at your scheduled time. You can have up to {MAX_ACTIVE} active reminders.
              </Text>
            </View>
          </View>
        )}

        {authError && (
          <View style={[styles.authErrorBanner, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
            <Ionicons name="alert-circle" size={20} color="#DC2626" />
            <Text style={[styles.authErrorText, { fontSize: ts.sm }]}>
              Your session has expired. Please sign in again from Settings to manage your reminders.
            </Text>
          </View>
        )}

        {myReminders.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text, fontSize: ts.base }]}>My Reminders</Text>
            {myReminders.map((reminder) => {
              const { hour, minute, ampm } = parseScheduledTime(reminder.scheduled_time);
              const hasSchedule = !!reminder.scheduled_time;
              return (
                <View
                  key={reminder.id}
                  style={[
                    styles.reminderCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: reminder.is_active ? accent + "40" : theme.cardBorder,
                    },
                  ]}
                >
                  <View style={styles.reminderCardTop}>
                    <View style={[styles.reminderIcon, { backgroundColor: reminder.is_active ? accent + "20" : theme.inputBackground }]}>
                      <Ionicons
                        name={reminder.icon as any}
                        size={20}
                        color={reminder.is_active ? accent : theme.textTertiary}
                      />
                    </View>
                    <View style={styles.reminderInfo}>
                      <Text style={[styles.reminderLabel, { color: theme.text, fontSize: ts.base }]}>{reminder.label}</Text>
                      <Text style={[styles.reminderPrompt, { color: theme.textSecondary, fontSize: ts.xs }]} numberOfLines={3}>
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

                  <View style={styles.scheduleRow}>
                    <Pressable
                      onPress={() => openScheduleModal(reminder)}
                      style={[styles.scheduleBtn, { backgroundColor: accent + "10", borderColor: accent + "30" }]}
                    >
                      <Ionicons name="time-outline" size={14} color={accent} />
                      <Text style={[styles.scheduleBtnText, { color: accent, fontSize: ts.xs }]}>
                        {hasSchedule ? `${hour}:${minute.toString().padStart(2, "0")} ${ampm}` : "Set Time"}
                      </Text>
                    </Pressable>
                    {hasSchedule && (
                      <View style={[styles.freqBadge, { backgroundColor: theme.inputBackground }]}>
                        <Ionicons name="repeat-outline" size={12} color={theme.textSecondary} />
                        <Text style={[styles.freqBadgeText, { color: theme.textSecondary, fontSize: ts.xs }]}>
                          {formatFrequencyLabel(reminder.frequency, reminder.days_of_week)}
                        </Text>
                      </View>
                    )}
                    <Pressable
                      onPress={() => removeReminder(reminder)}
                      style={[styles.removeBtn, { borderColor: theme.cardBorder }]}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={[styles.removeBtnText, { fontSize: ts.xs }]}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
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
                style={[
                  styles.presetCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <View style={[styles.presetIcon, { backgroundColor: accent + "15" }]}>
                  <Ionicons name={preset.icon as any} size={22} color={accent} />
                </View>
                <View style={styles.presetInfo}>
                  <Text style={[styles.presetLabel, { color: theme.text, fontSize: ts.base }]}>{preset.label}</Text>
                  <Text style={[styles.presetPrompt, { color: theme.textSecondary, fontSize: ts.xs }]} numberOfLines={3}>
                    "{preset.prompt.replace("{name}", user?.first_name || "there")}"
                  </Text>
                </View>
                <View style={[styles.addBadge, { backgroundColor: accent + "15" }]}>
                  <Ionicons name="add" size={18} color={accent} />
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
          onPress={() => {
            resetScheduleFields();
            setShowCustomModal(true);
          }}
          style={[
            styles.customButton,
            {
              borderColor: theme.cardBorder,
              backgroundColor: theme.card,
            },
          ]}
        >
          <Ionicons name="create-outline" size={20} color={accent} />
          <Text style={[styles.customButtonText, { color: accent, fontSize: ts.base }]}>
            Create Custom Reminder
          </Text>
        </Pressable>
      </ScrollView>

      <Modal visible={showCustomModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text, fontSize: ts.lg }]}>Custom Reminder</Text>
                <Pressable onPress={() => setShowCustomModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </Pressable>
              </View>

              <Text style={[styles.modalLabel, { color: theme.textSecondary, fontSize: ts.sm }]}>Reminder Name</Text>
              <TextInput
                style={[styles.modalInput, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.cardBorder, fontSize: ts.base }]}
                value={customLabel}
                onChangeText={setCustomLabel}
                placeholder="e.g., Daily Journal"
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
                placeholder="e.g., Have you written in your journal today?"
                placeholderTextColor={theme.placeholder}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={200}
              />
              <Text style={[styles.charCount, { color: theme.textTertiary, fontSize: ts.xs }]}>
                {customPrompt.length}/200
              </Text>

              {renderScheduleFields()}

              <Pressable
                onPress={addCustom}
                disabled={saving || !customLabel.trim() || !customPrompt.trim()}
                style={[
                  styles.modalSaveButton,
                  (saving || !customLabel.trim() || !customPrompt.trim()) && styles.modalSaveDisabled,
                ]}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalSaveText, { fontSize: ts.base }]}>Add Reminder</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={scheduleReminder !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: theme.text, fontSize: ts.lg }]}>Set Schedule</Text>
                  {scheduleReminder && (
                    <Text style={[{ color: theme.textSecondary, fontSize: ts.sm, fontFamily: "Inter_400Regular", marginTop: 2 }]}>
                      {scheduleReminder.label}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => setScheduleReminder(null)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </Pressable>
              </View>

              {renderScheduleFields()}

              <Pressable
                onPress={saveSchedule}
                disabled={savingSchedule}
                style={[styles.modalSaveButton, savingSchedule && styles.modalSaveDisabled, { marginTop: 20 }]}
              >
                {savingSchedule ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalSaveText, { fontSize: ts.base }]}>Save Schedule</Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ConfirmModal
        visible={removingReminder !== null}
        title="Remove Reminder?"
        message={removingReminder ? `Remove "${removingReminder.label}" from your daily reminders?` : ""}
        confirmLabel="Remove"
        cancelLabel="Keep"
        destructive
        icon="notifications-off-outline"
        onConfirm={confirmRemoveReminder}
        onCancel={() => setRemovingReminder(null)}
      />
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

  authErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  authErrorText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    color: "#DC2626",
    lineHeight: 20,
  },
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

  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
    flexWrap: "wrap",
  },
  scheduleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  scheduleBtnText: { fontFamily: "Inter_600SemiBold" },
  freqBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  freqBadgeText: { fontFamily: "Inter_400Regular" },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
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
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
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
    marginBottom: 4,
  },
  modalSaveButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  modalSaveDisabled: { opacity: 0.5 },
  modalSaveText: { fontFamily: "Inter_700Bold", color: "#FFFFFF" },

  timePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  timePickerText: { fontFamily: "Inter_700Bold", flex: 1 },
  timeGrid: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeGridLabel: { fontFamily: "Inter_500Medium", marginBottom: 6 },
  timeScroll: { marginBottom: 4 },
  timePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  timePillText: { fontFamily: "Inter_600SemiBold" },
  hourGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hourPill: {
    width: 44,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  minuteRow: {
    flexDirection: "row",
    gap: 8,
  },
  minutePill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  freqRow: {
    flexDirection: "row",
    gap: 8,
  },
  freqPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  freqPillText: { fontFamily: "Inter_600SemiBold" },
  daysRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  dayBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  dayBtnText: { fontFamily: "Inter_600SemiBold" },

  howItWorksToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  howItWorksIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  howItWorksToggleText: { fontFamily: "Inter_600SemiBold", flex: 1 },
  howItWorksCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  howItWorksStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 1,
  },
  stepNumberText: { fontFamily: "Inter_700Bold" },
  stepText: { fontFamily: "Inter_400Regular", flex: 1, lineHeight: 20 },
});
