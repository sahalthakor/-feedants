import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getCompetitionBySlug, getDb, getRegistration, getSubmission, registerParticipant, saveSubmission } from "./db";
import { getMongoCompetitionBySlug, getMongoDb, getMongoViewerState, registerMongoParticipant, saveMongoSubmission } from "./mongo";

const DEMO_SLUG = "feedants-classical-dance";

const demoCompetition = {
  id: 1,
  slug: DEMO_SLUG,
  title: "Feedants Classical Dance",
  category: "Dance",
  format: "Multi-Win",
  certificate: true,
  status: "open" as const,
  prizePool: 1500,
  entryFee: 99,
  capacity: 20,
  booked: 1,
  registrationDeadline: new Date("2026-10-10T18:20:00.000Z").getTime(),
  submissionStartsAt: new Date("2026-10-06T04:00:00.000Z").getTime(),
  submissionEndsAt: new Date("2026-10-30T18:25:00.000Z").getTime(),
  resultDate: new Date("2026-11-01T18:20:00.000Z").getTime(),
  judge: {
    name: "Manju Dubey",
    role: "Professional Kathak Dancer",
    experience: "12+ Years of Experience",
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=240&q=80",
  },
  about: "This is an online classical dance competition open for all age groups.\nParticipate from anywhere and showcase your talent.\nExpress your passion through traditional dance.",
  judgingParameters: "Technique, expression, rhythm, costume, and connection with the chosen classical form.",
  rules: "Submit one original performance video. Keep your submission within five minutes and follow the community guidelines.",
  winners: [
    { name: "Riya Shah", place: "1st Winner", image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&q=80" },
    { name: "Aarav Mehta", place: "1st Winner", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80" },
    { name: "Neha Verma", place: "2nd Winner", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80" },
    { name: "Ishita Chouhan", place: "3rd Winner", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&q=80" },
  ],
  rewards: [
    { label: "1st Winner", amount: 550, icon: "trophy" },
    { label: "2nd Winner", amount: 300, icon: "medal" },
    { label: "3rd Winner", amount: 240, icon: "medal" },
    { label: "4th Winner", amount: 200, icon: "star" },
    { label: "5th Winner", amount: 130, icon: "star" },
    { label: "6th Winner", amount: 80, icon: "star" },
  ],
};

type DemoCompetition = typeof demoCompetition;

// The in-memory store keeps the preview interactive. In production these operations
// map to unique indexes and an atomic capacity update in MongoDB/MySQL.
const registeredParticipants = new Set<string>();
const submittedParticipants = new Map<string, string>();
let demoBooked = demoCompetition.booked;

function key(slug: string, participantKey: string) {
  return `${slug}:${participantKey}`;
}

async function getAppDb() {
  const runningTests = process.env.NODE_ENV === "test" || process.env.VITEST === "true" || process.env.VITEST === "1" || process.env.FEEDANTS_TEST_MODE === "1";
  return runningTests ? null : getDb();
}

function timestamp(value: Date | number | string) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function parseArray<T>(value: string | undefined, fallback: T[]) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as T[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function loadCompetition(slug: string): Promise<DemoCompetition> {
  const mongoRow = await getMongoCompetitionBySlug(slug);
  const row = mongoRow ?? await getCompetitionBySlug(slug);
  if (!row) return { ...demoCompetition, booked: demoBooked };
  const winners = "winners" in row ? row.winners : parseArray((row as { winnersJson?: string }).winnersJson, demoCompetition.winners);
  const rewards = "rewards" in row ? row.rewards : parseArray((row as { rewardsJson?: string }).rewardsJson, demoCompetition.rewards);

  return {
    ...demoCompetition,
    ...row,
    booked: row.booked,
    registrationDeadline: timestamp(row.registrationDeadline),
    submissionStartsAt: timestamp(row.submissionStartsAt),
    submissionEndsAt: timestamp(row.submissionEndsAt),
    resultDate: timestamp(row.resultDate),
    judge: {
      name: row.judgeName,
      role: row.judgeRole,
      experience: row.judgeExperience,
      image: row.judgeImage,
    },
    about: row.about,
    judgingParameters: row.judgingParameters,
    rules: row.rules,
    winners,
    rewards,
  } as DemoCompetition;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  competition: router({
    getBySlug: publicProcedure
      .input(z.object({ slug: z.string().min(1), participantKey: z.string().min(8).max(120) }))
      .query(async ({ input }) => {
        const competition = await loadCompetition(input.slug);
        const participantId = key(input.slug, input.participantKey);
        const mongo = await getMongoDb();
        const mongoViewer = mongo ? await getMongoViewerState(input.slug, input.participantKey) : undefined;
        const db = mongo ? null : await getAppDb();
        const databaseRegistration = db ? await getRegistration(competition.id, input.participantKey) : undefined;
        const databaseSubmission = db ? await getSubmission(competition.id, input.participantKey) : undefined;
        return {
          competition: {
            ...competition,
            spotsLeft: Math.max(0, competition.capacity - competition.booked),
          },
          viewer: {
            isRegistered: mongo ? Boolean(mongoViewer?.isRegistered) : db ? Boolean(databaseRegistration) : registeredParticipants.has(participantId),
            hasSubmission: mongo ? Boolean(mongoViewer?.hasSubmission) : db ? Boolean(databaseSubmission) : submittedParticipants.has(participantId),
            submissionName: mongo ? mongoViewer?.submissionName ?? null : db ? databaseSubmission?.fileName ?? null : submittedParticipants.get(participantId) ?? null,
          },
        };
      }),
    register: publicProcedure
      .input(z.object({ slug: z.string().min(1), participantKey: z.string().min(8).max(120) }))
      .mutation(async ({ input }) => {
        const competition = await loadCompetition(input.slug);
        const participantId = key(input.slug, input.participantKey);
        if (competition.status !== "open") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Registration is not open for this competition." });
        }
        const mongo = await getMongoDb();
        if (mongo) {
          const result = await registerMongoParticipant(input.slug, input.participantKey);
          if (result?.full) throw new TRPCError({ code: "CONFLICT", message: "This competition is fully booked." });
          return { success: true, alreadyRegistered: Boolean(result?.alreadyRegistered) };
        }
        const db = await getAppDb();
        if (db) {
          const result = await registerParticipant(competition.id, input.participantKey);
          if (result?.full) throw new TRPCError({ code: "CONFLICT", message: "This competition is fully booked." });
          return { success: true, alreadyRegistered: Boolean(result?.alreadyRegistered) };
        }
        if (registeredParticipants.has(participantId)) return { success: true, alreadyRegistered: true };
        if (demoBooked >= competition.capacity) throw new TRPCError({ code: "CONFLICT", message: "This competition is fully booked." });
        // Capacity is checked immediately before incrementing to keep the preview race-safe.
        demoBooked += 1;
        registeredParticipants.add(participantId);
        return { success: true, alreadyRegistered: false };
      }),
    submit: publicProcedure
      .input(z.object({ slug: z.string().min(1), participantKey: z.string().min(8).max(120), fileName: z.string().min(1).max(255) }))
      .mutation(async ({ input }) => {
        const competition = await loadCompetition(input.slug);
        const participantId = key(input.slug, input.participantKey);
        const mongo = await getMongoDb();
        const mongoViewer = mongo ? await getMongoViewerState(input.slug, input.participantKey) : undefined;
        const db = mongo ? null : await getAppDb();
        const registered = mongo ? Boolean(mongoViewer?.isRegistered) : db ? Boolean(await getRegistration(competition.id, input.participantKey)) : registeredParticipants.has(participantId);
        if (!registered) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Register before uploading a submission." });
        }
        if (Date.now() < competition.submissionStartsAt) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Submissions open on 06 October 2026." });
        }
        if (Date.now() > competition.submissionEndsAt) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message: "The submission window has closed." });
        }
        if (mongo) {
          const result = await saveMongoSubmission(input.slug, input.participantKey, input.fileName);
          return result ?? { success: true, fileName: input.fileName };
        }
        if (db) {
          const result = await saveSubmission(competition.id, input.participantKey, input.fileName);
          return result ?? { success: true, fileName: input.fileName };
        }
        submittedParticipants.set(participantId, input.fileName);
        return { success: true, fileName: input.fileName };
      }),
  }),
});

export type AppRouter = typeof appRouter;
