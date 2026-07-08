import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const remindersTable = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  contentId: text("content_id").notNull(),
  contentType: text("content_type").notNull(), // 'movie' | 'anime'
  contentTitle: text("content_title").notNull(),
  posterUrl: text("poster_url"),
  releaseDate: text("release_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReminderSchema = createInsertSchema(remindersTable).omit({
  id: true,
  createdAt: true,
});

export type InsertReminder = z.infer<typeof insertReminderSchema>;
export type Reminder = typeof remindersTable.$inferSelect;
