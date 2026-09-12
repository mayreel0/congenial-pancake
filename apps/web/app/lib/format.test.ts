import { describe, expect, it } from "vitest";
import { formatRelativeTime, formatTimeRemaining } from "./format";

const NOW = new Date("2026-09-12T12:00:00.000Z");

describe("formatRelativeTime", () => {
  it("shows 방금 for anything under a minute old", () => {
    expect(formatRelativeTime("2026-09-12T11:59:30.000Z", NOW)).toBe("방금");
  });

  it("shows N분 전 for anything under an hour old", () => {
    expect(formatRelativeTime("2026-09-12T11:45:00.000Z", NOW)).toBe(
      "15분 전",
    );
  });

  it("shows N시간 전 for anything under a day old", () => {
    expect(formatRelativeTime("2026-09-12T09:00:00.000Z", NOW)).toBe(
      "3시간 전",
    );
  });

  it("shows N일 전 for anything a day or older", () => {
    expect(formatRelativeTime("2026-09-10T12:00:00.000Z", NOW)).toBe(
      "2일 전",
    );
  });
});

describe("formatTimeRemaining", () => {
  it("shows 곧 만료 for anything under a minute away", () => {
    expect(formatTimeRemaining("2026-09-12T12:00:30.000Z", NOW)).toBe(
      "곧 만료",
    );
  });

  it("shows 곧 만료 for a time already in the past", () => {
    expect(formatTimeRemaining("2026-09-12T11:00:00.000Z", NOW)).toBe(
      "곧 만료",
    );
  });

  it("shows N시간 후 만료 for anything under a day away", () => {
    expect(formatTimeRemaining("2026-09-12T15:00:00.000Z", NOW)).toBe(
      "3시간 후 만료",
    );
  });

  it("shows N일 후 만료 for anything a day or more away", () => {
    expect(formatTimeRemaining("2026-09-14T12:00:00.000Z", NOW)).toBe(
      "2일 후 만료",
    );
  });
});
