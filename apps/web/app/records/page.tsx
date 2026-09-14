import { Suspense } from "react";
import { ServiceNav } from "../components/navigation/ServiceNav";
import { RecordsPageContent } from "./RecordsPageContent";

// ServiceNav renders here, outside the Suspense boundary — see MePage's
// identical comment (app/me/page.tsx) for why: RecordsPageContent's
// useSearchParams() needs a Suspense boundary above it, and Suspense's
// fallback replaces its entire subtree while pending, which used to blank
// out the header too when ServiceNav lived inside that subtree.
export default function RecordsPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/records" />
      <Suspense fallback={null}>
        <RecordsPageContent />
      </Suspense>
    </div>
  );
}
