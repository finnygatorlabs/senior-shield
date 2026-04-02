import { useEffect, useState, useRef } from "react";
import { Platform } from "react-native";
import {
  initNotificationHandler,
  registerForPushNotifications,
  setupNotificationListeners,
} from "../services/notifications";
import { registerPushToken } from "../services/api";

export function usePushNotifications(userId: string | null) {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId || initialized.current) return;
    initialized.current = true;

    let cleanupListeners: (() => void) | null = null;

    const setup = async () => {
      try {
        await initNotificationHandler();

        const { deviceToken, expoPushToken } =
          await registerForPushNotifications();

        if (deviceToken) {
          setPushToken(deviceToken);
          setPermissionGranted(true);

          await registerPushToken({
            firebaseToken: deviceToken,
            expoPushToken,
            platform: Platform.OS,
            deviceName: Platform.OS === "ios" ? "iPhone" : "Android",
          });
        }

        cleanupListeners = await setupNotificationListeners();
      } catch (error) {
        console.error("[usePushNotifications] Error:", error);
      }
    };

    setup();

    return () => {
      cleanupListeners?.();
    };
  }, [userId]);

  return { pushToken, permissionGranted };
}
