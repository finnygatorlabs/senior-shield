import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PUSH_TOKEN_KEY = "seniorshield_push_token";
const EXPO_TOKEN_KEY = "seniorshield_expo_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<{
  deviceToken: string | null;
  expoPushToken: string | null;
}> {
  if (!Device.isDevice) {
    console.log("[Notifications] Must use physical device for push notifications");
    return { deviceToken: null, expoPushToken: null };
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("[Notifications] Permission not granted");
      return { deviceToken: null, expoPushToken: null };
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
      });
    }

    const nativeTokenData = await Notifications.getDevicePushTokenAsync();
    const deviceToken = nativeTokenData.data as string;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, deviceToken);

    let expoPushToken: string | null = null;
    try {
      const projectId = process.env.EXPO_PUBLIC_PROJECT_ID;
      const expoTokenData = await Notifications.getExpoPushTokenAsync({
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

export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationTapped?: (
    response: Notifications.NotificationResponse
  ) => void
) {
  const receivedSubscription =
    Notifications.addNotificationReceivedListener((notification) => {
      console.log("[Notifications] Received:", notification.request.content.title);
      onNotificationReceived?.(notification);
    });

  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("[Notifications] Tapped:", response.notification.request.content.title);
      onNotificationTapped?.(response);
    });

  return () => {
    Notifications.removeNotificationSubscription(receivedSubscription);
    Notifications.removeNotificationSubscription(responseSubscription);
  };
}
