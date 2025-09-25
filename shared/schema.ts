import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, json, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  age: integer("age").notNull(),
  grade: text("grade").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const chats = pgTable("chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  userId: varchar("user_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatId: varchar("chat_id").notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  imageUrl: text("image_url"), // Optional image URL for messages with photos
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  age: z.number().min(5).max(12),
  grade: z.enum(["K", "1", "2", "3", "4", "5", "6", "7"]),
});

export const insertChatSchema = createInsertSchema(chats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Chat = typeof chats.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// SOL Assessment Tables
export const solStandards = pgTable("sol_standards", {
  id: text("id").primaryKey(),
  standardCode: text("standard_code").notNull(), // e.g., "3.NS.1", "ALG.A.1"
  subject: text("subject").notNull(),
  grade: text("grade").notNull(),
  strand: text("strand").notNull(),
  title: text("title"), // Short title/summary
  description: text("description").notNull(),
  sol_metadata: json("sol_metadata"), // Enhanced data: sub-objectives, prerequisites, connections, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const assessmentItems = pgTable("assessment_items", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  solId: text("sol_id").notNull().references(() => solStandards.id),
  itemType: text("item_type").notNull(), // MCQ, FIB, CR
  difficulty: text("difficulty").notNull(), // easy, medium, hard
  dok: integer("dok").notNull(), // Depth of Knowledge 1-4
  stem: text("stem").notNull(),
  payload: json("payload").notNull(), // Full item JSON (choices for MCQ, answer_key for FIB, rubric for CR)
  createdAt: timestamp("created_at").defaultNow(),
});

export const assessmentAttempts = pgTable("assessment_attempts", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull().references(() => users.id),
  itemId: text("item_id").notNull().references(() => assessmentItems.id),
  solId: text("sol_id").notNull(),
  userResponse: json("user_response").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  score: real("score").notNull(),
  maxScore: real("max_score").notNull(),
  feedback: text("feedback"),
  durationSeconds: real("duration_seconds"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSolStandardSchema = createInsertSchema(solStandards).omit({
  createdAt: true,
});
export const insertAssessmentItemSchema = createInsertSchema(assessmentItems).omit({
  id: true,
  createdAt: true,
});
export const insertAssessmentAttemptSchema = createInsertSchema(assessmentAttempts).omit({
  id: true,
  createdAt: true,
});

export type SolStandard = typeof solStandards.$inferSelect;
export type AssessmentItem = typeof assessmentItems.$inferSelect;
export type AssessmentAttempt = typeof assessmentAttempts.$inferSelect;
export type InsertSolStandard = z.infer<typeof insertSolStandardSchema>;
export type InsertAssessmentItem = z.infer<typeof insertAssessmentItemSchema>;
export type InsertAssessmentAttempt = z.infer<typeof insertAssessmentAttemptSchema>;
