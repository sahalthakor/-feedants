import { int, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing Manus auth. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const competitions = mysqlTable("competitions", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 180 }).notNull(),
  category: varchar("category", { length: 80 }).notNull(),
  format: varchar("format", { length: 80 }).notNull(),
  prizePool: int("prizePool").notNull(),
  entryFee: int("entryFee").notNull(),
  capacity: int("capacity").notNull(),
  booked: int("booked").default(0).notNull(),
  status: varchar("status", { length: 30 }).default("open").notNull(),
  registrationDeadline: timestamp("registrationDeadline").notNull(),
  submissionStartsAt: timestamp("submissionStartsAt").notNull(),
  submissionEndsAt: timestamp("submissionEndsAt").notNull(),
  resultDate: timestamp("resultDate").notNull(),
  judgeName: varchar("judgeName", { length: 120 }).notNull(),
  judgeRole: varchar("judgeRole", { length: 180 }).notNull(),
  judgeExperience: varchar("judgeExperience", { length: 80 }).notNull(),
  judgeImage: text("judgeImage").notNull(),
  about: text("about").notNull(),
  judgingParameters: text("judgingParameters").notNull(),
  rules: text("rules").notNull(),
  winnersJson: text("winnersJson").notNull(),
  rewardsJson: text("rewardsJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const registrations = mysqlTable("registrations", {
  id: int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  participantKey: varchar("participantKey", { length: 120 }).notNull(),
  status: varchar("status", { length: 30 }).default("registered").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  participantCompetitionUnique: uniqueIndex("participant_competition_unique").on(table.competitionId, table.participantKey),
}));

export const submissions = mysqlTable("submissions", {
  id: int("id").autoincrement().primaryKey(),
  competitionId: int("competitionId").notNull(),
  participantKey: varchar("participantKey", { length: 120 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  status: varchar("status", { length: 30 }).default("uploaded").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  submissionUnique: uniqueIndex("submission_participant_unique").on(table.competitionId, table.participantKey),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Competition = typeof competitions.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
