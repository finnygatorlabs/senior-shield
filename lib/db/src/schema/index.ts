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
