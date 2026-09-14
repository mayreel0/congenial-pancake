"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Every route change remounts this wrapper (keyed on pathname), replaying
// onseol-fade-in so the incoming page paints in smoothly instead of
// snapping in instantly. Separate from the in-page onseol-fade-in usages on
// individual pages (auth status flips, skeleton→content swaps) — those
// don't involve a route change at all, so this wrapper's pathname key
// never fires for them and they need their own remount trigger.
export function PageFadeIn({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="onseol-fade-in" key={pathname}>
      {children}
    </div>
  );
}
