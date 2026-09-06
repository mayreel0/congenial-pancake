import type { ZodType } from "zod";

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

// Runs `schema` against `values` and returns a map of field name -> its
// first Korean error message (only the first issue per field — this app
// shows one message per field, not a list). Empty object when valid.
export function parseFieldErrors<T extends Record<string, unknown>>(
  schema: ZodType<T>,
  values: T,
): FieldErrors<Extract<keyof T, string>> {
  const result = schema.safeParse(values);
  if (result.success) return {};

  const errors: FieldErrors<Extract<keyof T, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) {
      errors[key as Extract<keyof T, string>] = issue.message;
    }
  }
  return errors;
}
