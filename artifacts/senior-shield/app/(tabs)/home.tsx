import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isLoading?: boolean;
}

function VoiceOrb({ onPress, isListening }: { onPress: () => void; isListening: boolean }) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 600 }),
          withTiming(1.0, { duration: 600 })
        ),
        -1,
        false
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.7, { duration: 600 }),
          withTiming(0.3, { duration: 600 })
        ),
        -1,
        false
      );
    } else {
      scale.value = withSpring(1);
      glowOpacity.value = withTiming(0.3);
    }
  }, [isListening]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.orbWrapper, pressed && { transform: [{ scale: 0.95 }] }]}
    >
      <Reanimated.View style={[styles.orbGlow, glowStyle]} />
      <Reanimated.View style={[styles.orb, animStyle]}>
        <Ionicons
          name={isListening ? "stop-circle" : "mic"}
          size={52}
          color="#FFFFFF"
        />
      </Reanimated.View>
    </Pressable>
  );
}

function MessageBubble({ message, theme }: { message: Message; theme: any }) {
  if (message.isUser) {
    return (
      <View style={styles.userBubbleWrapper}>
        <View style={styles.userBubble}>
          <Text style={styles.userBubbleText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.assistantBubbleWrapper}>
      <View style={[styles.assistantIcon, { backgroundColor: "#DBEAFE" }]}>
        <Ionicons name="shield-checkmark" size={16} color="#2563EB" />
      </View>
      <View style={[styles.assistantBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {message.isLoading ? (
          <View style={styles.typingDots}>
            <Text style={[styles.assistantBubbleText, { color: theme.textSecondary }]}>Thinking...</Text>
            <ActivityIndicator size="small" color="#2563EB" style={{ marginLeft: 8 }} />
          </View>
        ) : (
          <Text style={[styles.assistantBubbleText, { color: theme.text }]}>{message.text}</Text>
        )}
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      text: `Hello${user?.first_name ? `, ${user.first_name}` : ""}! I'm SeniorShield, your tech assistant. Tap the microphone and ask me anything — like "How do I send a photo?" or "How do I connect to WiFi?"`,
      isUser: false,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  async function sendMessage(text: string) {
    if (!text.trim() || isSending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      isUser: true,
    };

    const loadingMsg: Message = {
      id: (Date.now() + 1).toString(),
      text: "",
      isUser: false,
      isLoading: true,
    };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInputText("");
    setIsSending(true);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const base = domain ? `https://${domain}` : "";
      const response = await fetch(`${base}/api/voice/process-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ request_text: text.trim() }),
      });

      const data = await response.json();

      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, text: data.response_text || "I'm sorry, I had trouble with that. Please try again.", isLoading: false }
            : m
        )
      );
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === loadingMsg.id
            ? { ...m, text: "I'm sorry, I couldn't connect. Please check your internet and try again.", isLoading: false }
            : m
        )
      );
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  function handleOrbPress() {
    if (isListening) {
      setIsListening(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowTextInput(true);
    } else {
      setIsListening(true);
      setShowTextInput(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  const firstName = user?.first_name || "Friend";

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Good day,</Text>
          <Text style={[styles.name, { color: theme.text }]}>{firstName}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.shieldBadge, { backgroundColor: "#DBEAFE" }]}>
            <Ionicons name="shield-checkmark" size={16} color="#2563EB" />
            <Text style={styles.shieldText}>Protected</Text>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: tabBarHeight + (showTextInput ? 80 : 200) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} theme={theme} />
        ))}
      </ScrollView>

      {!showTextInput && (
        <View style={[styles.orbSection, { bottom: tabBarHeight + insets.bottom + 24 }]}>
          <Text style={[styles.orbHint, { color: theme.textSecondary }]}>
            Tap to ask for help
          </Text>
          <VoiceOrb onPress={handleOrbPress} isListening={isListening} />
        </View>
      )}

      {showTextInput && (
        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              paddingBottom: tabBarHeight + (Platform.OS === "web" ? 34 : insets.bottom) + 8,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              setIsListening(false);
              setShowTextInput(false);
            }}
            style={styles.micButton}
          >
            <Ionicons name="mic-outline" size={24} color="#2563EB" />
          </Pressable>

          <TextInput
            style={[styles.textInput, { backgroundColor: theme.inputBackground, color: theme.text }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your question..."
            placeholderTextColor={theme.placeholder}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage(inputText)}
          />

          <Pressable
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isSending}
            style={({ pressed }) => [
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  greeting: { fontSize: 14, fontFamily: "Inter_400Regular" },
  name: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerRight: {},
  shieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  shieldText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#2563EB" },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  userBubbleWrapper: { alignItems: "flex-end" },
  userBubble: {
    backgroundColor: "#2563EB",
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "80%",
  },
  userBubbleText: { fontSize: 16, fontFamily: "Inter_400Regular", color: "#FFFFFF", lineHeight: 22 },
  assistantBubbleWrapper: { flexDirection: "row", alignItems: "flex-start", gap: 10, maxWidth: "90%" },
  assistantIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  assistantBubble: {
    flex: 1,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  assistantBubbleText: { fontSize: 16, fontFamily: "Inter_400Regular", lineHeight: 24 },
  typingDots: { flexDirection: "row", alignItems: "center" },
  orbSection: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 12,
  },
  orbHint: { fontSize: 15, fontFamily: "Inter_400Regular" },
  orbWrapper: { alignItems: "center", justifyContent: "center" },
  orbGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#2563EB",
  },
  orb: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  inputBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    maxHeight: 100,
    lineHeight: 22,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "#94A3B8" },
  pressed: { opacity: 0.85 },
});
