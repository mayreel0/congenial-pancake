import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseFieldErrors } from "./zod-form";

const schema = z
  .object({
    body: z.string().min(1, "내용을 입력해주세요.").max(5, "5자 이하로."),
    email: z.string().email("올바른 이메일 형식이 아닙니다."),
  })
  .strict();

describe("parseFieldErrors", () => {
  it("returns an empty object when the values are valid", () => {
    expect(
      parseFieldErrors(schema, { body: "짧게", email: "a@b.com" }),
    ).toEqual({});
  });

  it("maps a single failing field to its error message", () => {
    expect(
      parseFieldErrors(schema, { body: "", email: "a@b.com" }),
    ).toEqual({ body: "내용을 입력해주세요." });
  });

  it("maps every failing field independently", () => {
    expect(
      parseFieldErrors(schema, { body: "너무너무너무 길다", email: "not-an-email" }),
    ).toEqual({
      body: "5자 이하로.",
      email: "올바른 이메일 형식이 아닙니다.",
    });
  });
});
