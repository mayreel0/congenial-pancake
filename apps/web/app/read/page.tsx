import { Suspense } from "react";
import { ReadFeed } from "./ReadFeed";

export default function ReadPage() {
  return (
    <Suspense fallback={null}>
      <ReadFeed />
    </Suspense>
  );
}
