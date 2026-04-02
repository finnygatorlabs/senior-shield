import { db } from "@workspace/db";
import {
  dailyRemindersTable,
  reminderHistoryTable,
  familyRelationshipsTable,
  usersTable,
  pushTokensTable,
} from "@workspace/db";
import { eq, and, gte, lte } from "drizzle-orm";
import { toZonedTime } from "date-fns-tz";
import { sendReminderNotificationEmail } from "./reminder-email-service.js";
import { sendReminderPushNotification } from "./firebase-push-service.js";
import { isReminderDue, formatReminderTime } from "./reminder-utils.js";

interface SchedulerResult {
  processed: number;
  sent: number;
  errors: string[];
}

export async function runReminderScheduler(): Promise<SchedulerResult> {
  const result: SchedulerResult = {
    processed: 0,
    sent: 0,
    errors: [],
  };

  try {
    console.log("[Scheduler] Starting reminder check...");

    const activeReminders = await db
      .select()
      .from(dailyRemindersTable)
      .where(eq(dailyRemindersTable.is_active, true));

    console.log(`[Scheduler] Found ${activeReminders.length} active reminders`);

    for (const reminder of activeReminders) {
      try {
        if (!reminder.scheduled_time) continue;

        const [user] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, reminder.user_id))
          .limit(1);

        if (!user) {
          result.errors.push(`User not found for reminder ${reminder.id}`);
          continue;
        }

        const userTimezone = user.timezone || "America/New_York";
        result.processed++;

        if (
          isReminderDue(
            {
              id: reminder.id,
              user_id: reminder.user_id,
              scheduled_time: reminder.scheduled_time,
              frequency: reminder.frequency,
              days_of_week: reminder.days_of_week,
              is_active: reminder.is_active,
            },
            userTimezone
          )
        ) {
          const userNow = toZonedTime(new Date(), userTimezone);
          const userDayStart = new Date(userNow);
          userDayStart.setHours(0, 0, 0, 0);
          const userDayEnd = new Date(userNow);
          userDayEnd.setHours(23, 59, 59, 999);

          const existingHistory = await db
            .select()
            .from(reminderHistoryTable)
            .where(
              and(
                eq(reminderHistoryTable.reminder_id, reminder.id),
                eq(reminderHistoryTable.user_id, reminder.user_id),
                gte(reminderHistoryTable.scheduled_time, userDayStart),
                lte(reminderHistoryTable.scheduled_time, userDayEnd)
              )
            )
            .limit(1);

          if (existingHistory.length > 0) {
            continue;
          }

          const historyEntry = await db
            .insert(reminderHistoryTable)
            .values({
              reminder_id: reminder.id,
              user_id: reminder.user_id,
              scheduled_time: new Date(),
              sent_time: new Date(),
              status: "sent",
              family_notified: false,
            })
            .returning();

          if (!historyEntry.length) {
            result.errors.push(`Failed to create history for reminder ${reminder.id}`);
            continue;
          }

          const userTokens = await db
            .select()
            .from(pushTokensTable)
            .where(
              and(
                eq(pushTokensTable.user_id, reminder.user_id),
                eq(pushTokensTable.is_active, true)
              )
            );

          if (userTokens.length > 0) {
            const tokens = userTokens.map((t) => t.firebase_token);
            const formattedTime = formatReminderTime(reminder.scheduled_time!);
            const pushResult = await sendReminderPushNotification(
              tokens,
              reminder.label,
              formattedTime,
              reminder.id
            );
            if (pushResult.success > 0) {
              result.sent++;
              console.log(`[Scheduler] Sent push notification for reminder ${reminder.id} to ${pushResult.success} device(s)`);
            }
          }

          if (reminder.frequency === "once") {
            await db
              .update(dailyRemindersTable)
              .set({ is_active: false, updated_at: new Date() })
              .where(eq(dailyRemindersTable.id, reminder.id));
            console.log(`[Scheduler] One-time reminder ${reminder.id} deactivated after firing`);
          }

          const primaryFamily = await db
            .select()
            .from(familyRelationshipsTable)
            .where(
              and(
                eq(familyRelationshipsTable.senior_id, reminder.user_id),
                eq(familyRelationshipsTable.is_primary, true)
              )
            )
            .limit(1);

          if (primaryFamily.length > 0) {
            const family = primaryFamily[0];
            const notifPref = family.notification_preference || "all";

            if (notifPref !== "none" && family.adult_child_id) {
              const [familyUser] = await db
                .select()
                .from(usersTable)
                .where(eq(usersTable.id, family.adult_child_id))
                .limit(1);

              if (familyUser?.email) {
                const seniorName = user.first_name
                  ? `${user.first_name}${user.last_name ? " " + user.last_name : ""}`
                  : "Your loved one";

                const familyName = familyUser.first_name || "there";

                const emailSent = await sendReminderNotificationEmail({
                  familyEmail: familyUser.email,
                  familyName,
                  seniorName,
                  reminderLabel: reminder.label,
                  reminderTime: reminder.scheduled_time!,
                  notificationPreference: notifPref,
                });

                if (emailSent) {
                  await db
                    .update(reminderHistoryTable)
                    .set({ family_notified: true })
                    .where(eq(reminderHistoryTable.id, historyEntry[0].id));

                  result.sent++;
                  console.log(`[Scheduler] Sent notification for reminder ${reminder.id}`);
                }
              }
            }
          }
        }
      } catch (error) {
        result.errors.push(
          `Error processing reminder ${reminder.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    console.log(
      `[Scheduler] Completed. Processed: ${result.processed}, Sent: ${result.sent}, Errors: ${result.errors.length}`
    );
    return result;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    result.errors.push(`Scheduler error: ${errorMsg}`);
    console.error("[Scheduler] Fatal error:", error);
    return result;
  }
}
