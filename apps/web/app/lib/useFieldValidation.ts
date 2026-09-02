"use client";

import { useState } from "react";
import type { FieldErrors } from "./zod-form";

// Tracks which fields have been "touched" — a submit attempt touches all
// of them at once via touchAll(). An untouched field never shows its
// error, even if invalid, so a fresh form doesn't open already covered in
// red. Once touched, a field's error is expected to be recomputed from the
// latest values on every render (via parseFieldErrors) and shown
// immediately, so fixing the problem clears the message right away
// instead of waiting for another submit. Deliberately submit-only, not
// per-field blur — see docs/decisions/2026-09-02-onseol-frontend-zod-
// validation-decisions.md.
export function useFieldValidation<Field extends string>() {
  const [touched, setTouched] = useState<Partial<Record<Field, true>>>({});

  function touchAll(fields: readonly Field[]): void {
    setTouched(
      Object.fromEntries(fields.map((field) => [field, true])) as Partial<
        Record<Field, true>
      >,
    );
  }

  function visibleError(
    field: Field,
    errors: FieldErrors<Field>,
  ): string | undefined {
    return touched[field] ? errors[field] : undefined;
  }

  return { touchAll, visibleError };
}
