"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type UrlParamState<Keys extends string> = Record<Keys, string | undefined>;

// Seeds local state from the URL once, so the page's state is
// shareable/bookmarkable/refresh-safe — but rendering drives off that
// local state afterward, same as RecordsPageContent's existing ?tab=
// convention. Updates push the *entire* current param set to the URL via
// router.replace as a side effect, not as the render's source of truth:
// deriving straight from useSearchParams() would depend on the router
// actually round-tripping back into it, which doesn't happen with the
// no-op useRouter() mock the test setup uses.
//
// A single combined replace() per update (instead of one per changed key)
// matters when a caller changes two keys together, e.g. picking a new
// date range resetting the page back to 1 — two separate replace() calls
// would each read the same stale searchParams snapshot and the second
// would silently overwrite the first's change in the URL.
//
// pathname is passed in as a literal (e.g. "/read") rather than read via
// usePathname(), matching how RecordsPageContent hardcodes
// `/records?tab=...` — the test setup's usePathname() mock always
// returns "/", so relying on it here would build the wrong URL in tests.
export function useUrlState<Keys extends string>(
  pathname: string,
  keys: readonly Keys[],
  defaults: UrlParamState<Keys>,
): [UrlParamState<Keys>, (patch: Partial<UrlParamState<Keys>>) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [state, setState] = useState<UrlParamState<Keys>>(() => {
    const initial = { ...defaults };
    for (const key of keys) {
      const param = searchParams.get(key);
      if (param !== null) initial[key] = param;
    }
    return initial;
  });

  function update(patch: Partial<UrlParamState<Keys>>): void {
    const next = { ...state, ...patch };
    setState(next);

    const params = new URLSearchParams(searchParams.toString());
    for (const key of keys) {
      const value = next[key];
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  return [state, update];
}
