import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const STORAGE_KEY = "seniorshield_user";

export default function GoogleCallbackScreen() {
  const [error, setError] = useState("");

  useEffect(() => {
    if (Platform.OS !== "web") return;

    async function handleGoogleRedirect() {
      try {
        const hash = window.location.hash;
        const search = window.location.search;
        console.log("[GoogleCallback] URL hash:", hash?.substring(0, 100));
        console.log("[GoogleCallback] URL search:", search?.substring(0, 100));

        let accessToken: string | null = null;

        if (hash && hash.includes("access_token")) {
          const params = new URLSearchParams(hash.substring(1));
          accessToken = params.get("access_token");
        }

        if (!accessToken && search) {
          const params = new URLSearchParams(search);
          accessToken = params.get("access_token");
        }

        if (!accessToken) {
          console.log("[GoogleCallback] No access_token found in URL");
          setError("No access token received from Google.");
          return;
        }

        console.log("[GoogleCallback] Got access_token, calling backend...");

        const domain = process.env.EXPO_PUBLIC_DOMAIN;
        const base = domain ? `https://${domain}` : "http://localhost:8080";
        const response = await fetch(`${base}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token: accessToken, user_type: "senior" }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.log("[GoogleCallback] Backend error:", data.message);
          setError(data.message || "Google sign-in failed");
          return;
        }

        console.log("[GoogleCallback] Login successful, storing user data...");

        const userData = {
          user_id: data.user_id,
          token: data.token,
          user_type: data.user_type,
          first_name: data.first_name,
          last_name: data.last_name,
          onboarding_completed: data.onboarding_completed,
          email_verified: data.email_verified,
        };

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        console.log("[GoogleCallback] User data stored in AsyncStorage");

        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({ type: "google-auth-success", userData }, "*");
            console.log("[GoogleCallback] Sent postMessage to opener, closing popup...");
            window.close();
            return;
          } catch (e) {
            console.log("[GoogleCallback] postMessage failed, will redirect instead");
          }
        }

        console.log("[GoogleCallback] No opener found, redirecting in main window...");
        window.location.hash = "";
        if (data.onboarding_completed) {
          router.replace("/(tabs)/home");
        } else {
          router.replace("/onboarding/step1");
        }
      } catch (err: any) {
        console.error("[GoogleCallback] Error:", err);
        setError(err.message || "Something went wrong");
      }
    }

    const timer = setTimeout(handleGoogleRedirect, 100);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#06102E", padding: 24 }}>
        <Text style={{ color: "#FCA5A5", fontSize: 16, textAlign: "center", marginBottom: 16 }}>{error}</Text>
        <Text
          style={{ color: "#60A5FA", fontSize: 14 }}
          onPress={() => router.replace("/auth/login")}
        >
          Back to Sign In
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#06102E" }}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={{ color: "#94A3B8", marginTop: 16, fontSize: 14 }}>Completing sign in...</Text>
    </View>
  );
}
