import { describe, expect, it } from "vitest";
import { getWorkerPreflightWarnings } from "@/server/worker-health";

describe("worker preflight warnings", () => {
  it("warns when Redis and provider credentials are missing", () => {
    expect(getWorkerPreflightWarnings({ AI_PROVIDER: "gemini" })).toEqual([
      "REDIS_URL is not set; defaulting to redis://localhost:6379.",
      "GEMINI_API_KEY or GOOGLE_API_KEY is not set; AI praise jobs will fail when provider calls run."
    ]);
  });

  it("checks OpenAI credentials when OpenAI provider is selected", () => {
    expect(
      getWorkerPreflightWarnings({
        AI_PROVIDER: "openai",
        REDIS_URL: "redis://localhost:6379"
      })
    ).toEqual(["OPENAI_API_KEY is not set; AI praise jobs will fail when provider calls run."]);
  });
});
