import { describe, expect, it } from "vitest";
import { AMBIENT_MOOD_CONFIG, ambientMoodOf } from "./ambient-mood";

describe("ambientMoodOf", () => {
  it("resolves each season correctly from a KST morning timestamp", () => {
    expect(ambientMoodOf(new Date("2026-04-10T01:00:00.000Z"))).toBe(
      "spring-morning",
    ); // 04-10 10:00 KST
    expect(ambientMoodOf(new Date("2026-07-10T01:00:00.000Z"))).toBe(
      "summer-morning",
    ); // 07-10 10:00 KST
    expect(ambientMoodOf(new Date("2026-10-10T01:00:00.000Z"))).toBe(
      "fall-morning",
    ); // 10-10 10:00 KST
    expect(ambientMoodOf(new Date("2026-01-10T01:00:00.000Z"))).toBe(
      "winter-morning",
    ); // 01-10 10:00 KST
  });

  it("switches to afternoon once KST hour reaches noon", () => {
    // 2026-04-10T02:59:00Z is 11:59 KST (still morning)
    expect(ambientMoodOf(new Date("2026-04-10T02:59:00.000Z"))).toBe(
      "spring-morning",
    );
    // 2026-04-10T03:00:00Z is 12:00 KST (afternoon starts)
    expect(ambientMoodOf(new Date("2026-04-10T03:00:00.000Z"))).toBe(
      "spring-afternoon",
    );
  });

  it("treats December as winter, not part of the prior fall/next spring", () => {
    expect(ambientMoodOf(new Date("2026-12-20T01:00:00.000Z"))).toBe(
      "winter-morning",
    );
  });

  it("rolls a UTC-side day/month boundary into the correct KST season", () => {
    // 2026-02-28T15:30:00Z is 2026-03-01 00:30 KST — spring already, even
    // though the UTC calendar date is still February.
    expect(ambientMoodOf(new Date("2026-02-28T15:30:00.000Z"))).toBe(
      "spring-morning",
    );
  });

  it("has a config entry for all 8 season × time-of-day combinations", () => {
    const keys = Object.keys(AMBIENT_MOOD_CONFIG);
    expect(keys).toHaveLength(8);
    for (const key of keys) {
      const config = AMBIENT_MOOD_CONFIG[key as keyof typeof AMBIENT_MOOD_CONFIG];
      expect(config.particleColors.length).toBeGreaterThan(0);
      expect(config.density).toBeGreaterThan(0);
      expect(config.speed).toBeGreaterThan(0);
    }
  });
});
