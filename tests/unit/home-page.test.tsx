// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const hasWrittenComfortRequestToday = vi.hoisted(() => vi.fn());
const listAnswerableComfortRequests = vi.hoisted(() => vi.fn());
const listRecentComfortExamples = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/server/comfort", () => ({
  hasWrittenComfortRequestToday,
  listAnswerableComfortRequests,
  listRecentComfortExamples
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
  beforeEach(() => {
    auth.mockReset();
    hasWrittenComfortRequestToday.mockReset();
    listAnswerableComfortRequests.mockReset();
    listRecentComfortExamples.mockReset();
    listRecentComfortExamples.mockResolvedValue([]);
    listAnswerableComfortRequests.mockResolvedValue([]);
    hasWrittenComfortRequestToday.mockResolvedValue(false);
  });

  it("renders the comfort MVP for anonymous users", async () => {
    auth.mockResolvedValue(null);

    render(await HomePage());

    expect(screen.getByRole("heading", { name: "위로" })).toBeInTheDocument();
    expect(listAnswerableComfortRequests).not.toHaveBeenCalled();
  });

  it("loads user-specific answerable requests for signed-in users", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });

    render(await HomePage());

    expect(hasWrittenComfortRequestToday).toHaveBeenCalledWith("user_1");
    expect(listAnswerableComfortRequests).toHaveBeenCalledWith("user_1");
  });
});
