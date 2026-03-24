import React from "react";
import { View, Text, StyleSheet, Platform, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePreferences } from "@/context/PreferencesContext";

interface PageHeaderProps {
  showTagline?: boolean;
}

const HEADER_BLUE = "#1E4CC8";

export default function PageHeader({ showTagline = false }: PageHeaderProps) {
  const { ts } = usePreferences();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 10) },
      ]}
    >
      <View style={styles.row}>
        {/* Custom shield logo */}
        <Image
          source={require("../assets/images/logo-shield.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Brand column: name+badge on top row, tagline below */}
        <View style={styles.brandCol}>
          {/* App name + Protected badge in same row */}
          <View style={styles.nameRow}>
            <Text
              style={[styles.appName, { fontSize: ts.h2 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              SeniorShield
            </Text>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={10} color="#FFFFFF" />
              <Text style={[styles.badgeText, { fontSize: 10 }]}>Protected</Text>
            </View>
          </View>

          {/* Tagline — full width, shrinks to fit */}
          {showTagline && (
            <Text
              style={[styles.tagline, { fontSize: ts.xs }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.68}
            >
              Your voice assistant for tech help and scam protection
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: HEADER_BLUE,
    paddingHorizontal: 14,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    flexShrink: 0,
  },
  brandCol: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    flexShrink: 1,
  },
  tagline: {
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.82)",
    lineHeight: 15,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    flexShrink: 0,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    color: "#FFFFFF",
  },
});
