import { and, eq, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { competitions, InsertUser, registrations, submissions, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/** Returns the database record when the competition table has been provisioned. */
export async function getCompetitionBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  try {
    const result = await db.select().from(competitions).where(eq(competitions.slug, slug)).limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    // The UI remains usable with the seeded demo payload until migrations are applied.
    console.warn("[Database] Competition table unavailable; using demo payload", error);
    return undefined;
  }
}

export async function getRegistration(competitionId: number, participantKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(registrations).where(and(
    eq(registrations.competitionId, competitionId),
    eq(registrations.participantKey, participantKey),
  )).limit(1);
  return result[0];
}

/**
 * Uses a conditional update for capacity, then a unique participant index for
 * idempotency. The update is only allowed while booked < capacity.
 */
export async function registerParticipant(competitionId: number, participantKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const existing = await getRegistration(competitionId, participantKey);
  if (existing) return { alreadyRegistered: true };

  const updateResult = await db.update(competitions)
    .set({ booked: sql`${competitions.booked} + 1` })
    .where(and(eq(competitions.id, competitionId), lt(competitions.booked, competitions.capacity)));
  const resultObject = Array.isArray(updateResult) ? updateResult[0] : updateResult;
  const affectedRows = Number((resultObject as unknown as { affectedRows?: number; changedRows?: number }).affectedRows ?? (resultObject as unknown as { changedRows?: number }).changedRows ?? 0);
  if (affectedRows === 0) {
    // Some mysql2 versions return a tuple without affectedRows. Confirm the
    // conditional update outcome before deciding that the competition is full.
    const current = await db.select({ booked: competitions.booked, capacity: competitions.capacity }).from(competitions).where(eq(competitions.id, competitionId)).limit(1);
    if (!current[0] || Number(current[0].booked) >= Number(current[0].capacity)) return { full: true };
  }

  await db.insert(registrations).values({ competitionId, participantKey, status: "registered" });
  return { alreadyRegistered: false };
}

export async function getSubmission(competitionId: number, participantKey: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(submissions).where(and(
    eq(submissions.competitionId, competitionId),
    eq(submissions.participantKey, participantKey),
  )).limit(1);
  return result[0];
}

export async function saveSubmission(competitionId: number, participantKey: string, fileName: string) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(submissions).values({ competitionId, participantKey, fileName, status: "uploaded" }).onDuplicateKeyUpdate({
    set: { fileName, status: "uploaded" },
  });
  return { success: true, fileName };
}
