import { DisplayMode } from "@prisma/client";
import { z } from "zod";

const displayModeSchema = z.nativeEnum(DisplayMode);

export function parseComfortRequestInput(value: unknown) {
  return z
    .object({
      body: z.string().trim().min(1).max(3000),
      displayMode: displayModeSchema.default(DisplayMode.ANONYMOUS)
    })
    .parse(value);
}

export function parseComfortReplyInput(value: unknown) {
  return z
    .object({
      body: z.string().trim().min(1).max(1000),
      displayMode: displayModeSchema.default(DisplayMode.ANONYMOUS)
    })
    .parse(value);
}
