import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
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
import { usePreferences } from "@/context/PreferencesContext";

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  isLoading?: boolean;
}

interface ConvTurn {
  role: "user" | "assistant";
  content: string;
}

function VoiceOrb({
  onPress,
  isListening,
  idle,
}: {
  onPress: () => void;
  isListening: boolean;
  idle: boolean;
}) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);

  useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(
        withSequence(withTiming(1.12, { duration: 480 }), withTiming(1.0, { duration: 480 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.85, { duration: 480 }), withTiming(0.35, { duration: 480 })),
        -1, false
      );
    } else if (idle) {
      scale.value = withRepeat(
        withSequence(withTiming(1.05, { duration: 1400 }), withTiming(1.0, { duration: 1400 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.45, { duration: 1400 }), withTiming(0.15, { duration: 1400 })),
        -1, false
      );
    } else {
      scale.value = withSpring(1);
      glowOpacity.value = withTiming(0.2);
    }
  }, [isListening, idle]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.orbWrapper, pressed && { opacity: 0.85 }]}
    >
      <Reanimated.View style={[styles.orbGlow, glowStyle]} />
      <Reanimated.View style={[styles.orb, animStyle]}>
        <Ionicons name={isListening ? "stop-circle" : "mic"} size={56} color="#FFFFFF" />
      </Reanimated.View>
    </Pressable>
  );
}

function MessageBubble({
  message,
  theme,
  ts,
  onSpeak,
}: {
  message: Message;
  theme: any;
  ts: any;
  onSpeak?: (text: string) => void;
}) {
  if (message.isUser) {
    return (
      <View style={styles.userBubbleWrapper}>
        <View style={styles.userBubble}>
          <Text style={[styles.userBubbleText, { fontSize: ts.base, lineHeight: ts.base * 1.5 }]}>
            {message.text}
          </Text>
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
            <Text style={[styles.assistantBubbleText, { color: theme.textSecondary, fontSize: ts.base }]}>
              Thinking…
            </Text>
            <ActivityIndicator size="small" color="#2563EB" style={{ marginLeft: 8 }} />
          </View>
        ) : (
          <>
            <Text style={[styles.assistantBubbleText, { color: theme.text, fontSize: ts.base, lineHeight: ts.base * 1.6 }]}>
              {message.text}
            </Text>
            {onSpeak && (
              <Pressable onPress={() => onSpeak(message.text)} style={styles.replayButton}>
                <Ionicons name="volume-medium-outline" size={14} color="#2563EB" />
                <Text style={[styles.replayText, { fontSize: ts.xs }]}>Replay</Text>
              </Pressable>
            )}
          </>
        )}
      </View>
    </View>
  );
}

