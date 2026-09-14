import { Suspense } from "react";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { MePageContent } from "./MePageContent";

// ServiceNav renders here, outside the Suspense boundary — MePageContent
// calls useSearchParams() (for the linked/merged notice), which requires
// a Suspense boundary somewhere above it, and Suspense's fallback replaces
// its ENTIRE subtree while pending. If ServiceNav were inside that subtree
// (as it originally was), a client-side navigation into this route would
// briefly blank out the header too, not just the content — confirmed via
// direct reproduction (2026-09-14). Keeping ServiceNav outside means it
// always renders immediately regardless of the suspense state below it.
export default function MePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/me" />
      <Suspense fallback={null}>
        <MePageContent />
      </Suspense>
    </div>
  );
}
