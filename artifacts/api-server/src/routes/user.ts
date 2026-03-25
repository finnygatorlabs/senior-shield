import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      phone_number: user.phone_number,
      user_type: user.user_type,
      onboarding_completed: user.onboarding_completed,
      onboarding_step: user.onboarding_step,
      created_at: user.created_at,
    });
  } catch (err) {
    req.log.error({ err }, "Get profile error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { first_name, last_name, phone_number, onboarding_completed, onboarding_step, device_platform, device_model, device_os_version } = req.body;

    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (phone_number !== undefined) updates.phone_number = phone_number;
    if (onboarding_completed !== undefined) updates.onboarding_completed = onboarding_completed;
    if (onboarding_step !== undefined) updates.onboarding_step = onboarding_step;
    if (device_platform !== undefined) updates.device_platform = device_platform;
    if (device_model !== undefined) updates.device_model = device_model;
    if (device_os_version !== undefined) updates.device_os_version = device_os_version;

    const [updated] = await db
      .update(usersTable)
      .set(updates as any)
      .where(eq(usersTable.id, req.user!.userId))
      .returning();

    res.json({
      id: updated.id,
      email: updated.email,
      first_name: updated.first_name,
      last_name: updated.last_name,
      phone_number: updated.phone_number,
      user_type: updated.user_type,
      onboarding_completed: updated.onboarding_completed,
      onboarding_step: updated.onboarding_step,
      created_at: updated.created_at,
    });
  } catch (err) {
    req.log.error({ err }, "Update profile error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/preferences", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "Not Found" });
      return;
    }
    res.json({
      preferred_voice: user.preferred_voice,
      voice_speed: user.voice_speed,
      voice_volume: user.voice_volume,
      color_scheme: user.color_scheme,
      high_contrast_enabled: user.high_contrast_enabled,
      font_size: user.font_size,
      haptic_feedback: user.haptic_feedback,
      captions_enabled: user.captions_enabled,
      data_collection_enabled: user.data_collection_enabled,
      assistant_name: (user as any).assistant_name ?? null,
      tts_voice: (user as any).tts_voice ?? "nova",
    });
  } catch (err) {
    req.log.error({ err }, "Get preferences error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/preferences", requireAuth, async (req: AuthRequest, res) => {
  try {
    const allowed = [
      "preferred_voice", "voice_speed", "voice_volume", "color_scheme",
      "high_contrast_enabled", "font_size", "haptic_feedback",
      "captions_enabled", "data_collection_enabled", "assistant_name", "tts_voice"
    ];

    const updates: Record<string, unknown> = { updated_at: new Date() };
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const [updated] = await db
      .update(usersTable)
      .set(updates as any)
      .where(eq(usersTable.id, req.user!.userId))
      .returning();

    res.json({
      preferred_voice: updated.preferred_voice,
      voice_speed: updated.voice_speed,
      voice_volume: updated.voice_volume,
      color_scheme: updated.color_scheme,
      high_contrast_enabled: updated.high_contrast_enabled,
      font_size: updated.font_size,
      haptic_feedback: updated.haptic_feedback,
      captions_enabled: updated.captions_enabled,
      data_collection_enabled: updated.data_collection_enabled,
      assistant_name: (updated as any).assistant_name ?? null,
      tts_voice: (updated as any).tts_voice ?? "nova",
    });
  } catch (err) {
    req.log.error({ err }, "Update preferences error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
