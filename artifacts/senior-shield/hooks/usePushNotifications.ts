import { useEffect, useState, useRef } from "react";
import { Platform } from "react-native";
import {
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

    const setup = async () => {
      try {
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
      } catch (error) {
        console.error("[usePushNotifications] Error:", error);
      }
    };

    setup();

    const cleanup = setupNotificationListeners();
    return cleanup;
  }, [userId]);

  return { pushToken, permissionGranted };
}
