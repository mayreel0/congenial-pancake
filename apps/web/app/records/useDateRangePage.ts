"use client";

import { useState } from "react";
import {
  addDaysToDateString,
  monthAnchorOf,
  yesterdayKstDateString,
} from "../lib/kst-date";
import { parsePageParam, parsePageSizeParam } from "../lib/pagination";
import { useUrlState } from "../lib/useUrlState";

export type UseDateRangePageResult = {
  from: string | undefined;
  to: string | undefined;
  page: number;
  pageSize: number;
  // Independent — 시작일/종료일 are two separate HeatmapCalendarFields
  // (2026-09-02: a single combined range field wrapped to two lines and
  // couldn't adjust just one end without resetting both).
  setFrom(value: string | undefined): void;
  setTo(value: string | undefined): void;
  setPage(page: number): void;
  setPageSize(pageSize: number): void;
  // HeatmapCalendar's own month view — not URL-synced, resets to the
  // current KST month on every fresh page load.
  calendarMonth: string;
  setCalendarMonth(month: string): void;
};

type RangeUrlState = Record<string, string | undefined>;

// Shared by MyRequestLogSection/MyAnswerLogSection — undefined from/to
// means unbounded (the full history), matching the backend default.
// Changing the range or the page size both reset to page 1, since
// whatever page N meant before is meaningless under the new range/size.
//
// prefix ("req"/"rep") namespaces the URL params so /records' two tabs
// don't collide on the same query string (e.g. reqFrom vs repFrom) — each
// tab unmounts the other tab's section on switch anyway, but this still
// keeps a shared/bookmarked URL for either tab unambiguous.
export function useDateRangePage(prefix: "req" | "rep"): UseDateRangePageResult {
  const fromKey = `${prefix}From`;
  const toKey = `${prefix}To`;
  const pageKey = `${prefix}Page`;
  const pageSizeKey = `${prefix}PageSize`;
  const keys = [fromKey, toKey, pageKey, pageSizeKey];

  const [urlState, updateUrlState] = useUrlState<string>(
    "/records",
    keys,
    {
      [fromKey]: undefined,
      [toKey]: undefined,
      [pageKey]: undefined,
      [pageSizeKey]: undefined,
    } as RangeUrlState,
  );

  const from = urlState[fromKey];
  const to = urlState[toKey];
  const page = parsePageParam(urlState[pageKey]);
  const pageSize = parsePageSizeParam(urlState[pageSizeKey]);

  const [calendarMonth, setCalendarMonth] = useState(() =>
    monthAnchorOf(addDaysToDateString(yesterdayKstDateString(), 1)),
  );

  function setFrom(value: string | undefined): void {
    updateUrlState({ [fromKey]: value, [pageKey]: undefined });
  }

  function setTo(value: string | undefined): void {
    updateUrlState({ [toKey]: value, [pageKey]: undefined });
  }

  function setPage(nextPage: number): void {
    updateUrlState({ [pageKey]: String(nextPage) });
  }

  function setPageSize(size: number): void {
    updateUrlState({ [pageSizeKey]: String(size), [pageKey]: undefined });
  }

  return {
    from,
    to,
    page,
    pageSize,
    setFrom,
    setTo,
    setPage,
    setPageSize,
    calendarMonth,
    setCalendarMonth,
  };
}
