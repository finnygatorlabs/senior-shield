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
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { usePreferences } from "@/context/PreferencesContext";
import FluidOrb from "@/components/FluidOrb";
import PageHeader from "@/components/PageHeader";
import MicPermissionModal from "@/components/MicPermissionModal";

// Remove markdown formatting before sending text to TTS so the voice
// never reads aloud characters like **, *, #, -, _, ~, backticks, etc.
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")   // **bold**
    .replace(/\*(.*?)\*/g, "$1")        // *italic*
    .replace(/__(.*?)__/g, "$1")        // __bold__
    .replace(/_(.*?)_/g, "$1")          // _italic_
    .replace(/~~(.*?)~~/g, "$1")        // ~~strikethrough~~
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // `code` or ```code```
    .replace(/^#{1,6}\s+/gm, "")        // # headings
    .replace(/^\s*[-*+]\s+/gm, "")      // - bullet points
    .replace(/^\s*\d+\.\s+/gm, "")      // 1. numbered lists
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [link text](url)
    .replace(/[|>]/g, "")               // tables and block quotes
    .trim();
}

// Split response text into sentence-sized chunks for streaming TTS.
// First chunk plays immediately (fast); remaining chunks are queued and
// pre-fetched while the first is still playing — dramatically cuts perceived delay.
function splitIntoChunks(text: string): string[] {
  // Split at sentence-ending punctuation, keeping each chunk ≤ 220 chars
  const parts = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let buf = "";
  for (const s of parts) {
    const candidate = (buf + s).trim();
    if (candidate.length > 220 && buf) {
      chunks.push(buf.trim());
      buf = s;
    } else {
      buf = (buf + s);
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks.filter(Boolean);
}

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

// ── Message bubble ─────────────────────────────────────────────────────────
const MAX_LINES = 4;

function MessageBubble({
  message, theme, ts, onSpeak,
}: {
  message: Message; theme: any; ts: any; onSpeak?: (t: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = message.text.length > 180;

  if (message.isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={{ fontSize: ts.sm, lineHeight: ts.sm * 1.45, color: "#fff", fontFamily: "Inter_400Regular" }}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.asstRow}>
      <View style={[styles.asstIcon, { backgroundColor: "#DBEAFE" }]}>
        <Ionicons name="shield-checkmark" size={12} color="#2563EB" />
      </View>
      <View style={[styles.asstBubble, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {message.isLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <ActivityIndicator size="small" color="#2563EB" />
            <Text style={{ color: theme.textSecondary, fontSize: ts.sm, fontFamily: "Inter_400Regular" }}>Thinking…</Text>
          </View>
        ) : (
          <>
            <Text
              numberOfLines={expanded ? undefined : MAX_LINES}
              style={{ color: theme.text, fontSize: ts.sm, lineHeight: ts.sm * 1.55, fontFamily: "Inter_400Regular" }}
            >
              {message.text}
            </Text>
            <View style={styles.replayRow}>
              {isLong && (
                <Pressable onPress={() => setExpanded(e => !e)} hitSlop={8}>
                  <Text style={{ fontSize: ts.xs, color: "#2563EB", fontFamily: "Inter_500Medium" }}>
                    {expanded ? "Show less" : "Read more"}
                  </Text>
                </Pressable>
              )}
              {onSpeak && (
                <Pressable onPress={() => onSpeak(message.text)} style={styles.replayBtn}>
                  <Ionicons name="volume-medium-outline" size={12} color="#64748B" />
                  <Text style={{ fontSize: ts.xs, color: "#64748B", fontFamily: "Inter_400Regular" }}>Replay</Text>
                </Pressable>
              )}
            </View>
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
  // Use the user's specifically chosen TTS voice from preferences
  const ttsVoice = prefs.tts_voice || (prefs.preferred_voice === "female" ? "nova" : "echo");
  // Ref always holds the latest voice so stale closures (e.g. inside SpeechRecognition) never use the wrong voice
  const ttsVoiceRef = useRef(ttsVoice);
  useEffect(() => { ttsVoiceRef.current = ttsVoice; }, [ttsVoice]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ConvTurn[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showText, setShowText] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [greeted, setGreeted] = useState(false);
  // audioReady = false on iOS web until user taps (browser autoplay policy)
  const [audioReady, setAudioReady] = useState(Platform.OS !== "web");
  const [showMicModal, setShowMicModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const voiceMutedRef = useRef(false);
  useEffect(() => { voiceMutedRef.current = voiceMuted; }, [voiceMuted]);

  // Conversation session ID — created on first exchange, used to append subsequent turns
  const sessionIdRef = useRef<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldListenAfterSpeak = useRef(false);
  // Always holds latest values so stale closures (e.g. inside startListening) never read old state
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const historyRef = useRef<ConvTurn[]>([]);
  useEffect(() => { historyRef.current = history; }, [history]);
  // State refs so recognition callbacks (stale closures) can always read current state
  const isSendingRef = useRef(false);
  useEffect(() => { isSendingRef.current = isSending; }, [isSending]);
  const isSpeakingRef = useRef(false);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  // speakTextRef lets sendMessage (captured inside startListening) always call the latest speakText
  // even if sendMessage itself is a stale closure from an earlier render
  const speakTextRef = useRef<(text: string, thenListen?: boolean) => void>(() => {});
  // startListeningRef lets recognition onend/onerror auto-restart without a stale closure
  const startListeningRef = useRef<() => void>(() => {});
  // Web Audio API — more reliable than HTML Audio in iframes (no autoplay policy issues)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSrcNodeRef = useRef<AudioBufferSourceNode | null>(null);
  // AbortController for the in-flight TTS fetch — cancel it when a new TTS call starts
  const abortTTSRef = useRef<AbortController | null>(null);
  // Monotonically increasing call ID — lets us discard stale responses from old TTS fetches
  const ttsCallIdRef = useRef(0);
  // Sentence-streaming queue — holds remaining chunks after the first sentence starts playing
  const chunkQueueRef = useRef<string[]>([]);
  // Callback invoked when each TTS chunk finishes — either plays next chunk or ends session
  const onTtsDoneRef = useRef<() => void>(() => {});

  // ── TTS ──
  const speakText = useCallback(async (text: string, thenListen = false) => {
    if (!text.trim()) {
      if (thenListen) startListening();
      return;
    }
    // Voice muted — skip audio, still start listening so conversation continues
    if (voiceMutedRef.current) {
      if (thenListen) startListening();
      return;
    }

    // Cancel any in-flight TTS fetch immediately so we don't get competing audio
    abortTTSRef.current?.abort();
    const ctrl = new AbortController();
    abortTTSRef.current = ctrl;

    // Unique ID for this call — lets us discard stale responses if a newer call won
    const callId = ++ttsCallIdRef.current;

    shouldListenAfterSpeak.current = thenListen;
    setIsSpeaking(true);

    if (Platform.OS === "web") {
      try {
        const ttsToken = userRef.current?.token;
        const res = await fetch(`${apiBase}/api/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${ttsToken}` },
          body: JSON.stringify({ text: text.slice(0, 600), voice: ttsVoiceRef.current }),
          signal: ctrl.signal,
        });

        if (callId !== ttsCallIdRef.current) return;

        if (res.ok) {
          const { audio } = await res.json();
          if (callId !== ttsCallIdRef.current) return;

          // Use Web Audio API — works reliably in iframes where HTML Audio.play() is blocked
          const ctx = audioCtxRef.current;
          if (!ctx) { setIsSpeaking(false); return; }

          // Stop any currently playing source node
          if (audioSrcNodeRef.current) {
            audioSrcNodeRef.current.onended = null;
            try { audioSrcNodeRef.current.stop(); } catch {}
            audioSrcNodeRef.current = null;
          }

          // Decode base64 MP3 → ArrayBuffer → AudioBuffer → play
          const binary = atob(audio);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

          const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
          if (callId !== ttsCallIdRef.current) return;

          const srcNode = ctx.createBufferSource();
          srcNode.buffer = audioBuffer;
          srcNode.connect(ctx.destination);
          audioSrcNodeRef.current = srcNode;

          srcNode.onended = () => {
            if (callId !== ttsCallIdRef.current) return;
            audioSrcNodeRef.current = null;
            onTtsDoneRef.current();
          };
          srcNode.start(0);
          return;
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
      setIsSpeaking(false);
      if (shouldListenAfterSpeak.current) startListening();
      return;
    } else {
      try {
        const ttsToken = userRef.current?.token;
        const res = await fetch(`${apiBase}/api/voice/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${ttsToken}` },
          body: JSON.stringify({ text: text.slice(0, 600), voice: ttsVoiceRef.current }),
          signal: ctrl.signal,
        });
        if (callId !== ttsCallIdRef.current) return;
        if (res.ok) {
          const { audio } = await res.json();
          if (callId !== ttsCallIdRef.current) return;
          const { Audio } = await import("expo-av");
          const { sound } = await Audio.Sound.createAsync(
            { uri: `data:audio/mpeg;base64,${audio}` },
            { shouldPlay: true }
          );
          sound.setOnPlaybackStatusUpdate((s: any) => {
            if (s.didJustFinish) {
              sound.unloadAsync();
              onTtsDoneRef.current(); // chain next sentence chunk or finish
            }
          });
          return;
        }
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
      // Native fallback: expo-speech (built-in TTS, maintains voice preference)
      const Sp = await import("expo-speech");
      Sp.default.stop();
      Sp.default.speak(text, {
        rate: 0.92,
        pitch: prefs.preferred_voice === "female" ? 1.05 : 0.86,
        onDone: () => { onTtsDoneRef.current(); }, // chain next chunk or finish
        onError: () => {
          chunkQueueRef.current = [];
          setIsSpeaking(false);
          if (shouldListenAfterSpeak.current) startListening();
        },
      });
      return;
    }
    setIsSpeaking(false);
    if (shouldListenAfterSpeak.current) startListening();
  }, [prefs.preferred_voice, apiBase, user?.token, ttsVoice]);
  // Keep the ref pointing to the latest speakText after every re-creation
  useEffect(() => { speakTextRef.current = speakText; }, [speakText]);

  // ── Sentence-streaming: called when each TTS chunk finishes playing ──
  // Pops the next chunk from the queue and speaks it, or ends the session.
  const onTtsDone = useCallback(() => {
    const next = chunkQueueRef.current.shift();
    if (next !== undefined) {
      // Pre-speak the next chunk (audio is likely already cached/loading)
      speakTextRef.current(next, shouldListenAfterSpeak.current);
    } else {
      setIsSpeaking(false);
      if (shouldListenAfterSpeak.current) startListening();
    }
  }, []); // all deps are refs — always current, no stale closure risk
  useEffect(() => { onTtsDoneRef.current = onTtsDone; }, [onTtsDone]);

  const stopSpeaking = useCallback(() => {
    shouldListenAfterSpeak.current = false;
    chunkQueueRef.current = []; // discard any queued sentence chunks
    // Cancel any in-flight TTS fetch — this stops the network request mid-flight
    abortTTSRef.current?.abort();
    abortTTSRef.current = null;
    // Increment call ID so any already-received response is treated as stale
    ttsCallIdRef.current++;
    if (Platform.OS === "web") {
      if (audioSrcNodeRef.current) {
        audioSrcNodeRef.current.onended = null;
        try { audioSrcNodeRef.current.stop(); } catch {}
        audioSrcNodeRef.current = null;
      }
    } else {
      audioRef.current?.pause();
      audioRef.current = null;
      import("expo-speech").then(m => m.default.stop()).catch(() => {});
    }
    setIsSpeaking(false);
  }, []);

  // ── Speech recognition ──
  // conversationActiveRef: true while we're in an ongoing voice conversation.
  // Drives the auto-restart loop: if recognition ends with no speech and the
  // conversation is still active, we kick it off again so the user doesn't
  // have to re-tap the orb every single exchange.
  const conversationActiveRef = useRef(false);

  const startListening = useCallback(() => {
    const SR = getWebSpeech();
    if (!SR) { setShowText(true); return; }
    if (recognitionRef.current) return;
    conversationActiveRef.current = true; // mark conversation as active
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
          if (prev.trim()) {
            // User said something — send it and let the AI response cycle restart listening
            sendMessage(prev);
            return "";
          }
          // No speech captured. If conversation is still active (user hasn't stopped it)
          // and we're not mid-send/speak, restart listening after a short pause so the
          // user doesn't have to tap the orb again.
          if (
            conversationActiveRef.current &&
            !isSendingRef.current &&
            !isSpeakingRef.current &&
            !voiceMutedRef.current
          ) {
            setTimeout(() => { startListeningRef.current(); }, 500);
          }
          return "";
        });
      };
      r.onerror = (e: any) => {
        setIsListening(false);
        recognitionRef.current = null;
        setInterimText("");
        if (e.error === "no-speech" || e.error === "aborted") {
          // Silence or interrupted — restart if conversation is still active
          if (
            conversationActiveRef.current &&
            !isSendingRef.current &&
            !isSpeakingRef.current &&
            !voiceMutedRef.current
          ) {
            setTimeout(() => { startListeningRef.current(); }, 500);
          }
        } else {
          // Real error (e.g. mic not allowed) — fall back to text input
          setShowText(true);
        }
      };
      r.start();
    } catch { setShowText(true); }
  }, []);
  // Keep the ref current so auto-restart calls the latest version (avoids stale closures)
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  const stopListening = useCallback(() => {
    conversationActiveRef.current = false; // stop auto-restart loop
    shouldListenAfterSpeak.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  // ── Greeting fires after audio is unlocked ──
  const greetingRef = useRef(false);
  useEffect(() => {
    if (greetingRef.current || !audioReady || !assistantName) return;
    greetingRef.current = true;
    const greeting = `Hi ${user?.first_name || "there"}! I'm ${assistantName}. Tap the orb and start talking — I'm here to help!`;
    setMessages([{ id: "0", text: greeting, isUser: false }]);
    setHistory([{ role: "assistant", content: greeting }]);
    setTimeout(() => speakText(greeting, true), 600);
  }, [audioReady, assistantName]);

  // Desktop / native: unlock immediately
  useEffect(() => {
    if (!greeted && audioReady && assistantName) setGreeted(true);
  }, [assistantName, audioReady]);

  // ── Unlock audio on first user tap ──
  // On web, the AudioContext is pre-created in handleOrbPress (during the tap gesture).
  // This function just marks audio as ready and, if the context doesn't exist yet
  // (e.g. on native), creates it. Safe to call multiple times.
  function unlockAudio() {
    if (audioReady) return;
    if (Platform.OS === "web" && typeof window !== "undefined" && !audioCtxRef.current) {
      try {
        const ctx = new (window as any).AudioContext();
        audioCtxRef.current = ctx;
        const silentBuf = ctx.createBuffer(1, 1, 22050);
        const silentSrc = ctx.createBufferSource();
        silentSrc.buffer = silentBuf;
        silentSrc.connect(ctx.destination);
        silentSrc.start(0);
      } catch {}
    }
    setAudioReady(true);
  }

  // Close AudioContext when the screen unmounts to free system resources
  useEffect(() => {
    return () => { audioCtxRef.current?.close().catch(() => {}); };
  }, []);

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

    // Always read from refs so stale closures (e.g. inside startListening) use current token + history
    const updatedHistory: ConvTurn[] = [...historyRef.current, { role: "user", content: text.trim() }];
    const freshToken = userRef.current?.token;
    const freshAuthH = { Authorization: `Bearer ${freshToken}` };
    try {
      const res = await fetch(`${apiBase}/api/voice/process-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...freshAuthH },
        body: JSON.stringify({
          request_text: text.trim(),
          conversation_history: updatedHistory.slice(-12),
        }),
      });
      if (res.status === 401) {
        const authErr = "It looks like your session expired. Please go to Settings and sign in again.";
        setMessages(prev => prev.map(m => m.id === lid ? { ...m, text: authErr, isLoading: false } : m));
        speakTextRef.current(authErr, false);
        return;
      }
      const data = await res.json();
      const reply = data.response_text || "I'm sorry, could you repeat that?";
      setMessages(prev => prev.map(m => m.id === lid ? { ...m, text: reply, isLoading: false } : m));
      const newHistory = [...updatedHistory, { role: "assistant" as const, content: reply }];
      setHistory(newHistory);

      // Save/update conversation session in background (fire-and-forget)
      const saveToken = userRef.current?.token;
      const saveHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${saveToken}` };
      const savePayload = JSON.stringify({ messages: newHistory });
      if (!sessionIdRef.current) {
        fetch(`${apiBase}/api/conversations`, { method: "POST", headers: saveHeaders, body: savePayload })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.id) sessionIdRef.current = d.id; })
          .catch(() => {});
      } else {
        fetch(`${apiBase}/api/conversations/${sessionIdRef.current}`, { method: "PUT", headers: saveHeaders, body: savePayload })
          .catch(() => {});
      }

      // Sentence-streaming: split into chunks, speak first chunk immediately (fast),
      // queue the rest — each chunk fires TTS while the previous chunk is still playing.
      const cleanReply = stripMarkdown(reply);
      const chunks = splitIntoChunks(cleanReply);
      chunkQueueRef.current = chunks.slice(1); // remaining chunks after first
      speakTextRef.current(chunks[0] || cleanReply, true);
    } catch {
      const err = "I couldn't connect just now. Please check your internet and try again.";
      setMessages(prev => prev.map(m => m.id === lid ? { ...m, text: err, isLoading: false } : m));
      speakTextRef.current(err, false);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }

  function handleOrbPress() {
    if (!audioReady) {
      // On web, create the AudioContext RIGHT NOW during this orb-tap gesture.
      // Chrome requires the AudioContext to be created synchronously within a user
      // gesture — doing it later inside a modal button loses the gesture context.
      if (Platform.OS === "web" && typeof window !== "undefined" && !audioCtxRef.current) {
        try {
          const ctx = new (window as any).AudioContext();
          audioCtxRef.current = ctx;
          // Play a silent buffer to immediately put the context in "running" state
          const buf = ctx.createBuffer(1, 1, 22050);
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.start(0);
        } catch {}
      }
      // Show the branded modal on all platforms — it acts as the informed-consent
      // step before the browser's own mic permission dialog.
      setShowMicModal(true);
      return;
    }
    if (isListening) { stopListening(); return; }
    if (isSpeaking) { stopSpeaking(); startListening(); return; }
    if (prefs.haptic_feedback && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startListening();
  }

  function handleEnableVoice() {
    setShowMicModal(false);
    unlockAudio(); // triggers iOS system permission prompt + unlocks audio
  }

  function handleTypeInstead() {
    setShowMicModal(false);
    setShowText(true);
    setAudioReady(true); // skip voice flow entirely
  }

  // ── Status labels ──
  const statusLabel = isListening
    ? "Listening…"
    : isSpeaking
    ? `${assistantName} is speaking`
    : !audioReady
    ? "Tap to start"
    : "Tap to speak";


  const orbBottomPad = tabBarHeight + insets.bottom + 8;
  // Orb is compact once the conversation starts and stays compact for the entire session.
  // Full size is only shown before the first tap — it invites the senior to begin.
  // Keeping it compact through listening/speaking/idle maximises message visibility.
  const isOrbCompact = greeted;
  // Idle = compact + not actively listening/speaking (used for status row + "Type instead" logic)
  const isOrbIdle = greeted && !isListening && !isSpeaking;
  // Compact footer: orb(80) + status(32, when active) + typeBtn(36) + padding = ~160px
  // Full footer: status(32) + gap(14) + orb(176) + gap(18) + typeBtn(36) + padding = ~300px
  const ORB_FOOTER_HEIGHT = isOrbCompact ? 160 : 300;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Mic permission modal ── */}
      <MicPermissionModal
        visible={showMicModal}
        assistantName={assistantName || "your assistant"}
        onEnable={handleEnableVoice}
        onTypeInstead={handleTypeInstead}
      />

      {/* ── Switch apps & return info modal ── */}
      <Modal visible={showSwitchModal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowSwitchModal(false)}>
        <Pressable style={styles.switchOverlay} onPress={() => setShowSwitchModal(false)}>
          <Pressable style={[styles.switchCard, { backgroundColor: theme.card }]} onPress={() => {}}>
            {/* Gradient header */}
            <LinearGradient colors={["#1E3A5F", "#2563EB"]} style={styles.switchHeader}>
              <Ionicons name="swap-horizontal" size={28} color="#fff" />
              <Text style={styles.switchHeaderTitle}>How to Leave &amp; Return</Text>
            </LinearGradient>

            <View style={styles.switchBody}>
              <Text style={[styles.switchIntro, { color: theme.text }]}>
                When {assistantName || "your assistant"} gives you phone instructions, follow these steps:
              </Text>

              {/* Step 1 */}
              <View style={styles.switchStep}>
                <View style={[styles.switchBadge, { backgroundColor: "#2563EB" }]}>
                  <Text style={styles.switchBadgeNum}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchStepTitle, { color: theme.text }]}>Leave SeniorShield</Text>
                  <Text style={[styles.switchStepDesc, { color: theme.textSecondary }]}>
                    Press the Home button (round button at the bottom of your phone) or swipe up from the bottom edge. SeniorShield stays open in the background.
                  </Text>
                </View>
              </View>

              {/* Step 2 */}
              <View style={styles.switchStep}>
                <View style={[styles.switchBadge, { backgroundColor: "#16A34A" }]}>
                  <Text style={styles.switchBadgeNum}>2</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchStepTitle, { color: theme.text }]}>Do your task</Text>
                  <Text style={[styles.switchStepDesc, { color: theme.textSecondary }]}>
                    Open Settings, Photos, or whatever app you need. Complete the step your assistant described.
                  </Text>
                </View>
              </View>

              {/* Step 3 */}
              <View style={styles.switchStep}>
                <View style={[styles.switchBadge, { backgroundColor: "#7C3AED" }]}>
                  <Text style={styles.switchBadgeNum}>3</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.switchStepTitle, { color: theme.text }]}>Come back</Text>
                  <Text style={[styles.switchStepDesc, { color: theme.textSecondary }]}>
                    Tap the SeniorShield icon on your home screen. Or double-press the Home button (or swipe up slowly and pause on newer phones) to see all open apps, then tap SeniorShield.
                  </Text>
                </View>
              </View>

              <Text style={[styles.switchNote, { color: theme.textSecondary, borderColor: theme.cardBorder }]}>
                Your conversation and all the steps will still be right here when you return.
              </Text>

              <Pressable
                onPress={() => setShowSwitchModal(false)}
                style={styles.switchCloseBtn}
              >
                <LinearGradient colors={["#1E3A5F", "#2563EB"]} style={styles.switchCloseBtnInner}>
                  <Text style={styles.switchCloseBtnText}>Got it!</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Header ── */}
      <PageHeader showTagline />

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[
          styles.msgsContent,
          { paddingBottom: orbBottomPad + ORB_FOOTER_HEIGHT + 16 },
        ]}
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

      {/* ── Voice orb footer (above floating tab bar) ── */}
      {!showText && (
        <View
          style={[
            styles.orbFooter,
            {
              bottom: orbBottomPad,
              backgroundColor: theme.background,
              paddingTop: isOrbCompact ? 8 : 16,
              paddingBottom: isOrbCompact ? 8 : 16,
            },
          ]}
        >
          {/* Status label / interim text — hidden when idle to give messages more space */}
          {!isOrbIdle && (
            <View style={styles.statusRow}>
              {isListening && interimText ? (
                <View style={[styles.interimBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                  <Text style={{ fontSize: ts.sm, fontFamily: "Inter_400Regular", color: theme.text, fontStyle: "italic" }} numberOfLines={2}>
                    "{interimText}"
                  </Text>
                </View>
              ) : (
                <Text
                  style={[
                    styles.statusLabel,
                    {
                      color: isListening ? "#0891B2" : isSpeaking ? "#2563EB" : theme.textSecondary,
                      fontSize: ts.sm,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {statusLabel}
                </Text>
              )}
            </View>
          )}

          {/* Orb — compact when idle, full size when active */}
          <FluidOrb
            onPress={handleOrbPress}
            isListening={isListening}
            isSpeaking={isSpeaking}
            audioReady={audioReady}
            isIdle={isOrbCompact}
          />

          {/* "Type instead" — visible before greeting (full orb) and when idle after greeting */}
          {!isListening && !isSpeaking && (
            <View style={{ alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={() => { stopListening(); stopSpeaking(); setShowText(true); }}
                hitSlop={16}
                style={styles.typeBtn}
              >
                <Text style={{ fontSize: ts.sm, color: theme.textSecondary, fontFamily: "Inter_400Regular", textDecorationLine: "underline" }}>
                  Type instead
                </Text>
              </Pressable>

              {/* Switch-app tip — always visible so the user can reference it during tasks */}
              <Pressable
                onPress={() => setShowSwitchModal(true)}
                hitSlop={10}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.cardBorder,
                }}
              >
                <Ionicons name="swap-horizontal-outline" size={15} color={theme.textSecondary} />
                <Text style={{ fontSize: ts.xs ?? 11, color: theme.textSecondary, fontFamily: "Inter_400Regular" }}>
                  How to switch apps &amp; return
                </Text>
              </Pressable>
            </View>
          )}

          {/* ── Voice mute toggle — lower right ── */}
          <Pressable
            onPress={() => {
              if (prefs.haptic_feedback && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!voiceMuted && isSpeaking) stopSpeaking();
              setVoiceMuted(v => !v);
            }}
            hitSlop={10}
            style={[styles.voiceMuteBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <Ionicons
              name={voiceMuted ? "volume-mute" : "volume-high"}
              size={26}
              color={voiceMuted ? "#9CA3AF" : "#2563EB"}
            />
          </Pressable>
        </View>
      )}

      {/* ── Text input bar ── */}
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
            style={({ pressed }) => [
              styles.sendBtn,
              (!inputText.trim() || isSending) && { backgroundColor: "#94A3B8" },
              pressed && { opacity: 0.85 },
            ]}
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
  messages: { flex: 1 },
  msgsContent: { paddingHorizontal: 12, paddingTop: 8, gap: 6 },
  userRow: { alignItems: "flex-end" },
  userBubble: {
    backgroundColor: "#2563EB", borderRadius: 18, borderBottomRightRadius: 4,
    paddingHorizontal: 12, paddingVertical: 7, maxWidth: "78%",
  },
  asstRow: { flexDirection: "row", alignItems: "flex-start", gap: 7, maxWidth: "90%" },
  asstIcon: {
    width: 22, height: 22, borderRadius: 6,
    alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0,
  },
  asstBubble: {
    flex: 1, borderRadius: 16, borderBottomLeftRadius: 4,
    paddingHorizontal: 11, paddingVertical: 8, borderWidth: 1,
  },
  replayRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 5 },
  replayBtn: { flexDirection: "row", alignItems: "center", gap: 3 },

  // Orb footer — floats above the tab bar
  orbFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 0,
  },
  statusRow: {
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  statusLabel: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  interimBox: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 7, maxWidth: "82%",
  },
  typeBtn: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  voiceMuteBtn: {
    position: "absolute",
    right: 16,
    bottom: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },

  // Input bar
  inputBar: {
    position: "absolute", left: 0, right: 0,
    flexDirection: "row", alignItems: "flex-end",
    paddingHorizontal: 14, paddingTop: 10, gap: 8, borderTopWidth: 1,
  },
  micBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  textInput: {
    flex: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10,
    fontFamily: "Inter_400Regular", maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: "#2563EB",
    alignItems: "center", justifyContent: "center",
  },

  // Switch-apps modal
  switchOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center", paddingHorizontal: 20,
  },
  switchCard: {
    width: "100%", maxWidth: 420, borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 10,
  },
  switchHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 20, paddingVertical: 18,
  },
  switchHeaderTitle: {
    fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff",
  },
  switchBody: {
    padding: 20, gap: 14,
  },
  switchIntro: {
    fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 4,
  },
  switchStep: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
  },
  switchBadge: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  switchBadgeNum: {
    fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff",
  },
  switchStepTitle: {
    fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 3,
  },
  switchStepDesc: {
    fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19,
  },
  switchNote: {
    fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18,
    marginTop: 4, paddingTop: 12, borderTopWidth: 1,
    fontStyle: "italic",
  },
  switchCloseBtn: {
    borderRadius: 12, overflow: "hidden", marginTop: 4,
  },
  switchCloseBtnInner: {
    paddingVertical: 13, alignItems: "center",
  },
  switchCloseBtnText: {
    fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff",
  },
});
