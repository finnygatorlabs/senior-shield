import { Platform } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const FALLBACK_ID = "not-configured";

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || FALLBACK_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || FALLBACK_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || FALLBACK_ID,
  });

  const isConfigured = Platform.select({
    ios: !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    android: !!process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    default: !!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  return {
    request,
    response,
    promptAsync,
    isConfigured,
  };
}
