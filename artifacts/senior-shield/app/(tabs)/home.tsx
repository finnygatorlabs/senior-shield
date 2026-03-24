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

// ── Voice orb ─────────────────────────────────────────────────────────────
function VoiceOrb({
  onPress,
  isListening,
  isSpeaking,
}: {
  onPress: () => void;
  isListening: boolean;
  isSpeaking: boolean;
}) {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);

  useEffect(() => {
    if (isListening) {
      scale.value = withRepeat(
        withSequence(withTiming(1.16, { duration: 380 }), withTiming(1.0, { duration: 380 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.92, { duration: 380 }), withTiming(0.28, { duration: 380 })),
        -1, false
      );
    } else if (isSpeaking) {
      scale.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 560 }), withTiming(1.0, { duration: 560 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.6, { duration: 560 }), withTiming(0.18, { duration: 560 })),
        -1, false
      );
    } else {
      scale.value = withRepeat(
        withSequence(withTiming(1.04, { duration: 1800 }), withTiming(1.0, { duration: 1800 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.32, { duration: 1800 }), withTiming(0.1, { duration: 1800 })),
        -1, false
      );
    }
  }, [isListening, isSpeaking]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));
  const color = isListening ? "#DC2626" : "#2563EB";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.orbWrapper, pressed && { opacity: 0.82 }]}
    >
      <Reanimated.View style={[styles.orbGlow, { backgroundColor: color }, glowStyle]} />
      <Reanimated.View style={[styles.orb, { backgroundColor: color }, animStyle]}>
        <Ionicons
          name={isListening ? "stop-circle" : isSpeaking ? "volume-high" : "mic"}
          size={50}
          color="#FFF"
        />
      </Reanimated.View>
    </Pressable>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────
