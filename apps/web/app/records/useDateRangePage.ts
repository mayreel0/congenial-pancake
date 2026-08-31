"use client";

import { useState } from "react";

export type UseDateRangePageResult = {
  from: string | undefined;
  to: string | undefined;
  page: number;
  setFrom(value: string | undefined): void;
  setTo(value: string | undefined): void;
  setPage(page: number): void;
};

// Shared by MyRequestLogSection/MyAnswerLogSection — undefined from/to means
// unbounded (the full history), matching the backend default. Changing
// either bound resets to page 1, since whatever page N meant under the old
// range is meaningless under a new one.
export function useDateRangePage(): UseDateRangePageResult {
  const [from, setFromState] = useState<string | undefined>(undefined);
  const [to, setToState] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  function setFrom(value: string | undefined) {
    setFromState(value);
    setPage(1);
  }

  function setTo(value: string | undefined) {
    setToState(value);
    setPage(1);
  }

  return { from, to, page, setFrom, setTo, setPage };
}
