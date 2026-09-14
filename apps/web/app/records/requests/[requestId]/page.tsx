import { Suspense } from "react";
import { ServiceNav } from "../../../components/navigation/ServiceNav";
import { AuthCheckingSpinner } from "../../../components/shared/AuthCheckingSpinner";
import { RequestDetailContent } from "./RequestDetailContent";

// Same server-component-wrapping-Suspense split as /records/page.tsx —
// RequestDetailContent uses useSearchParams() (?replyId=), and ServiceNav
// sits outside the boundary for the same header-blanking reason documented
// there.
export default function RequestDetailPage() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <ServiceNav activePath="/records" />
      <Suspense
        fallback={
          <main className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8">
            <AuthCheckingSpinner />
          </main>
        }
      >
        <RequestDetailContent />
      </Suspense>
    </div>
  );
}
