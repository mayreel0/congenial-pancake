import { Suspense } from "react";
import { RequestsListContent } from "./RequestsListContent";

export default function RequestsListPage() {
  return (
    <Suspense fallback={null}>
      <RequestsListContent />
    </Suspense>
  );
}
