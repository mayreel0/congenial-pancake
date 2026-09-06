import { describe, expect, it } from "vitest";
import { parseProfileSlug } from "./slug";

describe("parseProfileSlug", () => {
  it("splits nickname and discriminator on the last -XXXX", () => {
    expect(parseProfileSlug("민들레-D59D")).toEqual({
      nickname: "민들레",
      discriminator: "D59D",
    });
  });

  // useParams() returns the raw, still-percent-encoded path segment (unlike
  // the server-side params prop) — this is the exact bug caught in real
  // browser verification: a non-ASCII nickname arrives percent-encoded, and
  // parseProfileSlug must decode it before matching or it gets encoded a
  // second time downstream and the API call 404s.
  it("decodes a percent-encoded slug before matching", () => {
    expect(parseProfileSlug("%EB%AF%BC%EB%93%A4%EB%A0%88-D59D")).toEqual({
      nickname: "민들레",
      discriminator: "D59D",
    });
  });

  it("uppercases the discriminator", () => {
    expect(parseProfileSlug("민들레-d59d")).toEqual({
      nickname: "민들레",
      discriminator: "D59D",
    });
  });

  it("keeps a hyphen that's part of the nickname itself", () => {
    expect(parseProfileSlug("해-바라기-D59D")).toEqual({
      nickname: "해-바라기",
      discriminator: "D59D",
    });
  });

  it("returns null when there's no trailing 4-hex-char discriminator", () => {
    expect(parseProfileSlug("민들레")).toBeNull();
    expect(parseProfileSlug("민들레-ZZZZ")).toBeNull();
    expect(parseProfileSlug("민들레-ABC")).toBeNull();
  });
});
