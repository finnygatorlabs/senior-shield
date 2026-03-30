import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { usePreferences } from "@/context/PreferencesContext";

interface PremiumGateProps {
  visible: boolean;
  onClose: () => void;
  feature: string;
  usageCount?: number;
  usageLimit?: number;
  description?: string;
}

const GRADIENT: [string, string, string] = ["#06102E", "#0E2D6B", "#0B5FAA"];

const FEATURE_INFO: Record<string, { icon: string; benefits: string[] }> = {
  scam_analyze: {
    icon: "shield-checkmark",
    benefits: [
      "Unlimited scam analysis",
      "Real-time threat detection",
      "Advanced pattern recognition",
      "Priority support",
    ],
  },
  family_members: {
    icon: "people",
    benefits: [
      "Add up to 3 family members",
      "Instant scam alert notifications",
      "Weekly safety summaries",
      "Family coordination tools",
    ],
  },
};

export default function PremiumGate({
  visible,
  onClose,
  feature,
  usageCount,
  usageLimit,
  description,
}: PremiumGateProps) {
  const { theme } = useTheme();
  const { ts } = usePreferences();
  const router = useRouter();

  const info = FEATURE_INFO[feature] || FEATURE_INFO.scam_analyze;

  const handleUpgrade = () => {
    onClose();
    router.push("/subscription");
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>
          <LinearGradient
            colors={GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <Image
              source={require("../assets/images/logo-shield.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.brand, { fontSize: ts.lg }]}>SeniorShield</Text>
          </LinearGradient>

          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={32} color="#F59E0B" />
          </View>

          <View style={styles.body}>
            <Text style={[styles.title, { color: theme.text, fontSize: ts.xl }]}>
              Upgrade to Premium
            </Text>

            {usageCount !== undefined && usageLimit !== undefined && (
              <View style={styles.usageBadge}>
                <Ionicons name="information-circle" size={16} color="#F59E0B" />
                <Text style={styles.usageText}>
                  You've used {usageCount} of {usageLimit} free {feature === "scam_analyze" ? "scans" : "slots"}
                </Text>
              </View>
            )}

            <Text style={[styles.message, { color: theme.textSecondary, fontSize: ts.base }]}>
              {description || "Unlock this feature with a Premium subscription."}
            </Text>

            <View style={styles.benefitsList}>
              {info.benefits.map((benefit, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
                  <Text style={[styles.benefitText, { color: theme.text, fontSize: ts.sm }]}>
                    {benefit}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: theme.border, backgroundColor: theme.surface },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.cancelText, { color: theme.text, fontSize: ts.base }]}>
                Not Now
              </Text>
            </Pressable>

            <Pressable
              onPress={handleUpgrade}
              style={({ pressed }) => [styles.upgradeBtn, pressed && styles.pressed]}
            >
              <LinearGradient
                colors={["#16A34A", "#22C55E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.upgradeBtnGradient}
              >
                <Ionicons name="star" size={18} color="#FFFFFF" />
                <Text style={[styles.upgradeText, { fontSize: ts.base }]}>
                  Upgrade Now
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.60)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  logo: {
    width: 36,
    height: 36,
  },
  brand: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 28,
    marginBottom: 4,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 10,
  },
  title: {
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  usageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "center",
  },
  usageText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#92400E",
  },
  message: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  benefitsList: {
    gap: 8,
    marginTop: 8,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  benefitText: {
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelText: {
    fontFamily: "Inter_600SemiBold",
  },
  upgradeBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  upgradeBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 15,
  },
  upgradeText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.8,
  },
});
