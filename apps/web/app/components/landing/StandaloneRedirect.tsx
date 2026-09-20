"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { APP_ENTRY_PATH } from "../../lib/app-entry";
import { isStandaloneApp } from "../../lib/standalone-app";

// The landing page is web-only. New installs already start at
// APP_ENTRY_PATH (manifest.ts); this catches installs made under the old
// start_url of "/" (iOS keeps whatever it saw at install time) and the
// router.push("/") that logging out does.
export function StandaloneRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (isStandaloneApp()) router.replace(APP_ENTRY_PATH);
  }, [router]);

  return null;
}
