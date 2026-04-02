import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { supportApi } from "@/services/api";

const FAQ = [
  {
    question: "How do I use the voice assistant?",
    answer: "Tap the blue microphone button on the Home screen, then type or speak your question. Examples: 'How do I send a photo?', 'What is WiFi?', 'How do I video call my family?'",
  },
  {
    question: "What messages should I check for scams?",
    answer: "Check any message that asks for money, gift cards, your Social Security Number, bank information, or passwords. Also check messages that say you've won a prize or that there's an urgent problem with your account.",
  },
  {
    question: "How do family alerts work?",
    answer: "When SeniorShield detects a high-risk scam directed at you, it automatically sends a message to all your family members so they can help you stay safe.",
  },
  {
    question: "Is my information private?",
    answer: "Yes! We take privacy very seriously. Your messages are analyzed securely and never shared with third parties. You can control what data we collect in Settings.",
  },
  {
    question: "How do I add a family member?",
    answer: "Go to the Family tab and tap the + button. Enter your family member's email address and they will receive an invitation to join your SeniorShield network.",
  },
  {
    question: "How do reminders work?",
    answer: "Go to the Reminders tab to choose from preset reminders (medication, hydration, wellness, etc.) or create your own. For each reminder, you can set the exact time you want to be notified, choose how often (every day, specific days, or one time only), and pick which days of the week. Your AI assistant will check in with you at the scheduled time. You can have up to 3 active reminders at once.",
  },
  {
    question: "What is the Pro plan?",
    answer: "Pro gives you unlimited voice assistant questions, advanced scam detection, up to 10 family members, and priority support for just $4.99/month or $39.99/year.",
  },
];

function FaqItem({ item, theme }: { item: typeof FAQ[0]; theme: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.faqItem, { borderColor: theme.border }]}>
      <Pressable
        onPress={() => { setExpanded(!expanded); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
        style={styles.faqQuestion}
      >
        <Text style={[styles.faqQuestionText, { color: theme.text }]}>{item.question}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={theme.textSecondary}
        />
      </Pressable>
      {expanded && (
        <View style={[styles.faqAnswer, { backgroundColor: theme.surfaceSecondary }]}>
          <Text style={[styles.faqAnswerText, { color: theme.textSecondary }]}>{item.answer}</Text>
        </View>
      )}
    </View>
  );
}

export default function SupportScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitTicket() {
    if (!subject.trim() || !message.trim()) {
      Alert.alert("Missing info", "Please fill in both subject and message.");
      return;
    }

    setSubmitting(true);
    try {
      await supportApi.submitTicket(subject.trim(), message.trim(), user?.token);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Message Sent!",
        "We've received your message and will respond within 24 hours.",
        [{ text: "OK", onPress: () => { setSubject(""); setMessage(""); } }]
      );
    } catch {
      Alert.alert("Error", "Could not send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + (Platform.OS === "web" ? 24 : 16), paddingBottom: insets.bottom + 40 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>

      <Text style={[styles.title, { color: theme.text }]}>Help & Support</Text>
      <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
        We're here to help! Find answers below or send us a message.
      </Text>

      <View style={[styles.contactCard, { backgroundColor: "#DBEAFE", borderColor: "#BFDBFE" }]}>
        <View style={styles.contactRow}>
          <Ionicons name="time" size={20} color="#2563EB" />
          <Text style={[styles.contactText, { color: "#1D4ED8" }]}>Support hours: Mon–Fri, 8am–8pm EST</Text>
        </View>
        <View style={styles.contactRow}>
          <Ionicons name="mail" size={20} color="#2563EB" />
          <Text style={[styles.contactText, { color: "#1D4ED8" }]}>support@seniorshield.app</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Frequently Asked Questions</Text>
      <View style={[styles.faqList, { borderColor: theme.border }]}>
        {FAQ.map((item, i) => (
          <FaqItem key={i} item={item} theme={theme} />
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Send Us a Message</Text>
      <View style={[styles.contactForm, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Subject</Text>
          <View style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={subject}
              onChangeText={setSubject}
              placeholder="What do you need help with?"
              placeholderTextColor={theme.placeholder}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Message</Text>
          <View style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.border, alignItems: "flex-start" }]}>
            <TextInput
              style={[styles.textInput, styles.textArea, { color: theme.text }]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us more about your issue..."
              placeholderTextColor={theme.placeholder}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.submitButton, submitting && styles.disabled, pressed && styles.pressed]}
          onPress={submitTicket}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Send Message</Text>
            </>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  backButton: { width: 44, height: 44, justifyContent: "center" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  contactCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  contactRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  contactText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  sectionTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  faqList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  faqItem: { borderBottomWidth: 0.5 },
  faqQuestion: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  faqQuestionText: { flex: 1, fontSize: 15, fontFamily: "Inter_500Medium", lineHeight: 22 },
  faqAnswer: { paddingHorizontal: 16, paddingBottom: 16 },
  faqAnswerText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  contactForm: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 16 },
  field: { gap: 8 },
  fieldLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  textInput: { fontSize: 16, fontFamily: "Inter_400Regular" },
  textArea: { minHeight: 100, lineHeight: 24 },
  submitButton: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitButtonText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  disabled: { opacity: 0.6 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
