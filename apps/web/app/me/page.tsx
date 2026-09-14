import { Suspense } from "react";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { AuthCheckingSpinner } from "../components/shared/AuthCheckingSpinner";
import { MePageContent } from "./MePageContent";

// ServiceNav renders here, outside the Suspense boundary — MePageContent
// calls useSearchParams() (for the linked/merged notice), which requires
// a Suspense boundary somewhere above it, and Suspense's fallback replaces
// its ENTIRE subtree while pending. If ServiceNav were inside that subtree
// (as it originally was), a client-side navigation into this route would
// briefly blank out the header too, not just the content — confirmed via
// direct reproduction (2026-09-14). Keeping ServiceNav outside means it
// always renders immediately regardless of the suspense state below it.
// The fallback (this Suspense boundary's own pending gap, distinct from
// MePageContent's later "loading" status) reuses the same AuthCheckingSpinner
// shell rather than fallback={null}, so the content area never goes blank.
export default function MePage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/me" />
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
            <AuthCheckingSpinner />
          </main>
        }
      >
        <MePageContent />
      </Suspense>
    </div>
  );
}
