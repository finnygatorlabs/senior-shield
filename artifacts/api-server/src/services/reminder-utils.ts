import { toZonedTime, format } from "date-fns-tz";

interface ReminderForCheck {
  id: string;
  user_id: string;
  scheduled_time: string | null;
  frequency: string | null;
  days_of_week: string | null;
  is_active: boolean | null;
}

export function isReminderDue(reminder: ReminderForCheck, userTimezone: string): boolean {
  try {
    if (!reminder.scheduled_time || !reminder.is_active) return false;

    const now = new Date();
    const userTime = toZonedTime(now, userTimezone);

    const [reminderHours, reminderMinutes] = reminder.scheduled_time.split(":").map(Number);
    const currentHours = userTime.getHours();
    const currentMinutes = userTime.getMinutes();

    const timeMatches = currentHours === reminderHours && currentMinutes === reminderMinutes;
    if (!timeMatches) return false;

    const freq = reminder.frequency || "daily";
    if (freq === "daily") return true;
    if (freq === "once") return true;

    if (freq === "weekly") {
      const dayOfWeek = userTime.getDay();
      const daysOfWeek = reminder.days_of_week?.split(",").map(Number) || [];
      return daysOfWeek.includes(dayOfWeek);
    }

    return false;
  } catch (error) {
    console.error("Error checking if reminder is due:", error);
    return false;
  }
}

export function convertToUserTimezone(utcDate: Date, userTimezone: string): string {
  try {
    const zonedDate = toZonedTime(utcDate, userTimezone);
    return format(zonedDate, "yyyy-MM-dd HH:mm:ss zzz", { timeZone: userTimezone });
  } catch {
    return utcDate.toISOString();
  }
}

export function formatReminderTime(time: string): string {
  try {
    const [hours, minutes] = time.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
  } catch {
    return time;
  }
}

export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export function getCommonTimezones(): string[] {
  return [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Australia/Sydney",
  ];
}
