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

  it("enforces one request per author on each KST local date", () => {
    const comfortRequest = Prisma.dmmf.datamodel.models.find((model) => model.name === "ComfortRequest");
    const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
    const migration = readFileSync(
      resolve(process.cwd(), "prisma/migrations/20260805195000_comfort_request_reply_domain/migration.sql"),
      "utf8"
    );

    expect(schema).toMatch(/model ComfortRequest \{[\s\S]*?localDate\s+String/);
    expect(comfortRequest?.uniqueFields).toContainEqual(["authorUserId", "localDate"]);
    expect(migration).toContain('CREATE UNIQUE INDEX "ComfortRequest_authorUserId_localDate_key" ON "ComfortRequest"("authorUserId", "localDate")');
  });
});
