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
  // Both bounds set together (HeatmapCalendar's click-twice range select) —
  // a single update() call so the two keys land in the URL atomically, same
  // reasoning as useUrlState's own "one combined replace()" doc comment.
  setRange(from: string | undefined, to: string | undefined): void;
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

  function setRange(
    nextFrom: string | undefined,
    nextTo: string | undefined,
  ): void {
    updateUrlState({ [fromKey]: nextFrom, [toKey]: nextTo, [pageKey]: undefined });
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
    setRange,
    setPage,
    setPageSize,
    calendarMonth,
    setCalendarMonth,
  };
}
