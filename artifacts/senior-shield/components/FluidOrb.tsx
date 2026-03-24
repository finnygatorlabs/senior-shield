import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  RadialGradient,
  Stop,
} from "react-native-svg";
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
const C = SIZE / 2;
const R = 84; // sphere radius

// ── One orbiting ring ────────────────────────────────────────────────
interface RingProps {
  rx: number;
  ry: number;
  color: string;
  sw: number; // strokeWidth
  speed: number;
  delay?: number;
  phaseStart?: number;
  opacity?: number;
}

function OrbRing({ rx, ry, color, sw, speed, delay = 0, phaseStart = 0, opacity = 0.72 }: RingProps) {
  const rot = useSharedValue(phaseStart);

  useEffect(() => {
    rot.value = withDelay(
      delay,
      withRepeat(
        withTiming(phaseStart + 360, { duration: speed, easing: Easing.linear }),
        -1,
        false
      )
    );
    return () => cancelAnimation(rot);
  }, [speed]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  return (
    <Reanimated.View style={[StyleSheet.absoluteFill, style]}>
      <Svg width={SIZE} height={SIZE}>
        <Ellipse
          cx={C}
          cy={C}
          rx={rx}
          ry={ry}
          stroke={color}
          strokeWidth={sw}
          fill="none"
          opacity={opacity}
        />
      </Svg>
    </Reanimated.View>
  );
}

// ── Expanding pulse ring ─────────────────────────────────────────────
function PulseRing({ color, delay = 0 }: { color: string; delay?: number }) {
  const scale = useSharedValue(0.55);
  const opacity = useSharedValue(0.8);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(withTiming(1.7, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false)
    );
    opacity.value = withDelay(
      delay,
      withRepeat(withTiming(0, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false)
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
        { width: R * 2, height: R * 2, borderRadius: R, borderColor: color },
      ]}
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
  const glowScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.28);
  const coreScale = useSharedValue(1);

  // Colours driven by state
  const accent = isListening ? "#EF4444" : isSpeaking ? "#60A5FA" : "#2563EB";
  const accentMid = isListening ? "#F87171" : isSpeaking ? "#93C5FD" : "#818CF8";
  const accentFar = isListening ? "#DC2626" : isSpeaking ? "#38BDF8" : "#7C3AED";

  const ringSpeed = isListening ? 0.55 : isSpeaking ? 0.75 : 1;
  const baseSpeeds = [14000, 18000, 22000, 26000, 11000];

  useEffect(() => {
    cancelAnimation(glowScale);
    cancelAnimation(glowOpacity);
    cancelAnimation(coreScale);

    if (isListening) {
      glowScale.value = withRepeat(
        withSequence(withTiming(1.24, { duration: 280 }), withTiming(1.0, { duration: 280 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.95, { duration: 280 }), withTiming(0.35, { duration: 280 })),
        -1, false
      );
      coreScale.value = withRepeat(
        withSequence(withTiming(1.12, { duration: 280 }), withTiming(1.0, { duration: 280 })),
        -1, false
      );
    } else if (isSpeaking) {
      glowScale.value = withRepeat(
        withSequence(withTiming(1.14, { duration: 600 }), withTiming(1.0, { duration: 600 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.7, { duration: 600 }), withTiming(0.22, { duration: 600 })),
        -1, false
      );
      coreScale.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 600 }), withTiming(0.97, { duration: 600 })),
        -1, false
      );
    } else {
      glowScale.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 2200 }), withTiming(1.0, { duration: 2200 })),
        -1, false
      );
      glowOpacity.value = withRepeat(
        withSequence(withTiming(0.38, { duration: 2200 }), withTiming(0.12, { duration: 2200 })),
        -1, false
      );
      coreScale.value = withRepeat(
        withSequence(withTiming(1.03, { duration: 2200 }), withTiming(0.98, { duration: 2200 })),
        -1, false
      );
    }
  }, [isListening, isSpeaking]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coreScale.value }],
  }));

  const icon: any = isListening ? "stop-circle" : isSpeaking ? "volume-high" : !audioReady ? "hand-right" : "mic";
  const iconColor = "#FFFFFF";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressed && { opacity: 0.88 }]}
    >
      {/* ── Outer soft glow halo ── */}
      <Reanimated.View style={[styles.halo, { backgroundColor: accent }, glowStyle]} />

      {/* ── Pulsing wave rings (only when active) ── */}
      {(isListening || isSpeaking) && (
        <View style={styles.pulseContainer}>
          <PulseRing color={accent} delay={0} />
          <PulseRing color={accentMid} delay={700} />
          <PulseRing color={accentFar} delay={1400} />
        </View>
      )}

      {/* ── SVG base sphere + orbit rings ── */}
      <View style={styles.svgContainer}>
        {/* Orbit rings — each in its own rotating Animated.View */}
        <OrbRing rx={82} ry={18} color={accent}     sw={1.2} speed={baseSpeeds[0] / ringSpeed} phaseStart={0}   delay={0}   opacity={0.65} />
        <OrbRing rx={76} ry={34} color={accentMid}  sw={1.0} speed={baseSpeeds[1] / ringSpeed} phaseStart={55}  delay={180} opacity={0.55} />
        <OrbRing rx={64} ry={54} color={accentFar}  sw={0.9} speed={baseSpeeds[2] / ringSpeed} phaseStart={110} delay={360} opacity={0.50} />
        <OrbRing rx={42} ry={74} color={accent}     sw={0.9} speed={baseSpeeds[3] / ringSpeed} phaseStart={165} delay={540} opacity={0.45} />
        <OrbRing rx={20} ry={82} color={accentMid}  sw={1.1} speed={baseSpeeds[4] / ringSpeed} phaseStart={220} delay={720} opacity={0.60} />

        {/* Base sphere (drawn on top so orbit lines show only at the edges) */}
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id="sphereGrad" cx="45%" cy="40%" r="55%">
              <Stop offset="0%" stopColor="#1E40AF" stopOpacity="0.92" />
              <Stop offset="40%" stopColor="#0D1B4B" stopOpacity="0.97" />
              <Stop offset="100%" stopColor="#040814" stopOpacity="1" />
            </RadialGradient>
            <RadialGradient id="highlightGrad" cx="38%" cy="30%" r="38%">
              <Stop offset="0%" stopColor={accentMid} stopOpacity="0.28" />
              <Stop offset="100%" stopColor={accentMid} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={C} cy={C} r={R} fill="url(#sphereGrad)" />
          <Circle cx={C} cy={C} r={R} fill="url(#highlightGrad)" />
        </Svg>
      </View>

      {/* ── Icon ── */}
      <Reanimated.View style={[styles.iconWrap, coreStyle]}>
        <Ionicons name={icon} size={52} color={iconColor} />
      </Reanimated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  halo: {
    position: "absolute",
    width: SIZE * 0.92,
    height: SIZE * 0.92,
    borderRadius: SIZE * 0.46,
  },
  pulseContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    borderWidth: 2,
  },
  svgContainer: {
    width: SIZE,
    height: SIZE,
    position: "absolute",
  },
  iconWrap: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
