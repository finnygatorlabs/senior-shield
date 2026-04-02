import type { Notification, NotificationResponse } from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PUSH_TOKEN_KEY = "seniorshield_push_token";
const EXPO_TOKEN_KEY = "seniorshield_expo_token";

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

let Notifications: typeof import("expo-notifications") | null = null;

async function loadNotifications() {
  if (Notifications) return Notifications;
  if (isExpoGo()) {
    console.log("[Notifications] Remote push not available in Expo Go (SDK 53+). Skipping.");
    return null;
  }
  try {
    Notifications = await import("expo-notifications");
    return Notifications;
  } catch (e) {
    console.log("[Notifications] Failed to load expo-notifications:", e);
    return null;
  }
}

export async function initNotificationHandler() {
  const mod = await loadNotifications();
  if (!mod) return;
  mod.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<{
  deviceToken: string | null;
  expoPushToken: string | null;
}> {
  const mod = await loadNotifications();
  if (!mod) {
    return { deviceToken: null, expoPushToken: null };
  }

  if (!Device.isDevice) {
    console.log("[Notifications] Must use physical device for push notifications");
    return { deviceToken: null, expoPushToken: null };
  }

  try {
    const { status: existingStatus } = await mod.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await mod.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Notifications] Permission not granted");
      return { deviceToken: null, expoPushToken: null };
    }

    if (Platform.OS === "android") {
      await mod.setNotificationChannelAsync("reminders", {
        name: "Reminders",
        importance: mod.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
      });
    }

    const nativeTokenData = await mod.getDevicePushTokenAsync();
    const deviceToken = nativeTokenData.data as string;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, deviceToken);

    let expoPushToken: string | null = null;
    try {
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      const expoTokenData = await mod.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      });
      expoPushToken = expoTokenData.data;
      await AsyncStorage.setItem(EXPO_TOKEN_KEY, expoPushToken);
    } catch (e) {
      console.log("[Notifications] Could not get Expo push token:", e);
    }

    console.log("[Notifications] Device token acquired");
    return { deviceToken, expoPushToken };
  } catch (error) {
    console.error("[Notifications] Error registering:", error);
    return { deviceToken: null, expoPushToken: null };
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setupNotificationListeners(
  onNotificationReceived?: (notification: Notification) => void,
  onNotificationTapped?: (response: NotificationResponse) => void
): Promise<() => void> {
  const mod = await loadNotifications();
  if (!mod) {
    return () => {};
  }

  const receivedSubscription =
    mod.addNotificationReceivedListener((notification) => {
      console.log("[Notifications] Received:", notification.request.content.title);
      onNotificationReceived?.(notification);
    });

  const responseSubscription =
    mod.addNotificationResponseReceivedListener((response) => {
      console.log("[Notifications] Tapped:", response.notification.request.content.title);
      onNotificationTapped?.(response);
    });

  return () => {
    mod.removeNotificationSubscription(receivedSubscription);
    mod.removeNotificationSubscription(responseSubscription);
  };
}
