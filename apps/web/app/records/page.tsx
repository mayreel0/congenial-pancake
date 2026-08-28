import { Suspense } from "react";
import { RecordsPageContent } from "./RecordsPageContent";

export default function RecordsPage() {
  return (
    <Suspense fallback={null}>
      <RecordsPageContent />
    </Suspense>
  );
}