function getWebSpeech(): any {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { prefs, ts } = usePreferences();

  const assistantName = prefs.assistant_name;
  const apiBase = (() => {
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    return domain ? `https://${domain}` : "";
  })();
  const authHeader = { Authorization: `Bearer ${user?.token}` };

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationHistory, setConversationHistory] = useState<ConvTurn[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported] = useState(() => !!getWebSpeech());
  const [greeted, setGreeted] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speakText = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsSpeaking(true);

    if (Platform.OS === "web") {
      try {
        const voice = prefs.preferred_voice === "female" ? "nova" : "onyx";
        const res = await fetch(`${apiBase}/api/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ text: text.slice(0, 800), voice }),
        });
        if (res.ok) {
          const { audio } = await res.json();
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          const src = `data:audio/mpeg;base64,${audio}`;
          const el = new Audio(src);
          audioRef.current = el;
          el.onended = () => { setIsSpeaking(false); audioRef.current = null; };
          el.onerror = () => { setIsSpeaking(false); audioRef.current = null; };
          await el.play();
          return;
        }
      } catch {}
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.95;
        utter.onend = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utter);
        return;
      }
    } else {
      try {
        const { Audio } = await import("expo-av");
        const voice = prefs.preferred_voice === "female" ? "nova" : "onyx";
        const res = await fetch(`${apiBase}/api/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeader },
          body: JSON.stringify({ text: text.slice(0, 800), voice }),
        });
        if (res.ok) {
          const { audio } = await res.json();
          const { sound } = await Audio.Sound.createAsync(
            { uri: `data:audio/mpeg;base64,${audio}` },
            { shouldPlay: true }
          );
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.didJustFinish) {
              sound.unloadAsync();
              setIsSpeaking(false);
            }
          });
          return;
        }
      } catch {}
      const Speech = await import("expo-speech");
      Speech.default.stop();
      Speech.default.speak(text, {
        rate: 0.95,
        pitch: prefs.preferred_voice === "female" ? 1.1 : 0.9,
        onDone: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
      return;
    }
    setIsSpeaking(false);
  }, [prefs.preferred_voice, apiBase, user?.token]);

  const stopSpeaking = useCallback(() => {
    if (Platform.OS === "web") {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      window.speechSynthesis?.cancel();
    } else {
      import("expo-speech").then(m => m.default.stop()).catch(() => {});
      import("expo-av").then(({ Audio }) => Audio.setAudioModeAsync({ allowsRecordingIOS: false })).catch(() => {});
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    if (!greeted && assistantName) {
      const greeting = `Hi${user?.first_name ? ` ${user.first_name}` : ""}! I'm ${assistantName}, your personal SeniorShield assistant. I'm here to help with anything — phone tips, safety questions, or just a friendly chat. Go ahead and tap the microphone and ask me anything!`;
      setMessages([{ id: "0", text: greeting, isUser: false }]);
      setConversationHistory([{ role: "assistant", content: greeting }]);
      setGreeted(true);
      setTimeout(() => speakText(greeting), 800);
    }
  }, [assistantName, greeted]);

  async function sendMessage(text: string) {
    if (!text.trim() || isSending) return;
    stopSpeaking();

    const userMsg: Message = { id: Date.now().toString(), text: text.trim(), isUser: true };
    const loadingId = (Date.now() + 1).toString();
    const loadingMsg: Message = { id: loadingId, text: "", isUser: false, isLoading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInputText("");
    setInterimText("");
    setIsSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const updatedHistory: ConvTurn[] = [...conversationHistory, { role: "user", content: text.trim() }];

    try {
      const res = await fetch(`${apiBase}/api/voice/process-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          request_text: text.trim(),
          conversation_history: updatedHistory.slice(-12),
        }),
      });
      const data = await res.json();
      const replyText = data.response_text || "I'm sorry, I had a little trouble with that. Could you try again?";

      setMessages(prev =>
        prev.map(m => m.id === loadingId ? { ...m, text: replyText, isLoading: false } : m)
      );
      setConversationHistory([...updatedHistory, { role: "assistant", content: replyText }]);
      speakText(replyText);
    } catch {
      const errText = "I'm sorry, I couldn't connect just now. Please check your internet and try again!";
      setMessages(prev =>
        prev.map(m => m.id === loadingId ? { ...m, text: errText, isLoading: false } : m)
      );
      speakText(errText);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }

  function stopRecognition() {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setIsListening(false);
  }

  function startVoiceRecognition() {
    const SpeechRecognition = getWebSpeech();
    if (!SpeechRecognition) { setShowTextInput(true); return; }
    stopSpeaking();
    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognitionRef.current = recognition;
      recognition.onstart = () => {
        setIsListening(true);
        setInterimText("");
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      };
      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += t;
          else interim += t;
        }
        setInterimText(final || interim);
      };
      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        setInterimText(prev => {
          if (prev.trim()) { sendMessage(prev); return ""; }
          setShowTextInput(true);
          return "";
        });
      };
      recognition.onerror = () => {
        setIsListening(false);
        recognitionRef.current = null;
        setInterimText("");
        setShowTextInput(true);
      };
      recognition.start();
    } catch {
      setShowTextInput(true);
    }
  }

  function handleOrbPress() {
    if (isListening) {
      stopRecognition();
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } else {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      startVoiceRecognition();
    }
  }

  const firstName = user?.first_name || "Friend";
  const hintText = isListening
    ? `Listening… speak to ${assistantName}`
    : `Tap to speak with ${assistantName}`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 0) }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary, fontSize: ts.xs }]}>Good day,</Text>
          <Text style={[styles.name, { color: theme.text, fontSize: ts.h2 }]}>{firstName}</Text>
        </View>
        <View style={[styles.shieldBadge, { backgroundColor: "#DBEAFE" }]}>
          <Ionicons name="shield-checkmark" size={15} color="#2563EB" />
          <Text style={[styles.shieldText, { fontSize: ts.sm }]}>Protected</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[
          styles.messagesContent,
          { paddingBottom: tabBarHeight + (showTextInput ? 80 : 280) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            theme={theme}
            ts={ts}
            onSpeak={!msg.isUser && !msg.isLoading ? speakText : undefined}
          />
        ))}
      </ScrollView>

      {!showTextInput && (
        <View style={[styles.orbSection, { bottom: tabBarHeight + insets.bottom + 16 }]}>
          {isListening && interimText ? (
            <View style={[styles.interimBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={[styles.interimText, { color: theme.text, fontSize: ts.sm }]}>
                {interimText}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.orbHint,
                {
                  color: isListening ? "#2563EB" : theme.textSecondary,
                  fontSize: ts.sm,
                },
              ]}
              numberOfLines={1}
            >
              {isListening ? "🔴 " : "🎤 "}{hintText}
            </Text>
          )}

          <VoiceOrb onPress={handleOrbPress} isListening={isListening} idle={!isListening} />

          <Pressable
            onPress={() => { setShowTextInput(true); stopRecognition(); }}
            style={styles.keyboardToggle}
          >
            <Text style={[styles.keyboardToggleText, { color: theme.textSecondary, fontSize: ts.xs }]}>
              Type instead
            </Text>
          </Pressable>
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
              setShowTextInput(false);
              setInputText("");
              setInterimText("");
              startVoiceRecognition();
            }}
            style={styles.micButton}
          >
            <Ionicons name="mic" size={26} color="#2563EB" />
          </Pressable>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: theme.inputBackground,
                color: theme.text,
                fontSize: ts.base,
              },
            ]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Ask ${assistantName} anything…`}
            placeholderTextColor={theme.placeholder}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(inputText)}
            autoFocus
          />
          <Pressable
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isSending}
            style={({ pressed }) => [
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={20} color="#FFFFFF" />
            )}
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
  greeting: { fontFamily: "Inter_400Regular" },
  name: { fontFamily: "Inter_700Bold" },
  shieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  shieldText: { fontFamily: "Inter_600SemiBold", color: "#2563EB" },
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
  userBubbleText: { fontFamily: "Inter_400Regular", color: "#FFFFFF" },
  assistantBubbleWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    maxWidth: "90%",
  },
  assistantIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    flexShrink: 0,
  },
  assistantBubble: {
    flex: 1,
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  assistantBubbleText: { fontFamily: "Inter_400Regular" },
  replayButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
  },
  replayText: { fontFamily: "Inter_500Medium", color: "#2563EB" },
  typingDots: { flexDirection: "row", alignItems: "center" },
  orbSection: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 10,
  },
  orbHint: {
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  interimBox: {
    marginHorizontal: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 320,
  },
  interimText: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    fontStyle: "italic",
  },
  keyboardToggle: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  keyboardToggleText: {
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },
  orbWrapper: { alignItems: "center", justifyContent: "center" },
  orbGlow: {
    position: "absolute",
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: "#2563EB",
  },
  orb: {
    width: 116,
    height: 116,
    borderRadius: 58,
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
});
