"use client";

import { useState } from "react";
import { DEFAULT_PAGE_SIZE } from "../lib/pagination";

export type UseDateRangePageResult = {
  from: string | undefined;
  to: string | undefined;
  page: number;
  pageSize: number;
  setFrom(value: string | undefined): void;
  setTo(value: string | undefined): void;
  setPage(page: number): void;
  setPageSize(pageSize: number): void;
};

// Shared by MyRequestLogSection/MyAnswerLogSection — undefined from/to means
// unbounded (the full history), matching the backend default. Changing the
// range or the page size both reset to page 1, since whatever page N meant
// before is meaningless under the new range/size.
export function useDateRangePage(): UseDateRangePageResult {
  const [from, setFromState] = useState<string | undefined>(undefined);
  const [to, setToState] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);

  function setFrom(value: string | undefined) {
    setFromState(value);
    setPage(1);
  }

  function setTo(value: string | undefined) {
    setToState(value);
    setPage(1);
  }

  function setPageSize(size: number) {
    setPageSizeState(size);
    setPage(1);
  }

  return { from, to, page, pageSize, setFrom, setTo, setPage, setPageSize };
}
