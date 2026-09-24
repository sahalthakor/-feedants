import { beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("competition module", () => {
  beforeAll(() => {
    process.env.FEEDANTS_TEST_MODE = "1";
  });

  it("returns dynamic competition details and viewer state", async () => {
    const caller = appRouter.createCaller(createContext());
    const result = await caller.competition.getBySlug({
      slug: "feedants-classical-dance",
      participantKey: "test-viewer-details",
    });

    expect(result.competition.title).toBe("Feedants Classical Dance");
    expect(result.competition.spotsLeft).toBeGreaterThanOrEqual(0);
    expect(result.competition.winners).toHaveLength(4);
    expect(result.competition.winners[0]?.name).toBe("Riya Shah");
    expect(result.competition.rewards).toHaveLength(6);
    expect(result.viewer.isRegistered).toBe(false);
  });

  it("registers a participant once and keeps the operation idempotent", async () => {
    const caller = appRouter.createCaller(createContext());
    const input = { slug: "feedants-classical-dance", participantKey: "test-idempotent-user" };

    const first = await caller.competition.register(input);
    const second = await caller.competition.register(input);
    const result = await caller.competition.getBySlug(input);

    expect(first.success).toBe(true);
    expect(first.alreadyRegistered).toBe(false);
    expect(second.alreadyRegistered).toBe(true);
    expect(result.viewer.isRegistered).toBe(true);
  });

  it("rejects a submission from a participant who is not registered", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.competition.submit({
      slug: "feedants-classical-dance",
      participantKey: "test-unregistered-user",
      fileName: "dance-performance.mp4",
    })).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
  });
});
