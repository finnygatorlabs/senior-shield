import { Router, IRouter } from "express";
import { db } from "@workspace/db";
import { dailyRemindersTable, dailyReminderResponsesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../lib/auth.js";

const router: IRouter = Router();

const MAX_ACTIVE_REMINDERS = 5;

const PRESET_REMINDERS = [
  {
    key: "medication",
    label: "Medication Reminder",
    prompt: "Good morning {name}, have you taken your medication today?",
    icon: "medkit-outline",
  },
  {
    key: "family_call",
    label: "Family Check-in",
    prompt: "Hi {name}, have you called your family today? It would make their day to hear from you.",
    icon: "call-outline",
  },
  {
    key: "morning_walk",
    label: "Morning Walk",
    prompt: "{name}, did you take your morning walk today? A short walk can do wonders for your health.",
    icon: "walk-outline",
  },
  {
    key: "wellness_check",
    label: "Wellness Check",
    prompt: "Hi {name}, do you need to check any of the following: Blood Pressure, Insulin, Blood Glucose, Your Weight, or Other today?",
    icon: "heart-outline",
  },
  {
    key: "hydration",
    label: "Hydration Reminder",
    prompt: "{name}, have you had enough water today? Staying hydrated is so important.",
    icon: "water-outline",
  },
  {
    key: "meals",
    label: "Meal Reminder",
    prompt: "{name}, have you eaten today? A good meal will help keep your energy up.",
    icon: "restaurant-outline",
  },
  {
    key: "appointments",
    label: "Appointment Check",
    prompt: "{name}, do you have any appointments today? Let me help you stay on track.",
    icon: "calendar-outline",
  },
  {
    key: "gratitude",
    label: "Gratitude Moment",
    prompt: "{name}, what's one thing you're grateful for today?",
    icon: "sunny-outline",
  },
];

router.get("/presets", (_req, res) => {
  res.json({ presets: PRESET_REMINDERS });
});

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const reminders = await db
      .select()
      .from(dailyRemindersTable)
      .where(eq(dailyRemindersTable.user_id, req.user!.userId))
      .orderBy(dailyRemindersTable.sort_order);

    res.json({ reminders, max_active: MAX_ACTIVE_REMINDERS });
  } catch (err) {
    req.log.error({ err }, "Get reminders error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { reminder_key, label, prompt, icon, is_custom, metadata, scheduled_time, frequency, days_of_week } = req.body;

    if (!reminder_key || !label || !prompt) {
      res.status(400).json({ error: "Bad Request", message: "reminder_key, label, and prompt are required" });
      return;
    }

    if (scheduled_time) {
      if (!/^\d{2}:\d{2}$/.test(scheduled_time)) {
        res.status(400).json({ error: "Bad Request", message: "scheduled_time must be in HH:MM format" });
        return;
      }
      const [hh, mm] = scheduled_time.split(":").map(Number);
      if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
        res.status(400).json({ error: "Bad Request", message: "scheduled_time must have valid hours (00-23) and minutes (00-59)" });
        return;
      }
    }

    if (frequency && !["daily", "weekly", "once"].includes(frequency)) {
      res.status(400).json({ error: "Bad Request", message: "frequency must be daily, weekly, or once" });
      return;
    }

    if (frequency === "weekly") {
      if (!days_of_week || !days_of_week.trim()) {
        res.status(400).json({ error: "Bad Request", message: "days_of_week is required for weekly frequency" });
        return;
      }
      const dayNums = days_of_week.split(",").map(Number);
      if (dayNums.some((d: number) => isNaN(d) || d < 0 || d > 6)) {
        res.status(400).json({ error: "Bad Request", message: "days_of_week must contain values 0-6" });
        return;
      }
    }

    const existing = await db
      .select()
      .from(dailyRemindersTable)
      .where(
        and(
          eq(dailyRemindersTable.user_id, req.user!.userId),
          eq(dailyRemindersTable.is_active, true)
        )
      );

    if (existing.length >= MAX_ACTIVE_REMINDERS) {
      res.status(400).json({
        error: "Limit Reached",
        message: `You can have up to ${MAX_ACTIVE_REMINDERS} active reminders. Please deactivate one before adding another.`,
      });
      return;
    }

    const [reminder] = await db
      .insert(dailyRemindersTable)
      .values({
        user_id: req.user!.userId,
        reminder_key,
        label,
        prompt,
        icon: icon || "notifications-outline",
        is_custom: is_custom || false,
        is_active: true,
        sort_order: existing.length,
        metadata: metadata || null,
        scheduled_time: scheduled_time || null,
        frequency: frequency || "daily",
        days_of_week: days_of_week || null,
      })
      .onConflictDoUpdate({
        target: [dailyRemindersTable.user_id, dailyRemindersTable.reminder_key],
        set: {
          is_active: true, label, prompt, icon,
          metadata: metadata || null,
          scheduled_time: scheduled_time || null,
          frequency: frequency || "daily",
          days_of_week: days_of_week || null,
          updated_at: new Date(),
        },
      })
      .returning();

    res.json({ reminder });
  } catch (err) {
    req.log.error({ err }, "Create reminder error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id/schedule", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { scheduled_time, frequency, days_of_week } = req.body;

    if (scheduled_time) {
      if (!/^\d{2}:\d{2}$/.test(scheduled_time)) {
        res.status(400).json({ error: "Bad Request", message: "scheduled_time must be in HH:MM format" });
        return;
      }
      const [hh, mm] = scheduled_time.split(":").map(Number);
      if (hh < 0 || hh > 23 || mm < 0 || mm > 59) {
        res.status(400).json({ error: "Bad Request", message: "scheduled_time must have valid hours (00-23) and minutes (00-59)" });
        return;
      }
    }

    if (frequency && !["daily", "weekly", "once"].includes(frequency)) {
      res.status(400).json({ error: "Bad Request", message: "frequency must be daily, weekly, or once" });
      return;
    }

    if (frequency === "weekly") {
      if (!days_of_week || !days_of_week.trim()) {
        res.status(400).json({ error: "Bad Request", message: "days_of_week is required for weekly frequency" });
        return;
      }
      const dayNums = days_of_week.split(",").map(Number);
      if (dayNums.some((d: number) => isNaN(d) || d < 0 || d > 6)) {
        res.status(400).json({ error: "Bad Request", message: "days_of_week must contain values 0-6" });
        return;
      }
    }

    const [updated] = await db
      .update(dailyRemindersTable)
      .set({
        scheduled_time: scheduled_time || null,
        frequency: frequency || "daily",
        days_of_week: days_of_week || null,
        updated_at: new Date(),
      })
      .where(
        and(
          eq(dailyRemindersTable.id, id),
          eq(dailyRemindersTable.user_id, req.user!.userId)
        )
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json({ reminder: updated });
  } catch (err) {
    req.log.error({ err }, "Update reminder schedule error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id/toggle", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active) {
      const activeCount = await db
        .select()
        .from(dailyRemindersTable)
        .where(
          and(
            eq(dailyRemindersTable.user_id, req.user!.userId),
            eq(dailyRemindersTable.is_active, true)
          )
        );

      if (activeCount.length >= MAX_ACTIVE_REMINDERS) {
        res.status(400).json({
          error: "Limit Reached",
          message: `You can have up to ${MAX_ACTIVE_REMINDERS} active reminders.`,
        });
        return;
      }
    }

    const [updated] = await db
      .update(dailyRemindersTable)
      .set({ is_active, updated_at: new Date() })
      .where(
        and(
          eq(dailyRemindersTable.id, id),
          eq(dailyRemindersTable.user_id, req.user!.userId)
        )
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json({ reminder: updated });
  } catch (err) {
    req.log.error({ err }, "Toggle reminder error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.put("/:id/metadata", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { metadata } = req.body;

    const [updated] = await db
      .update(dailyRemindersTable)
      .set({ metadata, updated_at: new Date() })
      .where(
        and(
          eq(dailyRemindersTable.id, id),
          eq(dailyRemindersTable.user_id, req.user!.userId)
        )
      )
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json({ reminder: updated });
  } catch (err) {
    req.log.error({ err }, "Update reminder metadata error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(dailyRemindersTable)
      .where(
        and(
          eq(dailyRemindersTable.id, id),
          eq(dailyRemindersTable.user_id, req.user!.userId)
        )
      )
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Not Found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Delete reminder error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/active", requireAuth, async (req: AuthRequest, res) => {
  try {
    const reminders = await db
      .select()
      .from(dailyRemindersTable)
      .where(
        and(
          eq(dailyRemindersTable.user_id, req.user!.userId),
          eq(dailyRemindersTable.is_active, true)
        )
      )
      .orderBy(dailyRemindersTable.sort_order);

    res.json({ reminders });
  } catch (err) {
    req.log.error({ err }, "Get active reminders error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/:id/respond", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    const [saved] = await db
      .insert(dailyReminderResponsesTable)
      .values({
        user_id: req.user!.userId,
        reminder_id: id,
        response: response || "acknowledged",
      })
      .returning();

    res.json({ response: saved });
  } catch (err) {
    req.log.error({ err }, "Reminder response error");
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
