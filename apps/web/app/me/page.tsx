import { Suspense } from "react";
import { MePageContent } from "./MePageContent";

export default function MePage() {
  return (
    <Suspense fallback={null}>
      <MePageContent />
    </Suspense>
  );
}
