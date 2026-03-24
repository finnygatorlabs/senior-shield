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

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  icon?: keyof typeof import("@expo/vector-icons/build/Icons").Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
}

const GRADIENT: [string, string, string] = ["#06102E", "#0E2D6B", "#0B5FAA"];

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  icon = "alert-circle-outline",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
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

          {/* Branded header */}
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

          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: destructive ? "#FEF2F2" : "#EFF6FF" }]}>
            <Ionicons
              name={icon}
              size={32}
              color={destructive ? "#DC2626" : "#2563EB"}
            />
          </View>

          {/* Content */}
          <View style={styles.body}>
            <Text style={[styles.title, { color: theme.text, fontSize: ts.xl }]}>
              {title}
            </Text>
            <Text style={[styles.message, { color: theme.textSecondary, fontSize: ts.base }]}>
              {message}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: theme.border, backgroundColor: theme.surface },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.cancelText, { color: theme.text, fontSize: ts.base }]}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                { backgroundColor: destructive ? "#DC2626" : "#2563EB" },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.confirmText, { fontSize: ts.base }]}>
                {confirmLabel}
              </Text>
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
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 28,
    marginBottom: 4,
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 10,
  },
  title: {
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  message: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
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
  confirmBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  confirmText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.80,
  },
});
