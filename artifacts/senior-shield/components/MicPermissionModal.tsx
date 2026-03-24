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
import { useTheme } from "@/hooks/useTheme";
import { usePreferences } from "@/context/PreferencesContext";

interface MicPermissionModalProps {
  visible: boolean;
  assistantName: string;
  onEnable: () => void;
  onTypeInstead: () => void;
}

const GRADIENT: [string, string, string] = ["#06102E", "#0E2D6B", "#0B5FAA"];

export default function MicPermissionModal({
  visible,
  assistantName,
  onEnable,
  onTypeInstead,
}: MicPermissionModalProps) {
  const { theme } = useTheme();
  const { ts } = usePreferences();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.card }]}>

          {/* Gradient header */}
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

          {/* Mic icon */}
          <View style={styles.micCircle}>
            <Ionicons name="mic" size={32} color="#2563EB" />
          </View>

          {/* Text */}
          <View style={styles.body}>
            <Text style={[styles.title, { color: theme.text, fontSize: ts.xl }]}>
              Microphone Access
            </Text>
            <Text style={[styles.desc, { color: theme.textSecondary, fontSize: ts.base }]}>
              {assistantName} listens to your voice to answer questions,
              detect scams, and give step-by-step help — all hands-free.
            </Text>
            <Text style={[styles.note, { color: theme.textTertiary, fontSize: ts.sm }]}>
              Your conversations are private and never stored without your consent.
            </Text>
          </View>

          {/* Buttons */}
          <Pressable
            onPress={onEnable}
            style={({ pressed }) => [styles.enableBtn, pressed && styles.pressed]}
          >
            <Ionicons name="mic" size={18} color="#FFFFFF" />
            <Text style={[styles.enableText, { fontSize: ts.base }]}>
              Enable Voice
            </Text>
          </Pressable>

          <Pressable
            onPress={onTypeInstead}
            style={({ pressed }) => [styles.typeBtn, pressed && styles.pressed]}
          >
            <Text style={[styles.typeText, { color: theme.textSecondary, fontSize: ts.sm }]}>
              I'll type instead
            </Text>
          </Pressable>

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
    shadowOpacity: 0.30,
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
  micCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 28,
    marginBottom: 4,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 10,
  },
  title: {
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  desc: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  note: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginTop: 2,
  },
  enableBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563EB",
    marginHorizontal: 24,
    marginBottom: 12,
    paddingVertical: 16,
    borderRadius: 16,
  },
  enableText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  typeBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 8,
  },
  typeText: {
    fontFamily: "Inter_400Regular",
  },
  pressed: {
    opacity: 0.80,
  },
});
