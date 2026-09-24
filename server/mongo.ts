import { MongoClient, type Collection, type Db, ObjectId } from "mongodb";

export type MongoCompetition = {
  _id?: ObjectId;
  slug: string;
  title: string;
  category: string;
  format: string;
  prizePool: number;
  entryFee: number;
  capacity: number;
  booked: number;
  status: "open" | "closed" | "completed";
  registrationDeadline: Date;
  submissionStartsAt: Date;
  submissionEndsAt: Date;
  resultDate: Date;
  judgeName: string;
  judgeRole: string;
  judgeExperience: string;
  judgeImage: string;
  about: string;
  judgingParameters: string;
  rules: string;
  winners: Array<{ name: string; place: string; image: string }>;
  rewards: Array<{ label: string; amount: number; icon: string }>;
};

export type MongoRegistration = {
  _id?: ObjectId;
  competitionSlug: string;
  participantKey: string;
  status: "registered" | "cancelled";
  createdAt: Date;
};

export type MongoSubmission = {
  _id?: ObjectId;
  competitionSlug: string;
  participantKey: string;
  fileName: string;
  status: "uploaded" | "reviewed";
  createdAt: Date;
  updatedAt: Date;
};

let client: MongoClient | null = null;
let database: Db | null = null;
let indexesReady: Promise<void> | null = null;

export async function getMongoDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return null;
  if (database) return database;

  try {
    client = new MongoClient(uri, { maxPoolSize: 20, serverSelectionTimeoutMS: 2500 });
    await client.connect();
    database = client.db(process.env.MONGODB_DB ?? "feedants");
    indexesReady = ensureMongoIndexes(database);
    await indexesReady;
    return database;
  } catch (error) {
    console.warn("[MongoDB] Connection unavailable; using managed database fallback", error);
    await client?.close().catch(() => undefined);
    client = null;
    database = null;
    return null;
  }
}

async function ensureMongoIndexes(db: Db) {
  const competitions = db.collection<MongoCompetition>("competitions");
  const registrations = db.collection<MongoRegistration>("registrations");
  const submissions = db.collection<MongoSubmission>("submissions");
  await Promise.all([
    competitions.createIndex({ slug: 1 }, { unique: true }),
    registrations.createIndex({ competitionSlug: 1, participantKey: 1 }, { unique: true }),
    submissions.createIndex({ competitionSlug: 1, participantKey: 1 }, { unique: true }),
  ]);
}

function collections(db: Db) {
  return {
    competitions: db.collection<MongoCompetition>("competitions"),
    registrations: db.collection<MongoRegistration>("registrations"),
    submissions: db.collection<MongoSubmission>("submissions"),
  };
}

export async function getMongoCompetitionBySlug(slug: string) {
  const db = await getMongoDb();
  if (!db) return undefined;
  return collections(db).competitions.findOne({ slug });
}

export async function getMongoViewerState(slug: string, participantKey: string) {
  const db = await getMongoDb();
  if (!db) return undefined;
  const { registrations, submissions } = collections(db);
  const [registration, submission] = await Promise.all([
    registrations.findOne({ competitionSlug: slug, participantKey, status: "registered" }),
    submissions.findOne({ competitionSlug: slug, participantKey }),
  ]);
  return {
    isRegistered: Boolean(registration),
    hasSubmission: Boolean(submission),
    submissionName: submission?.fileName ?? null,
  };
}

/** Uses a transaction and $lt predicate to keep capacity correct under concurrency. */
export async function registerMongoParticipant(slug: string, participantKey: string) {
  const db = await getMongoDb();
  if (!db) return undefined;
  const { competitions, registrations } = collections(db);
  const session = client?.startSession();
  if (!session) return undefined;

  try {
    let result: { alreadyRegistered: boolean; full?: boolean } = { alreadyRegistered: false };
    await session.withTransaction(async () => {
      const existing = await registrations.findOne({ competitionSlug: slug, participantKey, status: "registered" }, { session });
      if (existing) {
        result = { alreadyRegistered: true };
        return;
      }

      const updated = await competitions.findOneAndUpdate(
        { slug, status: "open", $expr: { $lt: ["$booked", "$capacity"] } },
        { $inc: { booked: 1 } },
        { session, returnDocument: "after" },
      );
      if (!updated) {
        result = { alreadyRegistered: false, full: true };
        return;
      }

      await registrations.insertOne({ competitionSlug: slug, participantKey, status: "registered", createdAt: new Date() }, { session });
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function saveMongoSubmission(slug: string, participantKey: string, fileName: string) {
  const db = await getMongoDb();
  if (!db) return undefined;
  const submissions = collections(db).submissions;
  const now = new Date();
  await submissions.updateOne(
    { competitionSlug: slug, participantKey },
    { $set: { fileName, status: "uploaded", updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
  return { success: true, fileName };
}

export function mongoCollectionsForTests(db: Db): {
  competitions: Collection<MongoCompetition>;
  registrations: Collection<MongoRegistration>;
  submissions: Collection<MongoSubmission>;
} {
  return collections(db);
}
