import { Suspense } from "react";
import { RepliesListContent } from "./RepliesListContent";

export default function RepliesListPage() {
  return (
    <Suspense fallback={null}>
      <RepliesListContent />
    </Suspense>
  );
}
