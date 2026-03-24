import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View, Platform } from "react-native";
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const SIZE = 220;

// ── Expanding wave ring ──────────────────────────────────────────────
function PulseRing({ color, delay = 0, borderWidth = 2 }: { color: string; delay?: number; borderWidth?: number }) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.9);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(withTiming(1.9, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false)
    );
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(0, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false)
    );
    return () => { cancelAnimation(scale); cancelAnimation(opacity); };
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Reanimated.View
      style={[
        styles.pulseRing,
        style,
        { borderColor: color, borderWidth },
      ]}
    />
  );
}

// ── Web video element ────────────────────────────────────────────────
function OrbVideo({ size }: { size: number }) {
  const videoRef = useRef<any>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
    return () => { el.pause(); };
  }, []);

  if (Platform.OS === "web") {
    return (
      <video
        ref={videoRef}
        src="/orb.mov"
        autoPlay
        loop
        muted
        playsInline
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          objectFit: "cover",
          display: "block",
          position: "absolute" as any,
          top: 0,
          left: 0,
        }}
      />
    );
  }

  // Native: use expo-av
  return <NativeVideo size={size} />;
}

function NativeVideo({ size }: { size: number }) {
  const [Video, setVideo] = React.useState<any>(null);
  const [ResizeMode, setResizeMode] = React.useState<any>(null);

  useEffect(() => {
    import("expo-av").then(m => {
      setVideo(() => m.Video);
      setResizeMode(m.ResizeMode);
    });
  }, []);

  if (!Video || !ResizeMode) return null;

  return (
    <Video
      source={require("../public/orb.mov")}
      shouldPlay
      isLooping
      isMuted
      resizeMode={ResizeMode.COVER}
      style={{ width: size, height: size, borderRadius: size / 2, position: "absolute", top: 0, left: 0 }}
    />
  );
}

// ── Main exported component ──────────────────────────────────────────
interface FluidOrbProps {
  onPress: () => void;
  isListening: boolean;
  isSpeaking: boolean;
  audioReady: boolean;
}

export default function FluidOrb({ onPress, isListening, isSpeaking, audioReady }: FluidOrbProps) {
  const iconScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  const accent = isListening ? "#EF4444" : "#60A5FA";
  const accentAlt = isListening ? "#FCA5A5" : "#93C5FD";

  useEffect(() => {
    cancelAnimation(iconScale);
    cancelAnimation(glowOpacity);

    if (isListening) {
      iconScale.value = withRepeat(
        withSequence(withTiming(1.18, { duration: 260 }), withTiming(1.0, { duration: 260 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.72, { duration: 260 }), withTiming(0.28, { duration: 260 })),
        -1, false
      );
    } else if (isSpeaking) {
      iconScale.value = withRepeat(
        withSequence(withTiming(1.08, { duration: 540 }), withTiming(0.96, { duration: 540 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.5, { duration: 540 }), withTiming(0.1, { duration: 540 })),
        -1, false
      );
    } else {
      iconScale.value = withRepeat(
        withSequence(withTiming(1.04, { duration: 2000 }), withTiming(0.98, { duration: 2000 })),
        -1, false
      );
      glowOpacity.value = withTiming(0);
    }
  }, [isListening, isSpeaking]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const icon: any = isListening
    ? "stop-circle"
    : isSpeaking
    ? "volume-high"
    : !audioReady
    ? "hand-right"
    : "mic";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressed && { opacity: 0.9 }]}
    >
      {/* Looping video sphere */}
      <OrbVideo size={SIZE} />

      {/* State color overlay — tints the video when listening/speaking */}
      <Reanimated.View
        style={[
          styles.stateOverlay,
          { backgroundColor: accent },
          glowStyle,
        ]}
      />

      {/* Expanding wave rings when active */}
      {(isListening || isSpeaking) && (
        <View style={styles.rings}>
          <PulseRing color={accent} delay={0} borderWidth={2.5} />
          <PulseRing color={accentAlt} delay={660} borderWidth={2} />
          <PulseRing color={accent} delay={1320} borderWidth={1.5} />
        </View>
      )}

      {/* Icon on top */}
      <Reanimated.View style={[styles.iconWrap, iconStyle]}>
        <Ionicons name={icon} size={52} color="#FFFFFF" />
      </Reanimated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#080C1E",
    // Deep shadow for depth
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 16,
  },
  stateOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SIZE / 2,
  },
  rings: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
  },
  iconWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    // Drop shadow on the icon for visibility over the video
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
