import { describe, expect, it } from "vitest";
import {
  addDaysToDateString,
  formatKoreanDate,
  yesterdayKstDateString,
} from "./kst-date";

describe("yesterdayKstDateString", () => {
  it("subtracts one day in KST, not UTC", () => {
    // 2026-08-31 00:30 KST is still 2026-08-30 15:30 UTC — a naive
    // UTC-based "yesterday" would wrongly say 2026-08-29.
    const justAfterKstMidnight = new Date("2026-08-30T15:30:00.000Z");
    expect(yesterdayKstDateString(justAfterKstMidnight)).toBe("2026-08-30");
  });

  it("rolls over a KST month boundary correctly", () => {
    const kstSep1Morning = new Date("2026-08-31T20:00:00.000Z"); // 2026-09-01 05:00 KST
    expect(yesterdayKstDateString(kstSep1Morning)).toBe("2026-08-31");
  });
});

describe("addDaysToDateString", () => {
  it("moves forward and backward across a month boundary", () => {
    expect(addDaysToDateString("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysToDateString("2026-09-01", -1)).toBe("2026-08-31");
  });
});

describe("formatKoreanDate", () => {
  it("renders as N년 N월 N일", () => {
    expect(formatKoreanDate("2026-08-05")).toBe("2026년 8월 5일");
  });
});
