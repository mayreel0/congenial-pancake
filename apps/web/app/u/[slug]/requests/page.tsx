import { Suspense } from "react";
import { ServiceNav } from "../../../components/navigation/ServiceNav";
import { RequestsListContent } from "./RequestsListContent";

// ServiceNav renders here, outside the Suspense boundary — see MePage's
// identical comment (app/me/page.tsx) for why: useUrlState()'s
// useSearchParams() needs a Suspense boundary above it, and Suspense's
// fallback replaces its entire subtree while pending, which used to blank
// out the header too when ServiceNav lived inside that subtree.
export default function RequestsListPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/u" />
      <Suspense fallback={null}>
        <RequestsListContent />
      </Suspense>
    </div>
  );
}
