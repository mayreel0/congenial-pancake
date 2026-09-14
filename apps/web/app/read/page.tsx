import { Suspense } from "react";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { ReadFeed } from "./ReadFeed";

// ServiceNav renders here, outside the Suspense boundary — see MePage's
// identical comment (app/me/page.tsx) for why: useReadFeed()'s
// useSearchParams() needs a Suspense boundary above it, and Suspense's
// fallback replaces its entire subtree while pending, which used to blank
// out the header too when ServiceNav lived inside that subtree.
export default function ReadPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/read" />
      <Suspense fallback={null}>
        <ReadFeed />
      </Suspense>
    </div>
  );
}
