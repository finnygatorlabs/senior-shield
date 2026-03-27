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
  AppState,
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
import { voiceApi, conversationApi, userApi, API_BASE } from "@/services/api";

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
          <Text style={{ fontSize: ts.base, lineHeight: ts.base * 1.5, color: "#fff", fontFamily: "Inter_400Regular" }}>
            {message.text}
          </Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.asstRow}>
      {/* Circular avatar icon */}
      <View style={styles.asstIcon}>
        <Ionicons name="shield-checkmark" size={15} color="#fff" />
      </View>
      {/* Card bubble with left blue accent + shadow */}
      <View style={[styles.asstBubble, { backgroundColor: theme.card }]}>
        {/* Blue left accent strip */}
        <View style={styles.asstAccent} />
        <View style={styles.asstBubbleInner}>
          {message.isLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={{ color: theme.textSecondary, fontSize: ts.base, fontFamily: "Inter_400Regular" }}>Thinking…</Text>
            </View>
          ) : (
            <>
              <Text
                numberOfLines={expanded ? undefined : MAX_LINES}
                style={{ color: theme.text, fontSize: ts.base, lineHeight: ts.base * 1.6, fontFamily: "Inter_400Regular" }}
              >
                {message.text}
              </Text>
              <View style={styles.replayRow}>
                {isLong && (
                  <Pressable onPress={() => setExpanded(e => !e)} hitSlop={8}>
                    <Text style={{ fontSize: ts.sm, color: "#2563EB", fontFamily: "Inter_500Medium" }}>
                      {expanded ? "Show less ↑" : "Read more ↓"}
                    </Text>
                  </Pressable>
                )}
                {onSpeak && (
                  <Pressable onPress={() => onSpeak(message.text)} style={styles.replayBtn} hitSlop={8}>
                    <Ionicons name="volume-medium-outline" size={14} color="#64748B" />
                    <Text style={{ fontSize: ts.sm, color: "#64748B", fontFamily: "Inter_400Regular" }}>Replay</Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
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
  const assistantNameRef = useRef(assistantName);
  useEffect(() => { assistantNameRef.current = assistantName; }, [assistantName]);

  // Time-of-day greeting shown in the header
  const headerGreeting = (() => {
    const firstName = user?.first_name;
    if (!firstName) return undefined;
    const hour = new Date().getHours();
    const tod = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    return `${tod}, ${firstName}`;
  })();
  const apiBase = API_BASE;
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
  // audioReady = false on web until the AudioContext is created on first user tap
  const [audioReady, setAudioReady] = useState(Platform.OS !== "web");
  // micPermissionGranted = mic permission was already granted in a previous session.
  // Separate from audioReady: we can skip the consent modal without having an AudioContext yet.
  const [micPermissionGranted, setMicPermissionGranted] = useState(Platform.OS !== "web");
  const [showMicModal, setShowMicModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const voiceMutedRef = useRef(false);
  useEffect(() => { voiceMutedRef.current = voiceMuted; }, [voiceMuted]);

  // Conversation session ID — created on first exchange, used to append subsequent turns
  const sessionIdRef = useRef<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const shouldListenAfterSpeak = useRef(false);
  // Tracks whether we've already triggered the silence prompt to avoid double-fire
  // (onerror no-speech always fires onend right after, so we set this before onend runs)
  const noSpeechRetryRef = useRef(0);
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
  // All scheduled Web Audio source nodes for the current utterance (gapless playback)
  const scheduledNodesRef = useRef<AudioBufferSourceNode[]>([]);
  // Callback invoked when each TTS chunk finishes — either plays next chunk or ends session
  const onTtsDoneRef = useRef<() => void>(() => {});
  // Native expo-av Sound ref — keeps it alive (prevents GC) and lets stopSpeaking() cancel it
  const nativeSoundRef = useRef<any>(null);

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
          // Resume if the browser suspended the context (e.g. phone backgrounded / screen locked)
          if (ctx.state === "suspended") { try { await ctx.resume(); } catch {} }

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
          // Store in ref so stopSpeaking() can cancel it and GC can't collect it mid-playback
          nativeSoundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((s: any) => {
            if (s.didJustFinish) {
              nativeSoundRef.current = null;
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

  // ── Gapless web TTS: fetch all chunks in parallel, schedule back-to-back ──
  // This eliminates the silence gaps between sentence chunks by pre-fetching all
  // audio simultaneously and using Web Audio API's precise start-time scheduling.
  const speakGaplessWeb = useCallback(async (chunks: string[], thenListen: boolean) => {
    if (!chunks.length) { if (thenListen) startListening(); return; }
    if (voiceMutedRef.current) { if (thenListen) startListening(); return; }

    abortTTSRef.current?.abort();
    const ctrl = new AbortController();
    abortTTSRef.current = ctrl;
    const callId = ++ttsCallIdRef.current;

    shouldListenAfterSpeak.current = thenListen;
    setIsSpeaking(true);

    // Stop any currently scheduled nodes
    scheduledNodesRef.current.forEach(n => { n.onended = null; try { n.stop(); } catch {} });
    scheduledNodesRef.current = [];
    if (audioSrcNodeRef.current) {
      audioSrcNodeRef.current.onended = null;
      try { audioSrcNodeRef.current.stop(); } catch {}
      audioSrcNodeRef.current = null;
    }

    const ctx = audioCtxRef.current;
    if (!ctx) { setIsSpeaking(false); return; }
    // Resume if the browser suspended the context (phone backgrounded / screen locked)
    if (ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
      if (callId !== ttsCallIdRef.current) return;
    }

    try {
      const token = userRef.current?.token;

      // Fetch ALL chunks in parallel — no sequential round-trips between sentences
      const responses = await Promise.all(
        chunks.map(chunk =>
          fetch(`${apiBase}/api/voice/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ text: chunk.slice(0, 600), voice: ttsVoiceRef.current }),
            signal: ctrl.signal,
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        )
      );
      if (callId !== ttsCallIdRef.current) return;

      // Decode all base64 audio blobs → AudioBuffers
      const buffers: AudioBuffer[] = [];
      for (const result of responses) {
        if (!result?.audio) continue;
        const binary = atob(result.audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const buf = await ctx.decodeAudioData(bytes.buffer.slice(0));
        buffers.push(buf);
      }
      if (callId !== ttsCallIdRef.current) return;
      if (!buffers.length) { setIsSpeaking(false); return; }

      // Schedule every buffer to start exactly when the previous one ends — gapless
      const nodes: AudioBufferSourceNode[] = [];
      let startTime = ctx.currentTime + 0.05;
      for (const buf of buffers) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(startTime);
        startTime += buf.duration;
        nodes.push(src);
      }
      scheduledNodesRef.current = nodes;
      audioSrcNodeRef.current = nodes[nodes.length - 1];

      // Only the last node's onended marks the end of the full utterance
      nodes[nodes.length - 1].onended = () => {
        if (callId !== ttsCallIdRef.current) return;
        scheduledNodesRef.current = [];
        audioSrcNodeRef.current = null;
        setIsSpeaking(false);
        if (shouldListenAfterSpeak.current) startListening();
      };
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setIsSpeaking(false);
      if (shouldListenAfterSpeak.current) startListening();
    }
  }, [apiBase]);
  const speakGaplessWebRef = useRef(speakGaplessWeb);
  useEffect(() => { speakGaplessWebRef.current = speakGaplessWeb; }, [speakGaplessWeb]);

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
      // Stop all gapless-scheduled nodes
      scheduledNodesRef.current.forEach(n => { n.onended = null; try { n.stop(); } catch {} });
      scheduledNodesRef.current = [];
      if (audioSrcNodeRef.current) {
        audioSrcNodeRef.current.onended = null;
        try { audioSrcNodeRef.current.stop(); } catch {}
        audioSrcNodeRef.current = null;
      }
    } else {
      // Stop and unload any playing expo-av sound
      if (nativeSoundRef.current) {
        const s = nativeSoundRef.current;
        nativeSoundRef.current = null;
        s.stopAsync().then(() => s.unloadAsync()).catch(() => {});
      }
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
    conversationActiveRef.current = true;

    // Clear any leftover silence timer from a previous session
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }

    try {
      const r = new SR();
      // continuous = true keeps the mic open until WE decide to stop it.
      // This means seniors can pause mid-sentence without being cut off —
      // we only send after 3 full seconds of silence.
      r.continuous = true;
      r.interimResults = true;
      r.lang = "en-US";
      recognitionRef.current = r;

      r.onstart = () => {
        setIsListening(true);
        setInterimText("");
        if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      };

      r.onresult = (e: any) => {
        // Real speech detected — reset the no-speech retry counter
        noSpeechRetryRef.current = 0;

        // Build the complete running transcript: all confirmed final segments +
        // the current interim segment. This prevents text from disappearing
        // mid-utterance and gives seniors a full view of what was heard.
        let confirmed = "";
        let current = "";
        for (let i = 0; i < e.results.length; i++) {
          if (e.results[i].isFinal) confirmed += e.results[i][0].transcript;
          else current = e.results[i][0].transcript;
        }
        setInterimText(confirmed + current);

        // Reset the 3-second silence timer on every new word detected.
        // Only after 3 consecutive seconds of no speech do we stop and send.
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => {
          silenceTimerRef.current = null;
          recognitionRef.current?.stop(); // triggers onend → sendMessage
        }, 3000);
      };

      r.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        setInterimText(prev => {
          if (prev.trim()) {
            // Silence timer fired (or recognition ended naturally) — send what was said
            noSpeechRetryRef.current = 0;
            sendMessage(prev);
            return "";
          }
          // Nothing was heard. If conversationActive is still true here it means
          // we got here WITHOUT a preceding no-speech onerror (some browsers skip
          // the error and fire onend directly). Speak the idle prompt once and stop.
          if (conversationActiveRef.current && !isSendingRef.current && !isSpeakingRef.current) {
            conversationActiveRef.current = false;
            noSpeechRetryRef.current = 0;
            if (!voiceMutedRef.current) {
              const name = assistantNameRef.current || "I";
              setTimeout(() => {
                speakTextRef.current(
                  `${name} is still here! Tap the orb whenever you're ready to speak.`,
                  false
                );
              }, 300);
            }
          }
          return "";
        });
      };

      r.onerror = (e: any) => {
        setIsListening(false);
        recognitionRef.current = null;
        if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
        setInterimText("");
        if (e.error === "no-speech" || e.error === "aborted") {
          if (conversationActiveRef.current && !isSendingRef.current && !isSpeakingRef.current) {
            // Stop the loop immediately so the onend that follows this error does nothing
            conversationActiveRef.current = false;
            noSpeechRetryRef.current = 0;
            // Speak a friendly idle prompt then leave the orb idle for the user to tap
            if (!voiceMutedRef.current) {
              const name = assistantNameRef.current || "I";
              setTimeout(() => {
                speakTextRef.current(
                  `${name} is still here! Tap the orb whenever you're ready to speak.`,
                  false
                );
              }, 300);
            }
          }
        } else {
          // Real error (mic denied, network, etc.) — fall back to text input
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
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
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

  // On web, check if mic permission was already granted in a previous session.
  // If so, set micPermissionGranted so the consent modal is skipped on the next orb tap.
  // We do NOT set audioReady here — the AudioContext is only created on the first tap.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof navigator === "undefined") return;
    if (!navigator.permissions) return;
    navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then(result => {
        if (result.state === "granted") setMicPermissionGranted(true);
      })
      .catch(() => {});
  }, []);

  // Auto-resume suspended AudioContext when the tab returns to the foreground.
  // Mobile browsers suspend audio contexts when the page is backgrounded.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const resume = () => {
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume().catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, []);

  const deviceInfoSent = useRef(false);
  useEffect(() => {
    if (deviceInfoSent.current || !user?.token) return;
    deviceInfoSent.current = true;
    (async () => {
      try {
        let devicePlatform = Platform.OS;
        let deviceModel = "";
        let deviceOsVersion = String(Platform.Version || "");
        if (Platform.OS !== "web") {
          try {
            const Device = await import("expo-device");
            deviceModel = Device.modelName || Device.deviceName || "";
          } catch {}
        } else if (typeof navigator !== "undefined") {
          const ua = navigator.userAgent;
          if (/iPhone/.test(ua)) { devicePlatform = "ios"; deviceModel = "iPhone"; }
          else if (/iPad/.test(ua)) { devicePlatform = "ios"; deviceModel = "iPad"; }
          else if (/Android/.test(ua)) { devicePlatform = "android"; deviceModel = "Android device"; }
        }
        await userApi.updateProfile({ device_platform: devicePlatform, device_model: deviceModel, device_os_version: deviceOsVersion }, user.token);
      } catch {}
    })();
  }, [user?.token]);

  const [welcomeBack, setWelcomeBack] = useState(false);
  const appWasBackgrounded = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        appWasBackgrounded.current = true;
      } else if (nextState === "active" && appWasBackgrounded.current) {
        appWasBackgrounded.current = false;
        if (greeted && messages.length > 1) {
          setWelcomeBack(true);
          setTimeout(() => setWelcomeBack(false), 5000);
        }
      }
    });
    return () => sub.remove();
  }, [greeted, messages.length]);

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
    try {
      const data = await voiceApi.processRequest(text.trim(), updatedHistory.slice(-12), freshToken);
      const reply = data.response_text || "I'm sorry, could you repeat that?";
      setMessages(prev => prev.map(m => m.id === lid ? { ...m, text: reply, isLoading: false } : m));
      const newHistory = [...updatedHistory, { role: "assistant" as const, content: reply }];
      setHistory(newHistory);

      const saveToken = userRef.current?.token;
      if (!sessionIdRef.current) {
        conversationApi.create(newHistory, saveToken)
          .then(d => { if (d?.id) sessionIdRef.current = d.id; })
          .catch(() => {});
      } else {
        conversationApi.update(sessionIdRef.current, newHistory, saveToken)
          .catch(() => {});
      }

      // Gapless TTS on web: pre-fetch all sentence chunks in parallel and schedule
      // them back-to-back so there's no silence between sentences. Falls back to
      // sequential streaming on native where the Web Audio API isn't available.
      const cleanReply = stripMarkdown(reply);
      const chunks = splitIntoChunks(cleanReply);
      if (Platform.OS === "web" && audioCtxRef.current) {
        speakGaplessWebRef.current(chunks, true);
      } else {
        chunkQueueRef.current = chunks.slice(1);
        speakTextRef.current(chunks[0] || cleanReply, true);
      }
    } catch (e: any) {
      const isAuthErr = e?.status === 401;
      const err = isAuthErr
        ? "It looks like your session expired. Please go to Settings and sign in again."
        : "I couldn't connect just now. Please check your internet and try again.";
      setMessages(prev => prev.map(m => m.id === lid ? { ...m, text: err, isLoading: false } : m));
      speakTextRef.current(err, false);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }

  function handleOrbPress() {
    // Always create the AudioContext on the FIRST user gesture regardless of audioReady.
    // Chrome requires this synchronously inside a user gesture; doing it later loses the context.
    if (Platform.OS === "web" && typeof window !== "undefined" && !audioCtxRef.current) {
      try {
        const ctx = new (window as any).AudioContext();
        audioCtxRef.current = ctx;
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch {}
    }
    if (!audioReady) {
      if (micPermissionGranted) {
        // Mic permission already granted from a previous session — skip the consent modal.
        // AudioContext was just created above; unlockAudio() marks audioReady=true which
        // triggers the greeting useEffect, whose thenListen=true chain starts the mic.
        unlockAudio();
      } else {
        setShowMicModal(true);
      }
      return;
    }
    if (isListening) { stopListening(); return; }
    // User is intentionally re-engaging — clear the no-speech retry count so the
    // cap doesn't carry over from a previous stalled session.
    noSpeechRetryRef.current = 0;
    if (isSpeaking) { stopSpeaking(); startListening(); return; }
    if (prefs.haptic_feedback && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startListening();
  }

  function handleEnableVoice() {
    setShowMicModal(false);
    unlockAudio();
    // Start listening immediately so the browser's mic permission dialog appears
    // as a direct continuation of the user's "Enable Voice" tap — not as a
    // separate surprise popup on the next orb tap.
    startListening();
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
  // Compact footer: orb(100) + compactLabel(25) + typeBtn(32) + padding(16) + buffer(2) = ~175px
  // Full footer (pre-greeting): orb(176) + typeBtn(32) + padding(16) = ~224px
  const ORB_FOOTER_HEIGHT = isOrbCompact ? 175 : 224;
  // The floating status row sits just above the footer
  const statusRowBottom = orbBottomPad + ORB_FOOTER_HEIGHT + 8;

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
      <PageHeader showTagline greeting={headerGreeting} />

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={[
          styles.msgsContent,
          { paddingBottom: orbBottomPad + ORB_FOOTER_HEIGHT + 52 },
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

      {/* ── Welcome back banner ── */}
      {welcomeBack && (
        <View style={[styles.welcomeBackBanner, { bottom: statusRowBottom + 30 }]}>
          <Ionicons name="arrow-up-circle" size={18} color="#2563EB" />
          <Text style={styles.welcomeBackText}>Welcome back! Your instructions are above.</Text>
        </View>
      )}

      {/* ── Status label floats above the orb (no layout impact on orb position) ── */}
      {!showText && (
        <View
          style={[
            styles.statusRow,
            {
              position: "absolute",
              bottom: statusRowBottom,
              left: 0,
              right: 0,
              opacity: isOrbIdle ? 0 : 1,
            },
          ]}
          pointerEvents="none"
        >
          {isListening && interimText ? (
            <View style={[styles.interimBox, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <Text style={{ fontSize: ts.sm, fontFamily: "Inter_400Regular", color: theme.text, fontStyle: "italic" }} numberOfLines={3}>
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

      {/* ── Voice orb footer (above floating tab bar) ── */}
      {!showText && (
        <View
          style={[
            styles.orbFooter,
            {
              bottom: 0,
              backgroundColor: theme.background,
              paddingTop: 16,
              // pad content above the tab bar + safe area so nothing overlaps
              paddingBottom: orbBottomPad,
            },
          ]}
        >
          {/* Gradient fade — messages dissolve into the orb panel */}
          <LinearGradient
            colors={["transparent", theme.background]}
            style={[styles.orbFade, { pointerEvents: "none" }]}
          />

          {/* Ambient glow behind the orb */}
          <View style={styles.orbGlow} />

          {/* Orb — compact when idle, full size when active */}
          <FluidOrb
            onPress={handleOrbPress}
            isListening={isListening}
            isSpeaking={isSpeaking}
            audioReady={audioReady}
            isIdle={isOrbCompact}
          />

          {/* "Type instead" — subtle pill button */}
          <Pressable
            onPress={() => { stopListening(); stopSpeaking(); setShowText(true); }}
            hitSlop={16}
            style={[
              styles.typeBtn,
              {
                opacity: (!isListening && !isSpeaking) ? 1 : 0,
                backgroundColor: theme.surface,
                borderColor: theme.border,
              }
            ]}
            pointerEvents={(!isListening && !isSpeaking) ? "auto" : "none"}
          >
            <Ionicons name="create-outline" size={13} color={theme.textSecondary} />
            <Text style={{ fontSize: ts.sm, color: theme.textSecondary, fontFamily: "Inter_500Medium" }}>
              Type instead
            </Text>
          </Pressable>

          {/* ── Voice mute toggle — lower right ── */}
          <Pressable
            onPress={() => {
              if (prefs.haptic_feedback && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!voiceMuted && isSpeaking) stopSpeaking();
              setVoiceMuted(v => !v);
            }}
            hitSlop={10}
            style={[styles.voiceMuteBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder, bottom: orbBottomPad + 8 }]}
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
  msgsContent: { paddingHorizontal: 14, paddingTop: 12, gap: 10 },

  // User bubble — vivid blue pill, right-aligned
  userRow: { alignItems: "flex-end" },
  userBubble: {
    backgroundColor: "#2563EB",
    borderRadius: 22,
    borderBottomRightRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: "78%",
    // shadow
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },

  // AI bubble — white card with left blue accent strip and subtle shadow
  asstRow: { flexDirection: "row", alignItems: "flex-start", gap: 9, maxWidth: "92%" },
  asstIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#2563EB",
    alignItems: "center", justifyContent: "center",
    marginTop: 3, flexShrink: 0,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  asstBubble: {
    flex: 1,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    overflow: "hidden",
    flexDirection: "row",
    // card shadow
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  asstAccent: {
    width: 4,
    backgroundColor: "#2563EB",
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 5,
    flexShrink: 0,
  },
  asstBubbleInner: {
    flex: 1,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  replayRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 7 },
  replayBtn: { flexDirection: "row", alignItems: "center", gap: 4 },

  // Orb footer — anchored at screen bottom, fills to tab bar
  orbFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 0,
  },
  // Gradient that bleeds upward from the footer, dissolving messages into the panel
  orbFade: {
    position: "absolute",
    top: -52,
    left: 0,
    right: 0,
    height: 52,
  },
  // Soft ambient blue halo behind the orb — slightly larger than the 100px compact orb
  orbGlow: {
    position: "absolute",
    top: 8,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(37,99,235,0.08)",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 0,
    alignSelf: "center",
  },
  statusRow: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
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
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  voiceMuteBtn: {
    position: "absolute",
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
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
  welcomeBackBanner: {
    position: "absolute",
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  welcomeBackText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#2563EB",
  },
});
