import admin from "firebase-admin";

let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized || admin.apps.length > 0) {
    firebaseInitialized = true;
    return true;
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    console.warn("[Firebase] FIREBASE_SERVICE_ACCOUNT_KEY not set — push notifications disabled");
    return false;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
    return true;
  } catch (error) {
    console.error("[Firebase] Failed to initialize:", error);
    return false;
  }
}

export async function sendPushNotification(
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ success: number; failure: number }> {
  if (!deviceTokens.length) {
    return { success: 0, failure: 0 };
  }

  if (!initializeFirebase()) {
    console.warn("[Firebase] Not initialized — skipping push notification");
    return { success: 0, failure: 0 };
  }

  try {
    const response = await admin.messaging().sendEachForMulticast({
      notification: { title, body },
      data: data || {},
      tokens: deviceTokens,
      android: {
        priority: "high",
        notification: {
          channelId: "reminders",
          priority: "high",
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: "default",
            badge: 1,
          },
        },
      },
    });

    console.log(
      `[Firebase] Push sent: ${response.successCount} success, ${response.failureCount} failure`
    );

    return {
      success: response.successCount,
      failure: response.failureCount,
    };
  } catch (error) {
    console.error("[Firebase] Error sending push notification:", error);
    return { success: 0, failure: deviceTokens.length };
  }
}

export async function sendReminderPushNotification(
  deviceTokens: string[],
  reminderLabel: string,
  scheduledTime: string,
  reminderId: string
): Promise<{ success: number; failure: number }> {
  return sendPushNotification(
    deviceTokens,
    "Reminder: " + reminderLabel,
    `It's time for your ${reminderLabel.toLowerCase()} (${scheduledTime})`,
    {
      type: "reminder",
      reminderId,
      reminderLabel,
      scheduledTime,
    }
  );
}
