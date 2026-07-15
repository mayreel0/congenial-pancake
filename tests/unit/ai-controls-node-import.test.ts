import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    aiControlSetting: { upsert: vi.fn() },
    aiUsageEvent: { findMany: vi.fn(), create: vi.fn() }
  }
}));

describe("AI controls Node import", () => {
  it("can be imported by the standalone worker runtime", async () => {
    const module = await import("@/server/ai-controls");

    expect(module.getUtcDayRange(new Date("2026-07-15T12:00:00.000Z"))).toEqual({
      start: new Date("2026-07-15T00:00:00.000Z"),
      end: new Date("2026-07-16T00:00:00.000Z")
    });
  });
});
