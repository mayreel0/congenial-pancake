import { VisibilityState } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => vi.fn());
const comfortRequestFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const comfortRequestUpdate = vi.hoisted(() => vi.fn());
const comfortReplyFindUniqueOrThrow = vi.hoisted(() => vi.fn());
const comfortReplyUpdate = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({ auth }));
vi.mock("@/lib/db", () => ({
  db: {
    comfortRequest: { findUniqueOrThrow: comfortRequestFindUniqueOrThrow, update: comfortRequestUpdate },
    comfortReply: { findUniqueOrThrow: comfortReplyFindUniqueOrThrow, update: comfortReplyUpdate }
  }
}));
vi.mock("next/cache", () => ({ revalidatePath }));

import { hideMyComfortReply, hideMyComfortRequest } from "@/app/me/actions";

describe("my activity actions", () => {
  beforeEach(() => {
    auth.mockReset();
    comfortRequestFindUniqueOrThrow.mockReset();
    comfortRequestUpdate.mockReset();
    comfortReplyFindUniqueOrThrow.mockReset();
    comfortReplyUpdate.mockReset();
    revalidatePath.mockReset();
  });

  it("hides the current user's comfort request", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    comfortRequestFindUniqueOrThrow.mockResolvedValue({ id: "request_1", authorUserId: "user_1" });

    const formData = new FormData();
    formData.set("requestId", "request_1");

    await hideMyComfortRequest(formData);

    expect(comfortRequestUpdate).toHaveBeenCalledWith({
      where: { id: "request_1" },
      data: { status: VisibilityState.HIDDEN }
    });
    expect(revalidatePath).toHaveBeenCalledWith("/me");
    expect(revalidatePath).toHaveBeenCalledWith("/");
  });

  it("hides the current user's comfort reply", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });
    comfortReplyFindUniqueOrThrow.mockResolvedValue({ id: "reply_1", authorUserId: "user_1" });

    const formData = new FormData();
    formData.set("replyId", "reply_1");

    await hideMyComfortReply(formData);

    expect(comfortReplyUpdate).toHaveBeenCalledWith({
      where: { id: "reply_1" },
      data: { status: VisibilityState.HIDDEN }
    });
  });

  it("rejects unauthenticated request hiding", async () => {
    auth.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("requestId", "request_1");

    await expect(hideMyComfortRequest(formData)).rejects.toThrow("AUTH_REQUIRED");
    expect(comfortRequestUpdate).not.toHaveBeenCalled();
  });

  it("rejects missing reply ids", async () => {
    auth.mockResolvedValue({ user: { id: "user_1" } });

    await expect(hideMyComfortReply(new FormData())).rejects.toThrow("COMFORT_REPLY_ID_REQUIRED");
    expect(comfortReplyUpdate).not.toHaveBeenCalled();
  });
});
