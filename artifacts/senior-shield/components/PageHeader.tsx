import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { usePreferences } from "@/context/PreferencesContext";

interface PageHeaderProps {
  showTagline?: boolean;
}

export default function PageHeader({ showTagline = false }: PageHeaderProps) {
  const { theme } = useTheme();
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10),
          borderBottomColor: theme.border,
          backgroundColor: theme.card,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 4,
          elevation: 3,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Logo mark */}
        <View style={styles.logoMark}>
          <Ionicons name="shield-checkmark" size={18} color="#2563EB" />
        </View>

        {/* Brand name + optional tagline */}
        <View style={styles.brandText}>
          <Text style={[styles.appName, { color: theme.text, fontSize: ts.base }]}>
            SeniorShield
          </Text>
          {showTagline && (
            <Text style={[styles.tagline, { color: theme.textSecondary, fontSize: ts.xs }]} numberOfLines={1}>
              Your voice assistant for tech help and scam protection
            </Text>
          )}
        </View>

        {/* Protected pill */}
        <View style={styles.badge}>
          <Ionicons name="shield-checkmark" size={11} color="#2563EB" />
          <Text style={[styles.badgeText, { fontSize: ts.xs }]}>Protected</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandText: {
    flex: 1,
    gap: 1,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    color: "#2563EB",
  },
});