function MessageBubble({
  message, theme, ts, onSpeak,
}: {
  message: Message; theme: any; ts: any; onSpeak?: (t: string) => void;
}) {
  if (message.isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={{ fontSize: ts.base, lineHeight: ts.base * 1.5, color: "#fff", fontFamily: "Inter_400Regular" }}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.asstRow}>
      <View style={[styles.asstIcon, { backgroundColor: "#DBEAFE" }]}>
        <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
      </View>
      <View style={[styles.asstBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {message.isLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={{ color: theme.textSecondary, fontSize: ts.sm, fontFamily: "Inter_400Regular" }}>Thinking…</Text>
          </View>
        ) : (
          <>
            <Text style={{ color: theme.text, fontSize: ts.base, lineHeight: ts.base * 1.58, fontFamily: "Inter_400Regular" }}>
              {message.text}
            </Text>
            {onSpeak && (
              <Pressable onPress={() => onSpeak(message.text)} style={styles.replayBtn}>
                <Ionicons name="volume-medium-outline" size={13} color="#2563EB" />
                <Text style={{ fontSize: ts.xs, color: "#2563EB", fontFamily: "Inter_500Medium" }}>Replay</Text>
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

// ── Main screen ────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user } = useAuth();
  const { prefs, ts } = usePreferences();

  const assistantName = prefs.assistant_name;
  const apiBase = (() => {
    const d = process.env.EXPO_PUBLIC_DOMAIN;
    return d ? `https://${d}` : "";
  })();
  const authH = { Authorization: `Bearer ${user?.token}` };

  // Map voice gender to the best OpenAI TTS voices
  // Female: nova (warm, Sol-like) | Male: onyx (deep mature, Cove-like)
  const ttsVoice = prefs.preferred_voice === "female" ? "nova" : "onyx";

  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ConvTurn[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showText, setShowText] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [greeted, setGreeted] = useState(false);
  // iOS Safari: audio can only play after a user gesture
  const [audioReady, setAudioReady] = useState(Platform.OS !== "web");

  const scrollRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldListenAfterSpeak = useRef(false);

  // ── TTS ──
  const speakText = useCallback(async (text: string, thenListen = false) => {
    if (!text.trim()) {
      if (thenListen) startListening();
      return;
    }
    shouldListenAfterSpeak.current = thenListen;
    setIsSpeaking(true);

    if (Platform.OS === "web") {
      try {
        const res = await fetch(`${apiBase}/api/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authH },
          body: JSON.stringify({ text: text.slice(0, 900), voice: ttsVoice }),
        });
        if (res.ok) {
          const { audio } = await res.json();
          if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
          const el = new Audio(`data:audio/mpeg;base64,${audio}`);
          audioRef.current = el;
          el.onended = () => {
            setIsSpeaking(false);
            audioRef.current = null;
            if (shouldListenAfterSpeak.current) startListening();
          };
          el.onerror = () => {
            setIsSpeaking(false);
            audioRef.current = null;
            if (shouldListenAfterSpeak.current) startListening();
          };
          const playPromise = el.play();
          if (playPromise !== undefined) {
            await playPromise;
          }
          return;
        }
      } catch {}
      // Browser TTS fallback
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 0.92;
        utter.onend = () => {
          setIsSpeaking(false);
          if (shouldListenAfterSpeak.current) startListening();
        };
        window.speechSynthesis.speak(utter);
        return;
      }
    } else {
      try {
        const { Audio } = await import("expo-av");
        const res = await fetch(`${apiBase}/api/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authH },
          body: JSON.stringify({ text: text.slice(0, 900), voice: ttsVoice }),
        });
        if (res.ok) {
          const { audio } = await res.json();
          const { sound } = await Audio.Sound.createAsync(
            { uri: `data:audio/mpeg;base64,${audio}` },
            { shouldPlay: true }
          );
          sound.setOnPlaybackStatusUpdate((s: any) => {
            if (s.didJustFinish) {
              sound.unloadAsync();
              setIsSpeaking(false);
              if (shouldListenAfterSpeak.current) startListening();
            }
          });
          return;
        }
      } catch {}
      const Sp = await import("expo-speech");
      Sp.default.stop();
      Sp.default.speak(text, {
        rate: 0.92,
        pitch: prefs.preferred_voice === "female" ? 1.05 : 0.9,
        onDone: () => {
          setIsSpeaking(false);
          if (shouldListenAfterSpeak.current) startListening();
        },
        onError: () => {
          setIsSpeaking(false);
          if (shouldListenAfterSpeak.current) startListening();
        },
      });
      return;
    }
    setIsSpeaking(false);
    if (shouldListenAfterSpeak.current) startListening();
  }, [prefs.preferred_voice, apiBase, user?.token, ttsVoice]);

  const stopSpeaking = useCallback(() => {
    shouldListenAfterSpeak.current = false;
    if (Platform.OS === "web") {
      audioRef.current?.pause();
      audioRef.current = null;
      window.speechSynthesis?.cancel();
    } else {
      import("expo-speech").then(m => m.default.stop()).catch(() => {});
    }
    setIsSpeaking(false);
  }, []);

  // ── Speech recognition ──
  const startListening = useCallback(() => {
    const SR = getWebSpeech();
    if (!SR) { setShowText(true); return; }
    if (recognitionRef.current) return; // already running
    try {
      const r = new SR();
      r.continuous = false;
      r.interimResults = true;
      r.lang = "en-US";
      recognitionRef.current = r;
      r.onstart = () => {
        setIsListening(true);
        setInterimText("");
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      };
      r.onresult = (e: any) => {
        let interim = "", final = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t; else interim += t;
        }
        setInterimText(final || interim);
      };
      r.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        setInterimText(prev => {
          if (prev.trim()) { sendMessage(prev); return ""; }
          return "";
        });
      };
      r.onerror = (e: any) => {
        setIsListening(false);
        recognitionRef.current = null;
        setInterimText("");
        if (e.error !== "no-speech" && e.error !== "aborted") setShowText(true);
      };
      r.start();
    } catch { setShowText(true); }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenAfterSpeak.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  // ── Greeting ── (only after audio is unlocked by user gesture)
  useEffect(() => {
    if (!greeted || !audioReady || !assistantName) return;
    const greeting = `Hi ${user?.first_name || "there"}! I'm ${assistantName}. Tap the mic and talk to me — I'm listening.`;
    setMessages([{ id: "0", text: greeting, isUser: false }]);
    setHistory([{ role: "assistant", content: greeting }]);
    setTimeout(() => speakText(greeting, true), 500);
  }, [greeted, audioReady]);

  // ── Handle first tap (iOS audio unlock) ──
  function handleFirstTap() {
    if (audioReady) return;
    // Play silent audio to satisfy iOS autoplay policy
    if (Platform.OS === "web" && typeof window !== "undefined") {
      try {
        const ctx = new (window as any).AudioContext();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch {}
    }
    setAudioReady(true);
    setGreeted(true);
  }

  // On non-iOS (desktop web / native), greet immediately
  useEffect(() => {
    if (!greeted && audioReady && assistantName) {
      setGreeted(true);
    }
  }, [assistantName, audioReady]);

  // ── Send message ──
  async function sendMessage(text: string) {
    if (!text.trim() || isSending) return;
    stopSpeaking();
    stopListening();

    const uid = Date.now().toString();
    const lid = (Date.now() + 1).toString();
    setMessages(prev => [
      ...prev,
      { id: uid, text: text.trim(), isUser: true },
      { id: lid, text: "", isUser: false, isLoading: true },
    ]);
    setInputText("");
    setInterimText("");
    setIsSending(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const updatedHistory: ConvTurn[] = [...history, { role: "user", content: text.trim() }];
    try {
      const res = await fetch(`${apiBase}/api/voice/process-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({
          request_text: text.trim(),
          conversation_history: updatedHistory.slice(-12),
        }),
      });
      const data = await res.json();
      const reply = data.response_text || "I'm sorry, I had a little trouble. Could you try again?";
      setMessages(prev => prev.map(m => m.id === lid ? { ...m, text: reply, isLoading: false } : m));
      setHistory([...updatedHistory, { role: "assistant", content: reply }]);
      shouldListenAfterSpeak.current = true;
      speakText(reply, true);
    } catch {
      const err = "I couldn't connect just now. Please check your internet and try again!";
      setMessages(prev => prev.map(m => m.id === lid ? { ...m, text: err, isLoading: false } : m));
      speakText(err, false);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }

  function handleOrbPress() {
    if (!audioReady) { handleFirstTap(); return; }
    if (isListening) { stopListening(); return; }
    if (isSpeaking) { stopSpeaking(); startListening(); return; }
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startListening();
  }

  const statusLabel = isListening ? "Listening…"
    : isSpeaking ? `${assistantName} is speaking — tap to interrupt`
    : !audioReady ? `Tap to start`
    : "Tap to speak";

  const firstName = user?.first_name || "Friend";

  // The orb footer needs clearance for the floating tab bar
  const orbBottomPad = tabBarHeight + insets.bottom + 6;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8) }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary, fontSize: ts.xs }]}>Good day,</Text>
          <Text style={[styles.name, { color: theme.text, fontSize: ts.h2 }]}>{firstName}</Text>
        </View>
        <View style={[styles.shieldBadge, { backgroundColor: "#DBEAFE" }]}>
          <Ionicons name="shield-checkmark" size={14} color="#2563EB" />
          <Text style={{ fontSize: ts.xs, fontFamily: "Inter_600SemiBold", color: "#2563EB" }}>Protected</Text>
        </View>
      </View>

      {/* ── Messages (leaves room for orb footer) ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[styles.msgsContent, { paddingBottom: orbBottomPad + 148 }]}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            theme={theme}
            ts={ts}
            onSpeak={!msg.isUser && !msg.isLoading ? t => speakText(t, false) : undefined}
          />
        ))}
      </ScrollView>

      {/* ── Orb footer (absolute, above tab bar) ── */}
      {!showText && (
        <View
          style={[
            styles.orbFooter,
            { bottom: orbBottomPad, backgroundColor: theme.background },
          ]}
        >
          {isListening && interimText ? (
            <View style={[styles.interimBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={{ fontSize: ts.sm, fontFamily: "Inter_400Regular", color: theme.text, fontStyle: "italic" }} numberOfLines={2}>
                {interimText}
              </Text>
            </View>
          ) : (
            <Text
              style={[
                styles.statusLabel,
                { color: isListening ? "#DC2626" : theme.textSecondary, fontSize: ts.xs },
              ]}
              numberOfLines={1}
            >
              {statusLabel}
            </Text>
          )}

          <VoiceOrb onPress={handleOrbPress} isListening={isListening} isSpeaking={isSpeaking} />

          <Pressable onPress={() => { stopListening(); stopSpeaking(); setShowText(true); }} hitSlop={12}>
            <Text style={{ fontSize: ts.xs, color: theme.textSecondary, fontFamily: "Inter_400Regular", textDecorationLine: "underline" }}>
              Type instead
            </Text>
          </Pressable>
        </View>
      )}

      {/* ── Text input (absolute, above tab bar) ── */}
      {showText && (
        <View
          style={[
            styles.inputBar,
            {
              bottom: tabBarHeight,
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          <Pressable
            onPress={() => { setShowText(false); setInputText(""); setInterimText(""); startListening(); }}
            style={styles.micBtn}
          >
            <Ionicons name="mic" size={26} color="#2563EB" />
          </Pressable>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.inputBackground, color: theme.text, fontSize: ts.base }]}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Ask ${assistantName}…`}
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
            style={({ pressed }) => [styles.sendBtn, (!inputText.trim() || isSending) && { backgroundColor: "#94A3B8" }, pressed && { opacity: 0.85 }]}
          >
            {isSending ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={20} color="#FFF" />}
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 10,
  },
  greeting: { fontFamily: "Inter_400Regular" },
  name: { fontFamily: "Inter_700Bold" },
  shieldBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  messages: { flex: 1 },
  msgsContent: { paddingHorizontal: 14, paddingTop: 6, gap: 10 },
  userRow: { alignItems: "flex-end" },
  userBubble: { backgroundColor: "#2563EB", borderRadius: 20, borderBottomRightRadius: 4, paddingHorizontal: 14, paddingVertical: 10, maxWidth: "80%" },
  asstRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, maxWidth: "90%" },
  asstIcon: { width: 26, height: 26, borderRadius: 7, alignItems: "center", justifyContent: "center", marginTop: 3, flexShrink: 0 },
  asstBubble: { flex: 1, borderRadius: 18, borderBottomLeftRadius: 4, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1 },
  replayBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },

  // Orb footer — positioned above the floating tab bar
  orbFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 10,
  },
  statusLabel: { fontFamily: "Inter_400Regular" },
  interimBox: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 7, maxWidth: "82%" },
  orbWrapper: { alignItems: "center", justifyContent: "center" },
  orbGlow: { position: "absolute", width: 136, height: 136, borderRadius: 68 },
  orb: {
    width: 104, height: 104, borderRadius: 52,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#2563EB", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42, shadowRadius: 16, elevation: 10,
  },

  // Input bar — positioned above the tab bar
  inputBar: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingTop: 10,
    gap: 8,
    borderTopWidth: 1,
  },
  micBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  textInput: { flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontFamily: "Inter_400Regular", maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#2563EB", alignItems: "center", justifyContent: "center" },
});
