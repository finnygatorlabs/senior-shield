import { db } from "@workspace/db";
import {
  conversationSessionsTable,
  scamAnalysisTable,
  scamDetectionFeedbackTable,
  alertsTable,
  voiceAssistanceHistoryTable,
  errorLogsTable,
  analyticsEventsTable,
  adminActivityLogTable,
  hearingAidConnectionLogsTable,
  hearingAidBatteryAlertsTable,
  reminderHistoryTable,
  dailyRemindersTable,
} from "@workspace/db";
import { lt, and, eq } from "drizzle-orm";

const RETENTION = {
  conversations: 7,
  scamAnalysis: 30,
  scamFeedback: 30,
  alerts: 14,
  voiceHistory: 14,
  errorLogs: 14,
  analytics: 30,
  adminLogs: 30,
  hearingAidLogs: 14,
  batteryAlerts: 14,
  reminderHistory: 14,
  deactivatedReminders: 7,
};

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

interface CleanupResult {
  table: string;
  deleted: number;
}

async function pruneTable(
  tableName: string,
  deleteQuery: () => Promise<any>
): Promise<CleanupResult> {
  try {
    const result = await deleteQuery();
    const deleted = result?.rowCount ?? result?.length ?? 0;
    return { table: tableName, deleted };
  } catch (err) {
    console.error(`[Cleanup] Error pruning ${tableName}:`, err);
    return { table: tableName, deleted: 0 };
  }
}

export async function runDataCleanup(): Promise<{
  results: CleanupResult[];
  totalDeleted: number;
}> {
  console.log("[Cleanup] Starting system-wide data cleanup...");
  const results: CleanupResult[] = [];

  results.push(
    await pruneTable("conversation_sessions", () =>
      db
        .delete(conversationSessionsTable)
        .where(lt(conversationSessionsTable.expires_at, new Date()))
    )
  );

  results.push(
    await pruneTable("scam_analysis", () =>
      db
        .delete(scamAnalysisTable)
        .where(lt(scamAnalysisTable.created_at, daysAgo(RETENTION.scamAnalysis)))
    )
  );

  results.push(
    await pruneTable("scam_detection_feedback", () =>
      db
        .delete(scamDetectionFeedbackTable)
        .where(lt(scamDetectionFeedbackTable.created_at, daysAgo(RETENTION.scamFeedback)))
    )
  );

  results.push(
    await pruneTable("alerts", () =>
      db
        .delete(alertsTable)
        .where(lt(alertsTable.created_at, daysAgo(RETENTION.alerts)))
    )
  );

  results.push(
    await pruneTable("voice_assistance_history", () =>
      db
        .delete(voiceAssistanceHistoryTable)
        .where(lt(voiceAssistanceHistoryTable.created_at, daysAgo(RETENTION.voiceHistory)))
    )
  );

  results.push(
    await pruneTable("error_logs", () =>
      db
        .delete(errorLogsTable)
        .where(lt(errorLogsTable.created_at, daysAgo(RETENTION.errorLogs)))
    )
  );

  results.push(
    await pruneTable("analytics_events", () =>
      db
        .delete(analyticsEventsTable)
        .where(lt(analyticsEventsTable.created_at, daysAgo(RETENTION.analytics)))
    )
  );

  results.push(
    await pruneTable("admin_activity_log", () =>
      db
        .delete(adminActivityLogTable)
        .where(lt(adminActivityLogTable.created_at, daysAgo(RETENTION.adminLogs)))
    )
  );

  results.push(
    await pruneTable("hearing_aid_connection_logs", () =>
      db
        .delete(hearingAidConnectionLogsTable)
        .where(lt(hearingAidConnectionLogsTable.created_at, daysAgo(RETENTION.hearingAidLogs)))
    )
  );

  results.push(
    await pruneTable("hearing_aid_battery_alerts", () =>
      db
        .delete(hearingAidBatteryAlertsTable)
        .where(lt(hearingAidBatteryAlertsTable.created_at, daysAgo(RETENTION.batteryAlerts)))
    )
  );

  results.push(
    await pruneTable("reminder_history", () =>
      db
        .delete(reminderHistoryTable)
        .where(lt(reminderHistoryTable.created_at, daysAgo(RETENTION.reminderHistory)))
    )
  );

  results.push(
    await pruneTable("daily_reminders (deactivated)", () =>
      db
        .delete(dailyRemindersTable)
        .where(
          and(
            eq(dailyRemindersTable.is_active, false),
            lt(dailyRemindersTable.created_at, daysAgo(RETENTION.deactivatedReminders))
          )
        )
    )
  );

  const totalDeleted = results.reduce((sum, r) => sum + r.deleted, 0);

  for (const r of results) {
    if (r.deleted > 0) {
      console.log(`[Cleanup] ${r.table}: deleted ${r.deleted} rows`);
    }
  }
  console.log(`[Cleanup] Complete. Total rows removed: ${totalDeleted}`);

  return { results, totalDeleted };
}
