import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { healthAwarenessApi, userApi } from "@/services/api";

const { width } = Dimensions.get("window");
const GRADIENT: [string, string, string] = ["#06102E", "#0E2D6B", "#0B5FAA"];

function DecoCircle({ size, top, left, right, opacity }: { size: number; top?: number; left?: number; right?: number; opacity: number }) {
  return (
    <View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: `rgba(255,255,255,${opacity})`,
        top,
        left,
        right,
      }}
    />
  );
}

const HEALTH_OPTIONS = [
  { value: "excellent", label: "Excellent", icon: "sunny" as const },
  { value: "good", label: "Good", icon: "partly-sunny" as const },
  { value: "fair", label: "Fair", icon: "cloudy" as const },
  { value: "managing", label: "Managing challenges", icon: "rainy" as const },
  { value: "prefer_not", label: "Prefer not to say", icon: "remove-circle-outline" as const },
];

const CHRONIC_CONDITIONS = [
  { label: "Arthritis", icon: "body" as const },
  { label: "Diabetes", icon: "water" as const },
  { label: "Heart condition", icon: "heart" as const },
  { label: "High blood pressure", icon: "pulse" as const },
  { label: "Respiratory/asthma", icon: "cloud" as const },
  { label: "Mobility issues", icon: "walk" as const },
  { label: "Chronic pain", icon: "bandage" as const },
  { label: "Kidney disease", icon: "fitness" as const },
  { label: "Cancer", icon: "medkit" as const },
  { label: "Memory concerns", icon: "bulb" as const },
  { label: "Depression/Anxiety", icon: "sad" as const },
  { label: "Osteoporosis", icon: "body" as const },
  { label: "Prefer not to say", icon: "remove-circle-outline" as const },
];

const MOBILITY_OPTIONS = [
  { value: "independent", label: "Walk independently", icon: "walk" as const },
  { value: "assistance", label: "Walk with assistance (cane, walker)", icon: "accessibility" as const },
  { value: "wheelchair", label: "Wheelchair", icon: "car" as const },
  { value: "limited", label: "Limited mobility", icon: "home" as const },
  { value: "prefer_not", label: "Prefer not to say", icon: "remove-circle-outline" as const },
];

const HEARING_VISION_OPTIONS = [
  { label: "Hearing aids / Hard of hearing", icon: "ear" as const },
  { label: "Vision challenges / Glasses needed", icon: "eye" as const },
  { label: "Both hearing and vision considerations", icon: "glasses" as const },
  { label: "Neither", icon: "checkmark-circle" as const },
  { label: "Prefer not to say", icon: "remove-circle-outline" as const },
];

