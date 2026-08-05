import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("comfort Prisma schema", () => {
  it("exposes comfort domain models", () => {
    expect(Prisma.ModelName.ComfortRequest).toBe("ComfortRequest");
    expect(Prisma.ModelName.ComfortReply).toBe("ComfortReply");
    expect(Prisma.ModelName.ContentQualityReview).toBe("ContentQualityReview");
    expect(Prisma.ModelName.AiReplySuggestion).toBe("AiReplySuggestion");
  });

  it("keeps notification targets generic", () => {
    const fields = Prisma.dmmf.datamodel.models.find((model) => model.name === "Notification")?.fields.map((field) => field.name);
    expect(fields).toContain("targetType");
    expect(fields).toContain("targetId");
    expect(fields).not.toContain("postId");
  });

  it("caps reply bodies and prevents duplicate request authors", () => {
    const comfortReply = Prisma.dmmf.datamodel.models.find((model) => model.name === "ComfortReply");
    const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");

    expect(schema).toMatch(/model ComfortReply \{[\s\S]*?body\s+String\s+@db\.VarChar\(1000\)/);
    expect(comfortReply?.uniqueFields).toContainEqual(["requestId", "authorUserId"]);
  });
});
