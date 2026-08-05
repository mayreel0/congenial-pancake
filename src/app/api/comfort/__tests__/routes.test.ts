import { DisplayMode, QualityLabel, VisibilityState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createComfortReply } from "@/app/api/comfort/requests/[requestId]/replies/route";
import { POST as createComfortRequest } from "@/app/api/comfort/requests/route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createComfortRequest: vi.fn(),
  createComfortReply: vi.fn()
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/server/comfort", () => ({
  createComfortRequest: mocks.createComfortRequest,
  createComfortReply: mocks.createComfortReply,
  listRecentComfortExamples: vi.fn()
}));

const authenticatedSession = { user: { id: "user-1" } };
const createdAt = new Date("2026-08-05T01:00:00.000Z");

describe("comfort API POST routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a stable 401 response for unauthenticated request and reply posts", async () => {
    mocks.auth.mockResolvedValue(null);

    const requestResponse = await createComfortRequest(
      new Request("http://localhost/api/comfort/requests", { method: "POST", body: "{}" })
    );
    const replyResponse = await createComfortReply(
      new Request("http://localhost/api/comfort/requests/request-1/replies", { method: "POST", body: "{}" }),
      { params: Promise.resolve({ requestId: "request-1" }) }
    );

    expect(requestResponse.status).toBe(401);
    await expect(requestResponse.json()).resolves.toEqual({ error: "AUTH_REQUIRED" });
    expect(replyResponse.status).toBe(401);
    await expect(replyResponse.json()).resolves.toEqual({ error: "AUTH_REQUIRED" });
  });

  it("returns a stable 400 response for malformed request JSON", async () => {
    mocks.auth.mockResolvedValue(authenticatedSession);

    const response = await createComfortRequest(
      new Request("http://localhost/api/comfort/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{"
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "COMFORT_REQUEST_INPUT_INVALID" });
    expect(mocks.createComfortRequest).not.toHaveBeenCalled();
  });

  it("returns a stable 400 response for invalid reply input", async () => {
    mocks.auth.mockResolvedValue(authenticatedSession);

    const response = await createComfortReply(
      new Request("http://localhost/api/comfort/requests/request-1/replies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "", displayMode: "ANONYMOUS" })
      }),
      { params: Promise.resolve({ requestId: "request-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "COMFORT_REPLY_INPUT_INVALID" });
    expect(mocks.createComfortReply).not.toHaveBeenCalled();
  });

  it("returns only public fields after creating a comfort request", async () => {
    mocks.auth.mockResolvedValue(authenticatedSession);
    mocks.createComfortRequest.mockResolvedValue({
      id: "request-1",
      authorUserId: "user-1",
      body: "오늘 힘들었어요",
      displayMode: DisplayMode.ANONYMOUS,
      createdAt,
      updatedAt: createdAt,
      localDate: "2026-08-05",
      status: VisibilityState.VISIBLE,
      qualityScore: 0,
      qualityLabel: QualityLabel.ALLOWED
    });

    const response = await createComfortRequest(
      new Request("http://localhost/api/comfort/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "오늘 힘들었어요", displayMode: "ANONYMOUS" })
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      request: {
        id: "request-1",
        body: "오늘 힘들었어요",
        displayMode: "ANONYMOUS",
        createdAt: "2026-08-05T01:00:00.000Z"
      }
    });
  });

  it("returns only public fields after creating a comfort reply", async () => {
    mocks.auth.mockResolvedValue(authenticatedSession);
    mocks.createComfortReply.mockResolvedValue({
      id: "reply-1",
      requestId: "request-1",
      authorUserId: "user-1",
      body: "혼자 감당하지 않아도 돼요",
      displayMode: DisplayMode.NICKNAME,
      createdAt,
      updatedAt: createdAt,
      status: VisibilityState.VISIBLE,
      qualityScore: 0,
      qualityLabel: QualityLabel.ALLOWED
    });

    const response = await createComfortReply(
      new Request("http://localhost/api/comfort/requests/request-1/replies", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "혼자 감당하지 않아도 돼요", displayMode: "NICKNAME" })
      }),
      { params: Promise.resolve({ requestId: "request-1" }) }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      reply: {
        id: "reply-1",
        requestId: "request-1",
        body: "혼자 감당하지 않아도 돼요",
        displayMode: "NICKNAME",
        createdAt: "2026-08-05T01:00:00.000Z"
      }
    });
  });
});
