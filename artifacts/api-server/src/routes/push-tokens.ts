import { Router, Response } from "express";
import { db } from "@workspace/db";
import { pushTokensTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router = Router();

router.post("/register", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { firebaseToken, expoPushToken, platform, deviceName } = req.body;

    if (!userId || !firebaseToken || !platform) {
      res.status(400).json({ error: "Missing required fields: firebaseToken, platform" });
      return;
    }

    const existingToken = await db
      .select()
      .from(pushTokensTable)
      .where(
        and(
          eq(pushTokensTable.user_id, userId),
          eq(pushTokensTable.firebase_token, firebaseToken)
        )
      )
      .limit(1);

    if (existingToken.length > 0) {
      await db
        .update(pushTokensTable)
        .set({
          expo_push_token: expoPushToken || existingToken[0].expo_push_token,
          platform,
          device_name: deviceName || existingToken[0].device_name,
          is_active: true,
          last_used_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(pushTokensTable.id, existingToken[0].id));
    } else {
      await db.insert(pushTokensTable).values({
        user_id: userId,
        firebase_token: firebaseToken,
        expo_push_token: expoPushToken || null,
        platform,
        device_name: deviceName || null,
        is_active: true,
        last_used_at: new Date(),
      });
    }

    res.json({ success: true, message: "Device token registered" });
  } catch (error) {
    console.error("[PushTokens] Error registering device token:", error);
    res.status(500).json({ error: "Failed to register device token" });
  }
});

router.delete("/unregister", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { firebaseToken } = req.body;

    if (!userId || !firebaseToken) {
      res.status(400).json({ error: "Missing firebaseToken" });
      return;
    }

    await db
      .update(pushTokensTable)
      .set({ is_active: false, updated_at: new Date() })
      .where(
        and(
          eq(pushTokensTable.user_id, userId),
          eq(pushTokensTable.firebase_token, firebaseToken)
        )
      );

    res.json({ success: true, message: "Device token deactivated" });
  } catch (error) {
    console.error("[PushTokens] Error deactivating device token:", error);
    res.status(500).json({ error: "Failed to deactivate device token" });
  }
});

export default router;
