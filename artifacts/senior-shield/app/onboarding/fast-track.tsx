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
import { familyApi, userApi } from "@/services/api";

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

const INTEREST_OPTIONS = [
  { label: "Gardening", icon: "leaf" as const },
  { label: "Sports", icon: "football" as const },
  { label: "Reading", icon: "book" as const },
  { label: "Cooking", icon: "restaurant" as const },
  { label: "Travel", icon: "airplane" as const },
  { label: "Movies", icon: "film" as const },
  { label: "Music", icon: "musical-notes" as const },
  { label: "Family", icon: "people" as const },
  { label: "History", icon: "time" as const },
  { label: "Faith", icon: "heart" as const },
  { label: "Crafts", icon: "color-palette" as const },
  { label: "News", icon: "newspaper" as const },
];

const RELATIONSHIPS = ["Son", "Daughter", "Grandchild", "Spouse", "Friend", "Caregiver", "Other"];

interface FamilyMember {
  name: string;
  relationship: string;
  email: string;
}

export default function FastTrackOnboarding() {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRelationship, setMemberRelationship] = useState("Son");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalSteps = 4;

  function goToStep(step: number) {
    setCurrentStep(step);
    scrollRef.current?.scrollTo({ x: step * width, animated: true });
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const page = Math.round(e.nativeEvent.contentOffset.x / width);
    if (page !== currentStep) {
      setCurrentStep(page);
    }
  }

  function toggleInterest(interest: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter(i => i !== interest));
    } else if (selectedInterests.length < 5) {
      setSelectedInterests([...selectedInterests, interest]);
    }
  }

  function addFamilyMember() {
    if (memberName.trim() && memberEmail.trim() && familyMembers.length < 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFamilyMembers([...familyMembers, { name: memberName.trim(), email: memberEmail.trim(), relationship: memberRelationship }]);
      setMemberName("");
      setMemberEmail("");
      setMemberRelationship("Son");
    }
  }

  function removeFamilyMember(index: number) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  }

  async function handleComplete() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);

    try {
      const baseUrl = process.env.EXPO_PUBLIC_DOMAIN
        ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
        : "http://localhost:8080";

      if (firstName.trim() && user?.token) {
        const profileUpdate: any = { first_name: firstName.trim() };
        if (lastName.trim()) profileUpdate.last_name = lastName.trim();
        await userApi.updateProfile(profileUpdate, user.token).catch(() => {});
        const nameUpdates: any = { first_name: firstName.trim() };
        if (lastName.trim()) nameUpdates.last_name = lastName.trim();
        updateUser(nameUpdates);
      }

      if (selectedInterests.length > 0 && user?.token) {
        await userApi.updatePreferences({ interests: selectedInterests }, user.token).catch(() => {});
      }

      await fetch(`${baseUrl}/api/admin/learning-api/onboarding/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id || "anonymous",
          name: firstName.trim() || user?.name || "Friend",
          interests: selectedInterests,
          familyMembers,
        }),
      }).catch(() => {});

      if (familyMembers.length > 0 && user?.token) {
        await Promise.allSettled(
          familyMembers.map((m) =>
            familyApi.addMember(m.email, m.relationship.toLowerCase(), user.token, m.name)
          )
        );
      }
    } catch {}

    if (user?.token) {
      await userApi.updateProfile({ onboarding_step: 1 }, user.token).catch(() => {});
    }
    updateUser({ onboarding_step: 1 });
    router.replace("/onboarding/health-awareness");
  }

  function handleSkip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (user?.token) {
      userApi.updateProfile({ onboarding_step: 1 }, user.token).catch(() => {});
    }
    updateUser({ onboarding_step: 1 });
    router.replace("/onboarding/health-awareness");
  }

  if (isSubmitting) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIconBg}>
            <Ionicons name="sparkles" size={40} color="#34D399" />
          </View>
          <ActivityIndicator size="large" color="#FFFFFF" style={{ marginBottom: 16 }} />
          <Text style={styles.loadingTitle}>Setting up your profile...</Text>
          <Text style={styles.loadingSubtitle}>
            Your AI companion is learning about you
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <DecoCircle size={260} top={-80} right={-100} opacity={0.08} />
      <DecoCircle size={300} top={-120} left={-150} opacity={0.06} />
      <DecoCircle size={180} top={400} left={-90} opacity={0.04} />

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.progressDots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i <= currentStep ? "#FFFFFF" : "rgba(255,255,255,0.25)",
                  width: i === currentStep ? 24 : 8,
                },
              ]}
            />
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
        {/* Step 1: Welcome */}
        <View style={[styles.slide, { width }]}>
          <ScrollView contentContainerStyle={styles.slideContent} showsVerticalScrollIndicator={false}>
            <View style={styles.iconCircle}>
              <Ionicons name="hand-left" size={56} color="#34D399" />
            </View>
            <Text style={styles.heading}>Let's get to{"\n"}know you!</Text>
            <Text style={styles.subheading}>
              Take a few moments to tell us a bit about yourself so your AI companion can have more personal, meaningful conversations with you.
            </Text>
            <View style={styles.benefitCard}>
              <Ionicons name="chatbubbles" size={20} color="#60A5FA" />
              <Text style={styles.benefitText}>
                Your AI will remember your interests, family, and preferences to make every conversation feel personal.
              </Text>
            </View>
          </ScrollView>
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              onPress={() => goToStep(1)}
            >
              <Text style={styles.primaryButtonText}>Let's Go!</Text>
              <Ionicons name="arrow-forward" size={20} color="#0E2D6B" />
            </Pressable>
          </View>
        </View>

        {/* Step 2: Name */}
        <View style={[styles.slide, { width }]}>
          <ScrollView contentContainerStyle={styles.slideContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepLabel}>Step 1 of 3</Text>
            <Text style={styles.heading}>What should we{"\n"}call you?</Text>
            <Text style={styles.subheading}>
              We'd love to know who we're talking to!
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={22} color="rgba(255,255,255,0.5)" />
              <TextInput
                style={styles.textInput}
                placeholder="First name"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
            <View style={[styles.inputWrapper, { marginTop: 12 }]}>
              <Ionicons name="person-outline" size={22} color="rgba(255,255,255,0.5)" />
              <TextInput
                style={styles.textInput}
                placeholder="Last name"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                returnKeyType="next"
              />
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
                disabled={!firstName.trim()}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
                <Ionicons name="arrow-forward" size={20} color="#0E2D6B" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Step 3: Interests */}
        <View style={[styles.slide, { width }]}>
          <ScrollView contentContainerStyle={styles.slideContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepLabel}>Step 2 of 3</Text>
            <Text style={styles.heading}>What do you{"\n"}enjoy?</Text>
            <Text style={styles.subheading}>
              Pick up to 5 interests so we can chat about things you love
            </Text>
            <View style={styles.interestsGrid}>
              {INTEREST_OPTIONS.map((item) => {
                const isSelected = selectedInterests.includes(item.label);
                return (
                  <Pressable
                    key={item.label}
                    onPress={() => toggleInterest(item.label)}
                    style={[
                      styles.interestChip,
                      isSelected && styles.interestChipSelected,
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={18}
                      color={isSelected ? "#FFFFFF" : "rgba(255,255,255,0.6)"}
                    />
                    <Text
                      style={[
                        styles.interestChipText,
                        isSelected && styles.interestChipTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={16} color="#34D399" />
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.counterText}>
              {selectedInterests.length}/5 selected
            </Text>
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

        {/* Step 4: Family */}
        <View style={[styles.slide, { width }]}>
          <ScrollView contentContainerStyle={styles.slideContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepLabel}>Step 3 of 3</Text>
            <Text style={styles.heading}>Tell us about{"\n"}your family</Text>
            <Text style={styles.subheading}>
              This helps your AI companion have more personal conversations. Additional members can be added later under the Family tab.
            </Text>

            {familyMembers.length > 0 && (
              <View style={styles.familyList}>
                {familyMembers.map((member, index) => (
                  <View key={index} style={styles.familyCard}>
                    <View style={styles.familyCardIcon}>
                      <Ionicons name="person" size={20} color="#FFFFFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.familyName}>{member.name}</Text>
                      <Text style={styles.familyRel}>{member.relationship} · {member.email}</Text>
                    </View>
                    <Pressable onPress={() => removeFamilyMember(index)} hitSlop={10}>
                      <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.4)" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {familyMembers.length < 1 && (
              <View style={styles.addFamilySection}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-add-outline" size={20} color="rgba(255,255,255,0.5)" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Family member's name"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={memberName}
                    onChangeText={setMemberName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={[styles.inputWrapper, { marginTop: 10 }]}>
                  <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.5)" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Their email (for scam alerts)"
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    value={memberEmail}
                    onChangeText={setMemberEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.relGrid}>
                  {RELATIONSHIPS.map(rel => (
                    <Pressable
                      key={rel}
                      onPress={() => {
                        setMemberRelationship(rel);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.relChip,
                        memberRelationship === rel && styles.relChipSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.relChipText,
                          memberRelationship === rel && styles.relChipTextSelected,
                        ]}
                      >
                        {rel}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={[styles.addButton, (!memberName.trim() || !memberEmail.trim()) && { opacity: 0.5 }]}
                  onPress={addFamilyMember}
                  disabled={!memberName.trim() || !memberEmail.trim()}
                >
                  <Ionicons name="add-circle" size={20} color="#34D399" />
                  <Text style={styles.addButtonText}>Add Family Member</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.bottomRow}>
              <Pressable onPress={() => goToStep(2)} style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.primaryButton, { flex: 1 }, pressed && styles.pressed]}
                onPress={handleComplete}
              >
                <Text style={styles.primaryButtonText}>All Done!</Text>
                <Ionicons name="checkmark-circle" size={22} color="#0E2D6B" />
              </Pressable>
            </View>
            <Pressable onPress={handleSkip} style={styles.skipLink}>
              <Text style={styles.skipLinkText}>Skip for now</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  loadingIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  },
  loadingSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginTop: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  progressDots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
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
  slide: { flex: 1 },
  slideContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 200,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(52,211,153,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  stepLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#34D399",
    marginBottom: 12,
  },
  heading: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    lineHeight: 38,
    marginBottom: 12,
  },
  subheading: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 24,
    marginBottom: 24,
  },
  benefitCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 20,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: "#FFFFFF",
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  interestChip: {
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
  interestChipSelected: {
    borderColor: "rgba(52,211,153,0.5)",
    backgroundColor: "rgba(52,211,153,0.15)",
  },
  interestChipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
  },
  interestChipTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  counterText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
  },
  familyList: {
    gap: 10,
    marginBottom: 20,
  },
  familyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  familyCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(96,165,250,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  familyName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  familyRel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  addFamilySection: {
    gap: 4,
  },
  relGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  relChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.15)",
  },
  relChipSelected: {
    borderColor: "rgba(52,211,153,0.5)",
    backgroundColor: "rgba(52,211,153,0.15)",
  },
  relChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.6)",
  },
  relChipTextSelected: {
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.3)",
    backgroundColor: "rgba(52,211,153,0.1)",
  },
  addButtonText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#34D399",
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
});