export default function HealthAwarenessOnboarding() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [generalHealth, setGeneralHealth] = useState("");
  const [chronicConditions, setChronicConditions] = useState<string[]>([]);
  const [mobilityLevel, setMobilityLevel] = useState("");
  const [hearingVision, setHearingVision] = useState<string[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function goToStep(step: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(step);
    scrollRef.current?.scrollTo({ x: step * width, animated: true });
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const step = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentStep(step);
  }

  function toggleCondition(condition: string) {
    if (condition === "Prefer not to say") {
      setChronicConditions(chronicConditions.includes(condition) ? [] : [condition]);
      return;
    }
    const filtered = chronicConditions.filter((c) => c !== "Prefer not to say");
    if (filtered.includes(condition)) {
      setChronicConditions(filtered.filter((c) => c !== condition));
    } else {
      setChronicConditions([...filtered, condition]);
    }
  }

  function toggleHearingVision(option: string) {
    if (option === "Neither" || option === "Prefer not to say") {
      setHearingVision(hearingVision.includes(option) ? [] : [option]);
      return;
    }
    const filtered = hearingVision.filter((h) => h !== "Neither" && h !== "Prefer not to say");
    if (filtered.includes(option)) {
      setHearingVision(filtered.filter((h) => h !== option));
    } else {
      setHearingVision([...filtered, option]);
    }
  }

  async function handleComplete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);

    try {
      if (user?.token) {
        await healthAwarenessApi.saveProfile({
          general_health: generalHealth || null,
          chronic_conditions: chronicConditions,
          mobility_level: mobilityLevel || null,
          hearing_vision: hearingVision,
          additional_notes: additionalNotes.filter(n => n.trim()).join("; ") || null,
        }, user.token).catch(() => {});

        await userApi.updateProfile({ onboarding_step: 2 }, user.token).catch(() => {});
      }
    } catch {}

    updateUser({ onboarding_step: 2 });
    router.replace("/onboarding/welcome-tour" as any);
  }

  function handleSkip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user?.token) {
      userApi.updateProfile({ onboarding_step: 2 }, user.token).catch(() => {});
    }
    updateUser({ onboarding_step: 2 });
    router.replace("/onboarding/welcome-tour" as any);
  }

  if (isSubmitting) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconBg}>
            <Ionicons name="medkit" size={40} color="#34D399" />
          </View>
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginBottom: 16 }} />
          <Text style={styles.loadingTitle}>Saving your health profile...</Text>
          <Text style={styles.loadingSubtitle}>
            Your AI companion is learning how to best support you
          </Text>
        </View>
      </View>
    );
  }

  const TOTAL_STEPS = 5;
  const stepDots = Array.from({ length: TOTAL_STEPS }, (_, i) => i);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <DecoCircle size={220} top={-60} right={-80} opacity={0.06} />
      <DecoCircle size={140} top={120} left={-50} opacity={0.04} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <View style={styles.dotsRow}>
          {stepDots.map((i) => (
            <View key={i} style={[styles.dot, currentStep === i && styles.dotActive]} />
          ))}
        </View>
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        {/* Step 0: Intro */}
        <View style={[styles.slide, { width }]}>
          <ScrollView contentContainerStyle={styles.slideContent} showsVerticalScrollIndicator={false}>
            <View style={styles.iconCircle}>
              <Ionicons name="medkit" size={56} color="#34D399" />
            </View>
            <Text style={styles.heading}>Help us understand{"\n"}you better</Text>
            <Text style={styles.subheading}>
              A few optional questions about your health and accessibility needs
            </Text>
            <View style={styles.benefitCard}>
              <Ionicons name="sparkles" size={20} color="#60A5FA" />
              <Text style={styles.benefitText}>
                This helps your AI companion give you more personalized and relevant suggestions. For example, suggesting accessible options when needed.
              </Text>
            </View>
            <View style={styles.privacyCard}>
              <Ionicons name="shield-checkmark" size={18} color="#34D399" />
              <Text style={styles.privacyText}>
                All information is optional. You can skip any question or choose "prefer not to say."
              </Text>
            </View>
          </ScrollView>
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              onPress={() => goToStep(1)}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#0E2D6B" />
            </Pressable>
            <Pressable onPress={handleSkip} style={styles.skipLink}>
              <Text style={styles.skipLinkText}>Skip for now</Text>
            </Pressable>
          </View>
        </View>

        {/* Step 1: General Health */}
        <View style={[styles.slide, { width }]}>
          <ScrollView contentContainerStyle={styles.slideContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepLabel}>Step 1 of 4</Text>
            <Text style={styles.heading}>How would you describe{"\n"}your overall health?</Text>
            <Text style={styles.subheading}>
              This helps us give you suggestions that work for your situation.
            </Text>
            <View style={styles.optionsGrid}>
              {HEALTH_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.optionChip, generalHealth === option.value && styles.optionChipSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setGeneralHealth(option.value);
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={generalHealth === option.value ? "#FFFFFF" : "rgba(255,255,255,0.5)"}
                  />
                  <Text style={[styles.optionChipText, generalHealth === option.value && styles.optionChipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.bottomRow}>
              <Pressable onPress={() => goToStep(0)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, { flex: 1 }, pressed && styles.pressed]}
                onPress={() => goToStep(2)}
                disabled={!generalHealth}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#0E2D6B" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Step 2: Chronic Conditions */}
        <View style={[styles.slide, { width }]}>
          <ScrollView contentContainerStyle={styles.slideContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepLabel}>Step 2 of 4</Text>
            <Text style={styles.heading}>Any chronic{"\n"}conditions?</Text>
            <Text style={styles.subheading}>
              Select all that apply. This helps us suggest activities that work for you.
            </Text>
            <View style={styles.conditionsGrid}>
              {CHRONIC_CONDITIONS.map((condition) => (
                <Pressable
                  key={condition.label}
                  style={[styles.conditionChip, chronicConditions.includes(condition.label) && styles.conditionChipSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleCondition(condition.label);
                  }}
                >
                  <Ionicons
                    name={condition.icon}
                    size={18}
                    color={chronicConditions.includes(condition.label) ? "#FFFFFF" : "rgba(255,255,255,0.5)"}
                  />
                  <Text style={[styles.conditionChipText, chronicConditions.includes(condition.label) && styles.conditionChipTextSelected]}>
                    {condition.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 16, marginBottom: 8 }}>
              Other conditions not listed? (optional)
            </Text>
            {additionalNotes.map((note, idx) => (
              <View key={idx} style={[styles.inputWrapper, { marginTop: idx === 0 ? 0 : 4, paddingVertical: 4, minHeight: 0 }]}>
                <Ionicons name="add-circle-outline" size={14} color="rgba(255,255,255,0.35)" />
                <TextInput
                  style={[styles.textInput, { fontSize: 13, paddingVertical: 4 }]}
                  placeholder={
                    idx === 0 ? "e.g. Parkinson's disease" :
                    idx === 1 ? "e.g. Thyroid condition" :
                    idx === 2 ? "e.g. Stroke history" :
                    idx === 3 ? "e.g. Sleep apnea" :
                    idx === 4 ? "e.g. Neuropathy" :
                    "e.g. Other condition"
                  }
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={note}
                  onChangeText={(text) => {
                    const updated = [...additionalNotes];
                    updated[idx] = text;
                    setAdditionalNotes(updated);
                  }}
                />
              </View>
            ))}
          </ScrollView>
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.bottomRow}>
              <Pressable onPress={() => goToStep(1)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, { flex: 1 }, pressed && styles.pressed]}
                onPress={() => goToStep(3)}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#0E2D6B" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Step 3: Mobility */}
        <View style={[styles.slide, { width }]}>
          <ScrollView contentContainerStyle={styles.slideContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepLabel}>Step 3 of 4</Text>
            <Text style={styles.heading}>How do you{"\n"}get around?</Text>
            <Text style={styles.subheading}>
              This helps us suggest activities that are accessible for you.
            </Text>
            <View style={styles.optionsGrid}>
              {MOBILITY_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[styles.optionChip, mobilityLevel === option.value && styles.optionChipSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setMobilityLevel(option.value);
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={mobilityLevel === option.value ? "#FFFFFF" : "rgba(255,255,255,0.5)"}
                  />
                  <Text style={[styles.optionChipText, mobilityLevel === option.value && styles.optionChipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.bottomRow}>
              <Pressable onPress={() => goToStep(2)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, { flex: 1 }, pressed && styles.pressed]}
                onPress={() => goToStep(4)}
                disabled={!mobilityLevel}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#0E2D6B" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Step 4: Hearing/Vision */}
        <View style={[styles.slide, { width }]}>
          <ScrollView contentContainerStyle={styles.slideContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepLabel}>Step 4 of 4</Text>
            <Text style={styles.heading}>Hearing or vision{"\n"}considerations?</Text>
            <Text style={styles.subheading}>
              Select all that apply. This helps us communicate in the best way for you.
            </Text>
            <View style={styles.conditionsGrid}>
              {HEARING_VISION_OPTIONS.map((option) => (
                <Pressable
                  key={option.label}
                  style={[styles.conditionChip, hearingVision.includes(option.label) && styles.conditionChipSelected]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleHearingVision(option.label);
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={hearingVision.includes(option.label) ? "#FFFFFF" : "rgba(255,255,255,0.5)"}
                  />
                  <Text style={[styles.conditionChipText, hearingVision.includes(option.label) && styles.conditionChipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.bottomRow}>
              <Pressable onPress={() => goToStep(3)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, { flex: 1 }, pressed && styles.pressed]}
                onPress={handleComplete}
              >
                <Text style={styles.primaryButtonText}>All Done!</Text>
                <Ionicons name="checkmark" size={20} color="#0E2D6B" />
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  slide: { flex: 1 },
  slideContent: {
    paddingHorizontal: 24,
    paddingBottom: 140,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    zIndex: 10,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  dotActive: {
    width: 24,
    backgroundColor: "#34D399",
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
    color: "rgba(255,255,255,0.7)",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(52,211,153,0.15)",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
    marginBottom: 24,
    marginTop: 20,
  },
  heading: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 40,
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 24,
    marginBottom: 24,
  },
  stepLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#34D399",
    marginBottom: 8,
    marginTop: 20,
  },
  benefitCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "rgba(96,165,250,0.1)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.2)",
    marginBottom: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
  },
  privacyCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(52,211,153,0.08)",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.15)",
  },
  privacyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    lineHeight: 18,
  },
  optionsGrid: {
    gap: 10,
    marginBottom: 12,
  },
  optionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  optionChipSelected: {
    borderColor: "rgba(52,211,153,0.5)",
    backgroundColor: "rgba(52,211,153,0.15)",
  },
  optionChipText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
  },
  optionChipTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  conditionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  conditionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  conditionChipSelected: {
    borderColor: "rgba(52,211,153,0.5)",
    backgroundColor: "rgba(52,211,153,0.15)",
  },
  conditionChipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
  },
  conditionChipTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
    minHeight: 60,
    textAlignVertical: "top",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
    zIndex: 10,
  },
  bottomRow: {
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  primaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#0E2D6B",
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  skipLink: { alignItems: "center", paddingVertical: 4 },
  skipLinkText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(52,211,153,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    lineHeight: 22,
  },
});
