import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  StatusBar,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { userApi } from "@/services/api";

const shieldLogo = require("@/assets/seniorshield-logo-nobg.png");

const { width, height } = Dimensions.get("window");
const GRADIENT: [string, string, string] = ["#06102E", "#0E2D6B", "#0B5FAA"];

const SLIDES = [
  {
    icon: "shield-checkmark" as const,
    iconColor: "#34D399",
    title: "Welcome to\nSeniorShield!",
    subtitle: "Let's take a quick look at what your app can do. This will only take a moment.",
    highlight: "Swipe or tap Next to continue",
  },
  {
    icon: "mic" as const,
    iconColor: "#60A5FA",
    title: "Voice Assistant",
    subtitle: "Tap the microphone and talk naturally. Ask questions, get help with general tasks and technical challenges, or just have a friendly conversation.",
    highlight: "Your personal tech helper is always ready",
  },
  {
    icon: "warning" as const,
    iconColor: "#F59E0B",
    title: "Scam Detection",
    subtitle: "Paste any suspicious text message, email, or phone number and we'll analyze it instantly. We catch 95% of known scam patterns.",
    highlight: "Stay protected from fraud and scams",
  },
  {
    icon: "alert-circle" as const,
    iconColor: "#EF4444",
    title: "Emergency SOS",
    subtitle: "One tap sends an instant alert to your family members with your location. Help is always just a button press away.",
    highlight: "Your family gets notified immediately",
  },
  {
    icon: "calendar" as const,
    iconColor: "#A78BFA",
    title: "Reminders & History",
    subtitle: "Set daily reminders for medications, appointments, and tasks. Review your past conversations and scam checks anytime.",
    highlight: "Never miss what matters most",
  },
  {
    icon: "settings" as const,
    iconColor: "#6EE7B7",
    title: "You're All Set!",
    subtitle: "Customize text size, voice, and more in Settings anytime. We're here to make technology simple and safe for you.",
    highlight: "Tap 'Get Started' to begin",
  },
];

export default function WelcomeTour() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page !== currentSlide) {
      setCurrentSlide(page);
    }
  }

  function goNext() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentSlide < SLIDES.length - 1) {
      const nextSlide = currentSlide + 1;
      scrollRef.current?.scrollTo({ x: nextSlide * width, animated: true });
      setCurrentSlide(nextSlide);
    } else {
      finish();
    }
  }

  function finish() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (user?.token) {
      userApi.updateProfile({ onboarding_completed: true }, user.token).catch(() => {});
    }
    updateUser({ onboarding_completed: true });
    router.replace("/(tabs)/home");
  }

  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        {!isLast && (
          <Pressable onPress={finish} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip Tour</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {SLIDES.map((slide, index) => (
          <View key={index} style={[styles.slide, { width }]}>
            {index === 0 ? (
              <Image source={shieldLogo} style={styles.logoImage} resizeMode="contain" />
            ) : (
              <View style={[styles.iconCircle, { backgroundColor: `${slide.iconColor}20` }]}>
                <View style={[styles.iconInner, { backgroundColor: `${slide.iconColor}30` }]}>
                  <Ionicons name={slide.icon} size={56} color={slide.iconColor} />
                </View>
              </View>
            )}

            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>

            <View style={[styles.highlightBox, { borderColor: `${slide.iconColor}40` }]}>
              <Ionicons name="sparkles" size={16} color={slide.iconColor} />
              <Text style={[styles.highlightText, { color: slide.iconColor }]}>{slide.highlight}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentSlide ? "#FFFFFF" : "rgba(255,255,255,0.25)",
                  width: i === currentSlide ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
          onPress={goNext}
        >
          <Text style={styles.nextButtonText}>
            {isLast ? "Get Started" : "Next"}
          </Text>
          <Ionicons
            name={isLast ? "checkmark-circle" : "arrow-forward"}
            size={22}
            color="#0E2D6B"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  skipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
  },
  scrollView: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoImage: {
    width: 140,
    height: 140,
    marginBottom: 32,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  slideTitle: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 16,
  },
  slideSubtitle: {
    fontSize: 17,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 26,
    marginBottom: 24,
    maxWidth: 320,
  },
  highlightBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  highlightText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 20,
    zIndex: 10,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  nextButtonText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#0E2D6B",
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
});
