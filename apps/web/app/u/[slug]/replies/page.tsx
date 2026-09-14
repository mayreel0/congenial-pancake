import { Suspense } from "react";
import { ServiceNav } from "../../../components/navigation/ServiceNav";
import { AuthCheckingSpinner } from "../../../components/shared/AuthCheckingSpinner";
import { RepliesListContent } from "./RepliesListContent";

// See app/me/page.tsx's identical comment for why ServiceNav sits outside
// the Suspense boundary and why the fallback reuses AuthCheckingSpinner
// instead of fallback={null}.
export default function RepliesListPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/u" />
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
            <AuthCheckingSpinner />
          </main>
        }
      >
        <RepliesListContent />
      </Suspense>
    </div>
  );
}
