import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  integer,
  decimal,
  date,
  text,
  jsonb,
  unique,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone_number: varchar("phone_number").unique(),
  email: varchar("email").unique().notNull(),
  password_hash: varchar("password_hash").notNull(),
  user_type: varchar("user_type").notNull().default("senior"),
  first_name: varchar("first_name"),
  last_name: varchar("last_name"),
  date_of_birth: date("date_of_birth"),
  preferred_voice: varchar("preferred_voice").default("female"),
  voice_speed: decimal("voice_speed", { precision: 3, scale: 1 }).default("1.0"),
  voice_volume: decimal("voice_volume", { precision: 3, scale: 1 }).default("0.8"),
  color_scheme: varchar("color_scheme").default("light"),
  high_contrast_enabled: boolean("high_contrast_enabled").default(false),
  font_size: varchar("font_size").default("normal"),
  font_family: varchar("font_family").default("sans-serif"),
  line_height: varchar("line_height").default("normal"),
  letter_spacing: varchar("letter_spacing").default("normal"),
  haptic_feedback: boolean("haptic_feedback").default(true),
  screen_reader: boolean("screen_reader").default(false),
  hearing_aid_connected: boolean("hearing_aid_connected").default(false),
  hearing_aid_model: varchar("hearing_aid_model"),
  captions_enabled: boolean("captions_enabled").default(true),
  data_collection_enabled: boolean("data_collection_enabled").default(true),
  location_access: boolean("location_access").default(false),
  microphone_access: boolean("microphone_access").default(true),
  assistant_name: varchar("assistant_name"),
  tts_voice: varchar("tts_voice").default("nova"),
  daily_quotes_enabled: boolean("daily_quotes_enabled").default(true),
  device_platform: varchar("device_platform"),
  device_model: varchar("device_model"),
  device_os_version: varchar("device_os_version"),
  interests: jsonb("interests").$type<string[]>(),
  timezone: varchar("timezone", { length: 50 }).default("America/New_York"),
  onboarding_completed: boolean("onboarding_completed").default(false),
  onboarding_step: integer("onboarding_step").default(0),
  email_verified: boolean("email_verified").default(false),
  email_verification_token: varchar("email_verification_token"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const userTiersTable = pgTable("user_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  tier: varchar("tier").notNull().default("free"),
  trial_start_date: date("trial_start_date"),
  trial_end_date: date("trial_end_date"),
  premium_start_date: date("premium_start_date"),
  premium_end_date: date("premium_end_date"),
  billing_cycle: varchar("billing_cycle"),
  stripe_subscription_id: varchar("stripe_subscription_id"),
  status: varchar("status").default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertUserTierSchema = createInsertSchema(userTiersTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertUserTier = z.infer<typeof insertUserTierSchema>;
export type UserTier = typeof userTiersTable.$inferSelect;

export const familyRelationshipsTable = pgTable(
  "family_relationships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senior_id: uuid("senior_id").references(() => usersTable.id, { onDelete: "cascade" }),
    adult_child_id: uuid("adult_child_id").references(() => usersTable.id, { onDelete: "cascade" }),
    relationship: varchar("relationship"),
    scam_alerts: boolean("scam_alerts").default(true),
    help_requests: boolean("help_requests").default(false),
    weekly_summary: boolean("weekly_summary").default(true),
    email_alerts: boolean("email_alerts").default(true),
    sms_alerts: boolean("sms_alerts").default(false),
    notification_preference: varchar("notification_preference", { length: 50 }).default("all"),
    is_primary: boolean("is_primary").default(false),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (t) => [unique().on(t.senior_id, t.adult_child_id)]
);

export type FamilyRelationship = typeof familyRelationshipsTable.$inferSelect;

export const voiceAssistanceHistoryTable = pgTable("voice_assistance_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  request_text: varchar("request_text").notNull(),
  response_text: varchar("response_text").notNull(),
  task_category: varchar("task_category"),
  success: boolean("success").default(true),
  error_message: varchar("error_message"),
  duration_seconds: integer("duration_seconds"),
  created_at: timestamp("created_at").defaultNow(),
});

export type VoiceAssistanceHistory = typeof voiceAssistanceHistoryTable.$inferSelect;

export const scamAnalysisTable = pgTable("scam_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  screenshot_url: varchar("screenshot_url"),
  extracted_text: text("extracted_text"),
  risk_score: decimal("risk_score", { precision: 5, scale: 2 }),
  risk_level: varchar("risk_level"),
  analysis_details: jsonb("analysis_details"),
  user_feedback: varchar("user_feedback"),
  family_notified: boolean("family_notified").default(false),
  staff_notified: boolean("staff_notified").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export type ScamAnalysis = typeof scamAnalysisTable.$inferSelect;

export const contactMemoryTable = pgTable("contact_memory", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  contact_name: varchar("contact_name").notNull(),
  contact_phone: varchar("contact_phone"),
  contact_email: varchar("contact_email"),
  relationship: varchar("relationship"),
  favorite_tasks: jsonb("favorite_tasks"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type ContactMemory = typeof contactMemoryTable.$inferSelect;

export const alertsTable = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipient_id: uuid("recipient_id").references(() => usersTable.id, { onDelete: "cascade" }),
  alert_type: varchar("alert_type").notNull(),
  message: varchar("message").notNull(),
  related_senior_id: uuid("related_senior_id").references(() => usersTable.id),
  read: boolean("read").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export type Alert = typeof alertsTable.$inferSelect;

export const supportTicketsTable = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  subject: varchar("subject").notNull(),
  message: text("message").notNull(),
  status: varchar("status").default("open"),
  priority: varchar("priority").default("normal"),
  response: text("response"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type SupportTicket = typeof supportTicketsTable.$inferSelect;

export const scamDetectionFeedbackTable = pgTable("scam_detection_feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  scam_analysis_id: uuid("scam_analysis_id").references(() => scamAnalysisTable.id, { onDelete: "cascade" }),
  feedback_type: varchar("feedback_type").notNull(),
  explanation: varchar("explanation"),
  created_at: timestamp("created_at").defaultNow(),
});

export type ScamDetectionFeedback = typeof scamDetectionFeedbackTable.$inferSelect;

export const errorLogsTable = pgTable("error_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  error_type: varchar("error_type").notNull(),
  error_message: varchar("error_message"),
  stack_trace: text("stack_trace"),
  context: jsonb("context"),
  severity: varchar("severity"),
  resolved: boolean("resolved").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export type ErrorLog = typeof errorLogsTable.$inferSelect;

export const adminMetricsTable = pgTable("admin_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  date: date("date").defaultNow(),
  total_users: integer("total_users"),
  free_users: integer("free_users"),
  trial_users: integer("trial_users"),
  paid_users: integer("paid_users"),
  daily_active_users: integer("daily_active_users"),
  voice_requests_count: integer("voice_requests_count"),
  scams_detected: integer("scams_detected"),
  family_alerts_sent: integer("family_alerts_sent"),
  churn_rate: decimal("churn_rate", { precision: 5, scale: 2 }),
  created_at: timestamp("created_at").defaultNow(),
});

export type AdminMetrics = typeof adminMetricsTable.$inferSelect;

export const conversationSessionsTable = pgTable("conversation_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  messages: jsonb("messages").notNull().$type<Array<{ role: string; content: string }>>(),
  started_at: timestamp("started_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at").notNull(),
});

export type ConversationSession = typeof conversationSessionsTable.$inferSelect;

export const userHearingAidsTable = pgTable("user_hearing_aids", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  device_name: varchar("device_name").notNull(),
  device_brand: varchar("device_brand").notNull(),
  device_model: varchar("device_model"),
  device_id: varchar("device_id"),
  firmware_version: varchar("firmware_version"),
  is_connected: boolean("is_connected").default(false),
  signal_strength: integer("signal_strength").default(0),
  battery_left: integer("battery_left"),
  battery_right: integer("battery_right"),
  last_connected_at: timestamp("last_connected_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type UserHearingAid = typeof userHearingAidsTable.$inferSelect;

export const hearingAidSettingsTable = pgTable("hearing_aid_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull().unique(),
  hearing_aid_id: uuid("hearing_aid_id").references(() => userHearingAidsTable.id, { onDelete: "cascade" }),
  audio_routing: varchar("audio_routing").default("hearing_aid"),
  phone_volume: integer("phone_volume").default(60),
  hearing_aid_volume: integer("hearing_aid_volume").default(70),
  feedback_reduction_enabled: boolean("feedback_reduction_enabled").default(true),
  echo_cancellation_enabled: boolean("echo_cancellation_enabled").default(true),
  noise_reduction_enabled: boolean("noise_reduction_enabled").default(true),
  low_battery_alert_enabled: boolean("low_battery_alert_enabled").default(true),
  low_battery_threshold: integer("low_battery_threshold").default(20),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type HearingAidSettings = typeof hearingAidSettingsTable.$inferSelect;

export const hearingAidConnectionLogsTable = pgTable("hearing_aid_connection_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  hearing_aid_id: uuid("hearing_aid_id").references(() => userHearingAidsTable.id, { onDelete: "cascade" }),
  event_type: varchar("event_type").notNull(),
  details: jsonb("details"),
  created_at: timestamp("created_at").defaultNow(),
});

export type HearingAidConnectionLog = typeof hearingAidConnectionLogsTable.$inferSelect;

export const hearingAidBatteryAlertsTable = pgTable("hearing_aid_battery_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  hearing_aid_id: uuid("hearing_aid_id").references(() => userHearingAidsTable.id, { onDelete: "cascade" }),
  side: varchar("side").notNull(),
  battery_level: integer("battery_level").notNull(),
  family_notified: boolean("family_notified").default(false),
  created_at: timestamp("created_at").defaultNow(),
});

export type HearingAidBatteryAlert = typeof hearingAidBatteryAlertsTable.$inferSelect;

export const contactsTable = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  contact_name: varchar("contact_name").notNull(),
  phone_number: varchar("phone_number"),
  email: varchar("email"),
  category: varchar("category").default("other"),
  favorite_task: varchar("favorite_task"),
  usage_count: integer("usage_count").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type Contact = typeof contactsTable.$inferSelect;

export const scamLibraryTable = pgTable("scam_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  pattern_name: varchar("pattern_name").notNull(),
  keywords: jsonb("keywords"),
  description: text("description"),
  accuracy: integer("accuracy").default(0),
  false_positive_rate: integer("false_positive_rate").default(0),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type ScamLibraryPattern = typeof scamLibraryTable.$inferSelect;

export const subscriptionsTable = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  subscription_type: varchar("subscription_type").default("free"),
  subscription_source: varchar("subscription_source").default("stripe"),
  external_subscription_id: varchar("external_subscription_id"),
  status: varchar("status").default("active"),
  current_period_start: date("current_period_start"),
  current_period_end: date("current_period_end"),
  cancel_at_period_end: boolean("cancel_at_period_end").default(false),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type Subscription = typeof subscriptionsTable.$inferSelect;

export const telecomAccountsTable = pgTable("telecom_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  carrier: varchar("carrier").notNull(),
  carrier_user_id: varchar("carrier_user_id"),
  carrier_phone: varchar("carrier_phone"),
  subscription_status: varchar("subscription_status").default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type TelecomAccount = typeof telecomAccountsTable.$inferSelect;

export const insuranceAccountsTable = pgTable("insurance_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  insurance_provider: varchar("insurance_provider").notNull(),
  member_id: varchar("member_id"),
  member_dob: date("member_dob"),
  subscription_status: varchar("subscription_status").default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type InsuranceAccount = typeof insuranceAccountsTable.$inferSelect;

export const facilityAccountsTable = pgTable("facility_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  facility_name: varchar("facility_name").notNull(),
  facility_type: varchar("facility_type"),
  address: varchar("address"),
  city: varchar("city"),
  state: varchar("state"),
  zip: varchar("zip"),
  phone: varchar("phone"),
  email: varchar("email"),
  admin_user_id: uuid("admin_user_id").references(() => usersTable.id).notNull(),
  facility_code: varchar("facility_code").unique(),
  subscription_status: varchar("subscription_status").default("active"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type FacilityAccount = typeof facilityAccountsTable.$inferSelect;

export const facilityResidentsTable = pgTable("facility_residents", {
  id: uuid("id").primaryKey().defaultRandom(),
  facility_id: uuid("facility_id").references(() => facilityAccountsTable.id, { onDelete: "cascade" }).notNull(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  resident_name: varchar("resident_name"),
  status: varchar("status").default("active"),
  joined_at: timestamp("joined_at").defaultNow(),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type FacilityResident = typeof facilityResidentsTable.$inferSelect;

export const adminUsersTable = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email").unique().notNull(),
  password_hash: varchar("password_hash").notNull(),
  role: varchar("role").default("support"),
  permissions: jsonb("permissions"),
  last_login: timestamp("last_login"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type AdminUser = typeof adminUsersTable.$inferSelect;

export const adminActivityLogTable = pgTable("admin_activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  admin_id: uuid("admin_id").references(() => adminUsersTable.id, { onDelete: "cascade" }).notNull(),
  action: varchar("action").notNull(),
  resource_type: varchar("resource_type"),
  resource_id: varchar("resource_id"),
  changes: jsonb("changes"),
  created_at: timestamp("created_at").defaultNow(),
});

export type AdminActivityLog = typeof adminActivityLogTable.$inferSelect;

export const analyticsEventsTable = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  event_type: varchar("event_type").notNull(),
  event_data: jsonb("event_data"),
  created_at: timestamp("created_at").defaultNow(),
});

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;

export const dailyRemindersTable = pgTable("daily_reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  reminder_key: varchar("reminder_key").notNull(),
  label: varchar("label").notNull(),
  prompt: text("prompt").notNull(),
  icon: varchar("icon").default("notifications-outline"),
  scheduled_time: varchar("scheduled_time", { length: 5 }),
  frequency: varchar("frequency", { length: 20 }).default("daily"),
  days_of_week: varchar("days_of_week", { length: 50 }),
  is_active: boolean("is_active").default(true),
  is_custom: boolean("is_custom").default(false),
  sort_order: integer("sort_order").default(0),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (t) => [unique().on(t.user_id, t.reminder_key)]);

export const insertDailyReminderSchema = createInsertSchema(dailyRemindersTable).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type DailyReminder = typeof dailyRemindersTable.$inferSelect;
export type InsertDailyReminder = z.infer<typeof insertDailyReminderSchema>;

export const dailyReminderResponsesTable = pgTable("daily_reminder_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  reminder_id: uuid("reminder_id").references(() => dailyRemindersTable.id, { onDelete: "cascade" }).notNull(),
  response: varchar("response"),
  responded_at: timestamp("responded_at").defaultNow(),
});

export type DailyReminderResponse = typeof dailyReminderResponsesTable.$inferSelect;

export const featureUsageTable = pgTable("feature_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  feature: varchar("feature").notNull(),
  usage_count: integer("usage_count").notNull().default(0),
  last_used_at: timestamp("last_used_at").defaultNow(),
  reset_at: timestamp("reset_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
}, (t) => [unique().on(t.user_id, t.feature)]);

export type FeatureUsage = typeof featureUsageTable.$inferSelect;

export const userHealthProfilesTable = pgTable("user_health_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull().unique(),
  general_health: varchar("general_health"),
  chronic_conditions: jsonb("chronic_conditions").$type<string[]>().default([]),
  mobility_level: varchar("mobility_level"),
  hearing_vision: jsonb("hearing_vision").$type<string[]>().default([]),
  additional_notes: text("additional_notes"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export type UserHealthProfile = typeof userHealthProfilesTable.$inferSelect;

export const reminderHistoryTable = pgTable(
  "reminder_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reminder_id: uuid("reminder_id").references(() => dailyRemindersTable.id, { onDelete: "cascade" }).notNull(),
    user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    scheduled_time: timestamp("scheduled_time").notNull(),
    sent_time: timestamp("sent_time"),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    snoozed_until: timestamp("snoozed_until"),
    completed_at: timestamp("completed_at"),
    family_notified: boolean("family_notified").default(false),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_reminder_history_reminder_id").on(t.reminder_id),
    index("idx_reminder_history_user_id").on(t.user_id),
    index("idx_reminder_history_status").on(t.status),
    index("idx_reminder_history_scheduled_time").on(t.scheduled_time),
  ]
);

export type ReminderHistory = typeof reminderHistoryTable.$inferSelect;

export const pushTokensTable = pgTable(
  "push_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
    firebase_token: varchar("firebase_token", { length: 500 }).notNull(),
    expo_push_token: varchar("expo_push_token", { length: 500 }),
    platform: varchar("platform", { length: 50 }).notNull(),
    device_name: varchar("device_name", { length: 255 }),
    is_active: boolean("is_active").default(true),
    last_used_at: timestamp("last_used_at"),
    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (t) => [
    index("idx_push_tokens_user_id").on(t.user_id),
    index("idx_push_tokens_firebase_token").on(t.firebase_token),
    uniqueIndex("idx_push_tokens_user_firebase").on(t.user_id, t.firebase_token),
  ]
);

export type PushToken = typeof pushTokensTable.$inferSelect;
