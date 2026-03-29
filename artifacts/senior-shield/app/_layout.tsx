import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { setBaseUrl } from "@workspace/api-client-react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PreferencesProvider } from "@/context/PreferencesContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

setBaseUrl(
  process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
    : "http://localhost:8080"
);

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const hasInitialRouted = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path.includes("google-callback") || hash.includes("access_token") || path.includes("welcome-tour")) {
        return;
      }
    }

    if (!hasInitialRouted.current) {
      hasInitialRouted.current = true;
      if (!user) {
        router.replace("/auth/welcome");
      } else if (!user.onboarding_completed) {
        router.replace("/onboarding/step1");
      } else {
        router.replace("/(tabs)/home");
      }
      return;
    }

    if (!user) {
      router.replace("/auth/welcome");
    } else if (!user.onboarding_completed) {
      router.replace("/onboarding/step1");
    } else {
      router.replace("/(tabs)/home");
    }
  }, [user, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="emergency" options={{ headerShown: false }} />
      <Stack.Screen name="support" options={{ headerShown: false }} />
      <Stack.Screen name="subscription" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <PreferencesProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </PreferencesProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
